import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  Notification, 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus 
} from '../entities/notification.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface CreateNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  data?: any;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface NotificationFilter {
  recipientId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private eventEmitter: EventEmitter2
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...dto,
      priority: dto.priority || NotificationPriority.MEDIUM,
      status: NotificationStatus.PENDING,
      metadata: {}
    });

    const saved = await this.notificationRepository.save(notification);

    // Emit event for other modules to handle (e.g. WebSocket gateway)
    this.eventEmitter.emit('notification.created', saved);

    return saved;
  }

  async createBulk(dtos: CreateNotificationDto[]): Promise<Notification[]> {
    const notifications = dtos.map(dto => 
      this.notificationRepository.create({
        ...dto,
        priority: dto.priority || NotificationPriority.MEDIUM,
        status: NotificationStatus.PENDING,
        metadata: {}
      })
    );

    const savedNotifications = await this.notificationRepository.save(notifications);

    savedNotifications.forEach(notification => {
      this.eventEmitter.emit('notification.created', notification);
    });

    return savedNotifications;
  }

  async findByFilter(filter: NotificationFilter): Promise<{ data: Notification[]; total: number }> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    if (filter.recipientId) {
      queryBuilder.andWhere('notification.recipientId = :recipientId', { 
        recipientId: filter.recipientId 
      });
    }

    if (filter.type) {
      queryBuilder.andWhere('notification.type = :type', { type: filter.type });
    }

    if (filter.channel) {
      queryBuilder.andWhere('notification.channel = :channel', { channel: filter.channel });
    }

    if (filter.status) {
      queryBuilder.andWhere('notification.status = :status', { status: filter.status });
    }

    if (filter.priority) {
      queryBuilder.andWhere('notification.priority = :priority', { priority: filter.priority });
    }

    if (filter.unreadOnly) {
      queryBuilder.andWhere('notification.status != :readStatus', { 
        readStatus: NotificationStatus.READ 
      });
    }

    // Исключаем истекшие уведомления
    queryBuilder.andWhere(
      '(notification.expiresAt IS NULL OR notification.expiresAt > :now)',
      { now: new Date() }
    );

    queryBuilder.orderBy('notification.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    if (filter.limit) {
      queryBuilder.limit(filter.limit);
    }

    if (filter.offset) {
      queryBuilder.offset(filter.offset);
    }

    const data = await queryBuilder.getMany();

    return { data, total };
  }

  async findById(id: number): Promise<Notification | null> {
    return this.notificationRepository.findOne({ where: { id } });
  }

  async markAsRead(id: number, recipientId: string): Promise<boolean> {
    const notification = await this.notificationRepository.findOne({
      where: { id, recipientId }
    });

    if (!notification) {
      return false;
    }

    notification.markAsRead();
    await this.notificationRepository.save(notification);
    return true;
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ 
        status: NotificationStatus.READ,
        readAt: new Date()
      })
      .where('recipientId = :recipientId', { recipientId })
      .andWhere('status != :readStatus', { readStatus: NotificationStatus.READ })
      .execute();

    return result.affected || 0;
  }

  async deleteById(id: number, recipientId: string): Promise<boolean> {
    const result = await this.notificationRepository.delete({
      id,
      recipientId
    });

    return (result.affected || 0) > 0;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    // Count notifications that are not read
    return this.notificationRepository.count({
      where: {
        recipientId,
        status: NotificationStatus.READ
      }
    }).then(totalRead => {
      // Fallback: if repository.count with condition is not supported for 'not',
      // compute by counting all and subtracting read ones. Safer for different DBs.
      return this.notificationRepository.count({ where: { recipientId } }).then(all => all - (totalRead || 0));
    });
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: {
        status: NotificationStatus.PENDING,
        scheduledAt: null // Неотложенные уведомления
      },
      order: {
        priority: 'DESC',
        createdAt: 'ASC'
      }
    });
  }

  async getScheduledNotifications(): Promise<Notification[]> {
    return this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.status = :status', { status: NotificationStatus.PENDING })
      .andWhere('notification.scheduledAt IS NOT NULL')
      .andWhere('notification.scheduledAt <= :now', { now: new Date() })
      .orderBy('notification.scheduledAt', 'ASC')
      .getMany();
  }

  async markAsSent(id: number, metadata?: any): Promise<void> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    
    if (notification) {
      notification.markAsSent();
      if (metadata) {
        notification.metadata = { ...notification.metadata, ...metadata };
      }
      await this.notificationRepository.save(notification);
    }
  }

  async markAsDelivered(id: number, metadata?: any): Promise<void> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    
    if (notification) {
      notification.markAsDelivered();
      if (metadata) {
        notification.metadata = { ...notification.metadata, ...metadata };
      }
      await this.notificationRepository.save(notification);
    }
  }

  async markAsFailed(id: number, reason: string, metadata?: any): Promise<void> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    
    if (notification) {
      notification.markAsFailed(reason);
      if (metadata) {
        notification.metadata = { ...notification.metadata, ...metadata };
      }
      await this.notificationRepository.save(notification);
    }
  }

  async getFailedNotificationsForRetry(): Promise<Notification[]> {
    return this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.status = :status', { status: NotificationStatus.FAILED })
      .andWhere('JSON_EXTRACT(notification.metadata, "$.retryCount") < :maxRetries', { maxRetries: 3 })
      .getMany();
  }

  // Удобные методы для создания типовых уведомлений
  async createLeadNotification(
    type: NotificationType,
    title: string,
    message: string,
    leadData: any,
    recipientId: string,
    channels: NotificationChannel[] = [NotificationChannel.IN_APP],
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<Notification[]> {
    const notifications = channels.map(channel => ({
      type,
      title,
      message,
      channel,
      priority,
      recipientId,
      data: {
        entityType: 'lead' as const,
        actionUrl: `/leads/${leadData.leadId}`,
        ...leadData
      }
    }));

    return this.createBulk(notifications);
  }

  async createDealNotification(
    type: NotificationType,
    title: string,
    message: string,
    dealData: any,
    recipientId: string,
    channels: NotificationChannel[] = [NotificationChannel.IN_APP],
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<Notification[]> {
    const notifications = channels.map(channel => ({
      type,
      title,
      message,
      channel,
      priority,
      recipientId,
      data: {
        entityType: 'deal' as const,
        actionUrl: `/deals/${dealData.dealId}`,
        ...dealData
      }
    }));

    return this.createBulk(notifications);
  }

  async createTaskNotification(
    type: NotificationType,
    title: string,
    message: string,
    taskData: any,
    recipientId: string,
    channels: NotificationChannel[] = [NotificationChannel.IN_APP],
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<Notification[]> {
    const notifications = channels.map(channel => ({
      type,
      title,
      message,
      channel,
      priority,
      recipientId,
      data: {
        entityType: 'task' as const,
        actionUrl: `/tasks/${taskData.taskId}`,
        ...taskData
      }
    }));

    return this.createBulk(notifications);
  }

  async createSystemNotification(
    type: NotificationType,
    title: string,
    message: string,
    recipientId: string,
    data?: any,
    priority: NotificationPriority = NotificationPriority.LOW
  ): Promise<Notification> {
    return this.create({
      type,
      title,
      message,
      channel: NotificationChannel.IN_APP,
      priority,
      recipientId,
      data: {
        entityType: 'system',
        ...data
      }
    });
  }
}