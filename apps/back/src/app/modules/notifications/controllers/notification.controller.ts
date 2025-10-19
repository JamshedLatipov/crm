import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Param, 
  Query, 
  Body, 
  ParseIntPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { 
  NotificationService, 
  NotificationFilter, 
  CreateNotificationDto 
} from '../../shared/services/notification.service';
import { 
  Notification, 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus, 
  NotificationType 
} from '../../shared/entities/notification.entity';

export class GetNotificationsDto {
  recipientId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export class MarkAsReadDto {
  recipientId: string;
}

export class CreateBulkNotificationDto {
  notifications: CreateNotificationDto[];
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Query() filter: GetNotificationsDto) {
    // Query params come as strings from HTTP requests. Cast to any and coerce
    // common types here so the service receives booleans/numbers as expected.
    const f: any = filter as any;

    const parsed: any = {
      ...f,
      unreadOnly: f.unreadOnly === true || f.unreadOnly === 'true',
      limit: f.limit != null ? Number(f.limit) : undefined,
      offset: f.offset != null ? Number(f.offset) : undefined,
    };

    return this.notificationService.findByFilter(parsed);
  }

  @Get('unread-count')
  async getUnreadCount(@Query('recipientId') recipientId: string) {
    const count = await this.notificationService.getUnreadCount(recipientId);
    return { count };
  }

  @Get('pending')
  async getPendingNotifications() {
    return this.notificationService.getPendingNotifications();
  }

  @Get('scheduled')
  async getScheduledNotifications() {
    return this.notificationService.getScheduledNotifications();
  }

  @Get('failed')
  async getFailedNotifications() {
    return this.notificationService.getFailedNotificationsForRetry();
  }

  @Get(':id')
  async getNotification(@Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationService.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  @Post()
  async createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  @Post('bulk')
  async createBulkNotifications(@Body() dto: CreateBulkNotificationDto) {
    return this.notificationService.createBulk(dto.notifications);
  }

  @Post('lead')
  async createLeadNotification(
    @Body() body: {
      type: NotificationType;
      title: string;
      message: string;
      leadData: any;
      recipientId: string;
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
    }
  ) {
    const { type, title, message, leadData, recipientId, channels, priority } = body;
    return this.notificationService.createLeadNotification(
      type,
      title,
      message,
      leadData,
      recipientId,
      channels,
      priority
    );
  }

  @Post('deal')
  async createDealNotification(
    @Body() body: {
      type: NotificationType;
      title: string;
      message: string;
      dealData: any;
      recipientId: string;
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
    }
  ) {
    const { type, title, message, dealData, recipientId, channels, priority } = body;
    return this.notificationService.createDealNotification(
      type,
      title,
      message,
      dealData,
      recipientId,
      channels,
      priority
    );
  }

  @Post('system')
  async createSystemNotification(
    @Body() body: {
      type: NotificationType;
      title: string;
      message: string;
      recipientId: string;
      data?: any;
      priority?: NotificationPriority;
    }
  ) {
    const { type, title, message, recipientId, data, priority } = body;
    return this.notificationService.createSystemNotification(
      type,
      title,
      message,
      recipientId,
      data,
      priority
    );
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkAsReadDto
  ) {
    const success = await this.notificationService.markAsRead(id, dto.recipientId);
    if (!success) {
      throw new Error('Notification not found or access denied');
    }
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Body() dto: MarkAsReadDto) {
    const count = await this.notificationService.markAllAsRead(dto.recipientId);
    return { markedCount: count };
  }

  @Patch(':id/sent')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsSent(
    @Param('id', ParseIntPipe) id: number,
    @Body() metadata?: any
  ) {
    await this.notificationService.markAsSent(id, metadata);
  }

  @Patch(':id/delivered')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsDelivered(
    @Param('id', ParseIntPipe) id: number,
    @Body() metadata?: any
  ) {
    await this.notificationService.markAsDelivered(id, metadata);
  }

  @Patch(':id/failed')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsFailed(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string; metadata?: any }
  ) {
    await this.notificationService.markAsFailed(id, body.reason, body.metadata);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id', ParseIntPipe) id: number,
    @Query('recipientId') recipientId: string
  ) {
    const success = await this.notificationService.deleteById(id, recipientId);
    if (!success) {
      throw new Error('Notification not found or access denied');
    }
  }

  @Delete('expired')
  async deleteExpiredNotifications() {
    const count = await this.notificationService.deleteExpired();
    return { deletedCount: count };
  }
}