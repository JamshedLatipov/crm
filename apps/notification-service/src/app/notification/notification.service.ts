import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Notification,
  NotificationStatus,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';
import {
  SendNotificationDto,
  SendBulkNotificationDto,
  NotificationFilterDto,
  MarkReadDto,
  NotificationResponseDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
} from '@crm/contracts';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async send(dto: SendNotificationDto): Promise<NotificationResponseDto> {
    const notification = this.notificationRepository.create({
      type: dto.type as NotificationType,
      title: dto.title,
      message: dto.message,
      channel: dto.channel as NotificationChannel,
      priority: (dto.priority as NotificationPriority) || NotificationPriority.MEDIUM,
      recipientId: dto.recipientId,
      recipientEmail: dto.recipientEmail,
      recipientPhone: dto.recipientPhone,
      data: dto.data,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      metadata: dto.metadata,
      status: NotificationStatus.PENDING,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Process based on channel
    await this.processNotification(savedNotification);

    return this.toResponseDto(savedNotification);
  }

  async sendBulk(dto: SendBulkNotificationDto): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipientId of dto.recipientIds) {
      try {
        await this.send({
          type: dto.type,
          title: dto.title,
          message: dto.message,
          channel: dto.channel,
          priority: dto.priority,
          recipientId,
          data: dto.data,
        });
        sent++;
      } catch (err) {
        const error = err as Error;
        this.logger.error(`Failed to send notification to ${recipientId}: ${error.message}`);
        failed++;
      }
    }

    return { sent, failed };
  }

  async findAll(filter: NotificationFilterDto): Promise<NotificationListResponseDto> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    if (filter.recipientId) {
      queryBuilder.andWhere('notification.recipientId = :recipientId', { recipientId: filter.recipientId });
    }

    if (filter.type) {
      queryBuilder.andWhere('notification.type = :type', { type: filter.type });
    }

    if (filter.status) {
      queryBuilder.andWhere('notification.status = :status', { status: filter.status });
    }

    if (filter.channel) {
      queryBuilder.andWhere('notification.channel = :channel', { channel: filter.channel });
    }

    if (filter.fromDate) {
      queryBuilder.andWhere('notification.createdAt >= :fromDate', { fromDate: new Date(filter.fromDate) });
    }

    if (filter.toDate) {
      queryBuilder.andWhere('notification.createdAt <= :toDate', { toDate: new Date(filter.toDate) });
    }

    queryBuilder.orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    // Get unread count for recipientId
    let unreadCount = 0;
    if (filter.recipientId) {
      unreadCount = await this.notificationRepository.count({
        where: {
          recipientId: filter.recipientId,
          status: In([NotificationStatus.PENDING, NotificationStatus.SENT, NotificationStatus.DELIVERED]),
        },
      });
    }

    return {
      items: items.map(n => this.toResponseDto(n)),
      total,
      page,
      limit,
      unreadCount,
    };
  }

  async markRead(dto: MarkReadDto): Promise<void> {
    await this.notificationRepository.update(
      { id: In(dto.notificationIds) },
      { status: NotificationStatus.READ, readAt: new Date() }
    );
  }

  async markAllRead(recipientId: string): Promise<void> {
    await this.notificationRepository.update(
      {
        recipientId,
        status: In([NotificationStatus.PENDING, NotificationStatus.SENT, NotificationStatus.DELIVERED]),
      },
      { status: NotificationStatus.READ, readAt: new Date() }
    );
  }

  async getUnreadCount(recipientId: string): Promise<UnreadCountResponseDto> {
    const notifications = await this.notificationRepository.find({
      where: {
        recipientId,
        status: In([NotificationStatus.PENDING, NotificationStatus.SENT, NotificationStatus.DELIVERED]),
      },
    });

    const byType: Record<string, number> = {};
    for (const n of notifications) {
      byType[n.type] = (byType[n.type] || 0) + 1;
    }

    return {
      count: notifications.length,
      byType,
    };
  }

  async findOne(id: number): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return this.toResponseDto(notification);
  }

  async remove(id: number): Promise<void> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    await this.notificationRepository.remove(notification);
  }

  // Methods to match monolith endpoints
  async getPending(): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepository.find({
      where: { status: NotificationStatus.PENDING },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return notifications.map(n => this.toResponseDto(n));
  }

  async getScheduled(): Promise<NotificationResponseDto[]> {
    const now = new Date();
    const notifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.scheduledAt > :now', { now })
      .andWhere('notification.status = :status', { status: NotificationStatus.PENDING })
      .orderBy('notification.scheduledAt', 'ASC')
      .take(100)
      .getMany();
    return notifications.map(n => this.toResponseDto(n));
  }

  async getFailed(): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepository.find({
      where: { status: NotificationStatus.FAILED },
      order: { failedAt: 'DESC' },
      take: 100,
    });
    return notifications.map(n => this.toResponseDto(n));
  }

  async sendLeadNotification(data: {
    type: string;
    title: string;
    message: string;
    leadData: any;
    recipientId: string;
    channels?: string[];
    priority?: string;
  }): Promise<NotificationResponseDto> {
    return this.send({
      type: data.type as any,
      title: data.title,
      message: data.message,
      channel: (data.channels?.[0] || 'in_app') as any,
      priority: (data.priority || 'medium') as any,
      recipientId: data.recipientId,
      data: { lead: data.leadData },
    });
  }

  async sendDealNotification(data: {
    type: string;
    title: string;
    message: string;
    dealData: any;
    recipientId: string;
    channels?: string[];
    priority?: string;
  }): Promise<NotificationResponseDto> {
    return this.send({
      type: data.type as any,
      title: data.title,
      message: data.message,
      channel: (data.channels?.[0] || 'in_app') as any,
      priority: (data.priority || 'medium') as any,
      recipientId: data.recipientId,
      data: { deal: data.dealData },
    });
  }

  async sendSystemNotification(data: {
    type: string;
    title: string;
    message: string;
    recipientId: string;
    channels?: string[];
    priority?: string;
  }): Promise<NotificationResponseDto> {
    return this.send({
      type: (data.type || 'system') as any,
      title: data.title,
      message: data.message,
      channel: (data.channels?.[0] || 'in_app') as any,
      priority: (data.priority || 'medium') as any,
      recipientId: data.recipientId,
      data: { systemNotification: true },
    });
  }

  async markSent(id: number): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    notification.status = NotificationStatus.SENT;
    notification.sentAt = new Date();
    const saved = await this.notificationRepository.save(notification);
    return this.toResponseDto(saved);
  }

  async deleteAll(recipientId: string): Promise<{ deleted: number }> {
    const result = await this.notificationRepository.delete({ recipientId });
    return { deleted: result.affected || 0 };
  }

  async markDelivered(id: number, metadata?: any): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    notification.status = NotificationStatus.DELIVERED;
    notification.deliveredAt = new Date();
    if (metadata) {
      notification.metadata = { ...notification.metadata, ...metadata };
    }
    const saved = await this.notificationRepository.save(notification);
    return this.toResponseDto(saved);
  }

  async markFailed(id: number, reason: string, metadata?: any): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    notification.status = NotificationStatus.FAILED;
    notification.failedAt = new Date();
    notification.failureReason = reason;
    if (metadata) {
      notification.metadata = { ...notification.metadata, ...metadata };
    }
    const saved = await this.notificationRepository.save(notification);
    return this.toResponseDto(saved);
  }

  async deleteExpired(): Promise<{ deletedCount: number }> {
    // Delete notifications older than 30 days that are read or failed
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('createdAt < :date', { date: thirtyDaysAgo })
      .andWhere('status IN (:...statuses)', { 
        statuses: [NotificationStatus.READ, NotificationStatus.FAILED] 
      })
      .execute();

    return { deletedCount: result.affected || 0 };
  }

  private async processNotification(notification: Notification): Promise<void> {
    try {
      switch (notification.channel) {
        case NotificationChannel.IN_APP:
        case NotificationChannel.WEBSOCKET:
          await this.sendWebsocket(notification);
          break;
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSms(notification);
          break;
        case NotificationChannel.PUSH:
          await this.sendPush(notification);
          break;
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to process notification ${notification.id}: ${error.message}`);
      notification.status = NotificationStatus.FAILED;
      notification.failedAt = new Date();
      notification.failureReason = error.message;
      await this.notificationRepository.save(notification);
    }
  }

  private async sendWebsocket(notification: Notification): Promise<void> {
    this.websocketGateway.sendToUser(notification.recipientId, 'notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      data: notification.data,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  private async sendEmail(notification: Notification): Promise<void> {
    // TODO: Implement email sending via external service (SendGrid, SES, etc.)
    this.logger.log(`Email notification ${notification.id} queued for ${notification.recipientEmail}`);
  }

  private async sendSms(notification: Notification): Promise<void> {
    // TODO: Implement SMS sending via external service (Twilio, etc.)
    this.logger.log(`SMS notification ${notification.id} queued for ${notification.recipientPhone}`);
  }

  private async sendPush(notification: Notification): Promise<void> {
    // TODO: Implement push notification via Firebase, APNs, etc.
    this.logger.log(`Push notification ${notification.id} queued for ${notification.recipientId}`);
  }

  private toResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type as any,
      title: notification.title,
      message: notification.message,
      channel: notification.channel as any,
      priority: notification.priority as any,
      status: notification.status as any,
      recipientId: notification.recipientId,
      recipientEmail: notification.recipientEmail,
      recipientPhone: notification.recipientPhone,
      data: notification.data,
      scheduledAt: notification.scheduledAt?.toISOString(),
      sentAt: notification.sentAt?.toISOString(),
      deliveredAt: notification.deliveredAt?.toISOString(),
      readAt: notification.readAt?.toISOString(),
      failedAt: notification.failedAt?.toISOString(),
      failureReason: notification.failureReason,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }
}
