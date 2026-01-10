import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import {
  NOTIFICATION_PATTERNS,
  SendNotificationDto,
  SendBulkNotificationDto,
  NotificationFilterDto,
  MarkReadDto,
  TASK_EVENTS,
  CALL_EVENTS,
  LEAD_EVENTS,
  DEAL_EVENTS,
} from '@crm/contracts';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ============ HTTP Endpoints ============

  @Get()
  findAll(@Query() filter: NotificationFilterDto) {
    return this.notificationService.findAll(filter);
  }

  @Get('unread-count/:recipientId')
  getUnreadCount(@Param('recipientId') recipientId: string) {
    return this.notificationService.getUnreadCount(recipientId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.findOne(id);
  }

  @Post()
  send(@Body() dto: SendNotificationDto) {
    return this.notificationService.send(dto);
  }

  @Post('bulk')
  sendBulk(@Body() dto: SendBulkNotificationDto) {
    return this.notificationService.sendBulk(dto);
  }

  @Post('mark-read')
  markRead(@Body() dto: MarkReadDto) {
    return this.notificationService.markRead(dto);
  }

  @Post('mark-all-read/:recipientId')
  markAllRead(@Param('recipientId') recipientId: string) {
    return this.notificationService.markAllRead(recipientId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.remove(id);
  }

  @Get('pending')
  getPending() {
    return this.notificationService.getPending();
  }

  @Get('scheduled')
  getScheduled() {
    return this.notificationService.getScheduled();
  }

  @Get('failed')
  getFailed() {
    return this.notificationService.getFailed();
  }

  @Post('lead')
  sendLeadNotification(@Body() body: {
    type: string;
    title: string;
    message: string;
    leadData: any;
    recipientId: string;
    channels?: string[];
    priority?: string;
  }) {
    return this.notificationService.sendLeadNotification(body);
  }

  @Post('deal')
  sendDealNotification(@Body() body: {
    type: string;
    title: string;
    message: string;
    dealData: any;
    recipientId: string;
    channels?: string[];
    priority?: string;
  }) {
    return this.notificationService.sendDealNotification(body);
  }

  @Post('system')
  sendSystemNotification(@Body() body: {
    type: string;
    title: string;
    message: string;
    recipientId: string;
    channels?: string[];
    priority?: string;
  }) {
    return this.notificationService.sendSystemNotification(body);
  }

  @Patch(':id/sent')
  markSent(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markSent(id);
  }

  @Patch(':id/delivered')
  markDelivered(@Param('id', ParseIntPipe) id: number, @Body() metadata?: any) {
    return this.notificationService.markDelivered(id, metadata);
  }

  @Patch(':id/failed')
  markFailed(@Param('id', ParseIntPipe) id: number, @Body() body: { reason: string; metadata?: any }) {
    return this.notificationService.markFailed(id, body.reason, body.metadata);
  }

  @Delete('expired')
  deleteExpired() {
    return this.notificationService.deleteExpired();
  }

  @Delete('all/:recipientId')
  deleteAll(@Param('recipientId') recipientId: string) {
    return this.notificationService.deleteAll(recipientId);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(NOTIFICATION_PATTERNS.SEND)
  handleSend(@Payload() dto: SendNotificationDto) {
    return this.notificationService.send(dto);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.SEND_BULK)
  handleSendBulk(@Payload() dto: SendBulkNotificationDto) {
    return this.notificationService.sendBulk(dto);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_READ)
  handleMarkRead(@Payload() dto: MarkReadDto) {
    return this.notificationService.markRead(dto);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_ALL_READ)
  handleMarkAllRead(@Payload() data: { recipientId: string }) {
    return this.notificationService.markAllRead(data.recipientId);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.GET_NOTIFICATIONS)
  handleGetNotifications(@Payload() filter: NotificationFilterDto) {
    return this.notificationService.findAll(filter);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.GET_NOTIFICATION)
  handleGetNotification(@Payload() data: { id: number }) {
    return this.notificationService.findOne(data.id);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.GET_UNREAD_COUNT)
  handleGetUnreadCount(@Payload() data: { recipientId: string }) {
    return this.notificationService.getUnreadCount(data.recipientId);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.DELETE)
  handleDelete(@Payload() data: { id: number }) {
    return this.notificationService.remove(data.id);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.GET_PENDING)
  handleGetPending() {
    return this.notificationService.getPending();
  }

  @MessagePattern(NOTIFICATION_PATTERNS.GET_SCHEDULED)
  handleGetScheduled() {
    return this.notificationService.getScheduled();
  }

  @MessagePattern(NOTIFICATION_PATTERNS.GET_FAILED)
  handleGetFailed() {
    return this.notificationService.getFailed();
  }

  @MessagePattern(NOTIFICATION_PATTERNS.SEND_LEAD_NOTIFICATION)
  handleSendLeadNotification(@Payload() data: any) {
    return this.notificationService.sendLeadNotification(data);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.SEND_DEAL_NOTIFICATION)
  handleSendDealNotification(@Payload() data: any) {
    return this.notificationService.sendDealNotification(data);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.SEND_SYSTEM_NOTIFICATION)
  handleSendSystemNotification(@Payload() data: any) {
    return this.notificationService.sendSystemNotification(data);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_SENT)
  handleMarkSent(@Payload() data: { id: number }) {
    return this.notificationService.markSent(data.id);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.DELETE_ALL)
  handleDeleteAll(@Payload() data: { recipientId: string }) {
    return this.notificationService.deleteAll(data.recipientId);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_DELIVERED)
  handleMarkDelivered(@Payload() data: { id: number; metadata?: any }) {
    return this.notificationService.markDelivered(data.id, data.metadata);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_FAILED)
  handleMarkFailed(@Payload() data: { id: number; reason: string; metadata?: any }) {
    return this.notificationService.markFailed(data.id, data.reason, data.metadata);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.DELETE_EXPIRED)
  handleDeleteExpired() {
    return this.notificationService.deleteExpired();
  }

  @MessagePattern(NOTIFICATION_PATTERNS.HEALTH_CHECK)
  handleHealthCheck() {
    return { status: 'ok', service: 'notification-service' };
  }

  // ============ Event Handlers (Event-driven) ============

  @EventPattern(TASK_EVENTS.ASSIGNED)
  handleTaskAssigned(@Payload() payload: any) {
    // Auto-send notification when task is assigned
    if (payload.payload?.assigneeId) {
      this.notificationService.send({
        type: 'task_assigned' as any,
        title: 'New Task Assigned',
        message: `You have been assigned a new task`,
        channel: 'in_app' as any,
        recipientId: String(payload.payload.assigneeId),
        data: payload.payload,
      });
    }
  }

  @EventPattern(TASK_EVENTS.OVERDUE)
  handleTaskOverdue(@Payload() payload: any) {
    if (payload.payload?.assigneeId) {
      this.notificationService.send({
        type: 'task_overdue' as any,
        title: 'Task Overdue',
        message: `Task "${payload.payload.title}" is overdue`,
        channel: 'in_app' as any,
        priority: 'high' as any,
        recipientId: String(payload.payload.assigneeId),
        data: payload.payload,
      });
    }
  }

  @EventPattern(CALL_EVENTS.ENDED)
  handleCallEnded(@Payload() payload: any) {
    // Notify about missed calls
    if (payload.payload?.disposition === 'NO ANSWER' && payload.payload?.userId) {
      this.notificationService.send({
        type: 'call_missed' as any,
        title: 'Missed Call',
        message: `Missed call from ${payload.payload.callerNumber}`,
        channel: 'in_app' as any,
        recipientId: String(payload.payload.userId),
        data: payload.payload,
      });
    }
  }

  @EventPattern(LEAD_EVENTS.ASSIGNED)
  handleLeadAssigned(@Payload() payload: any) {
    if (payload.payload?.assigneeId) {
      this.notificationService.send({
        type: 'lead_assigned' as any,
        title: 'New Lead Assigned',
        message: `Lead "${payload.payload.name || 'New Lead'}" has been assigned to you`,
        channel: 'in_app' as any,
        recipientId: String(payload.payload.assigneeId),
        data: payload.payload,
      });
    }
  }

  @EventPattern(DEAL_EVENTS.WON)
  handleDealWon(@Payload() payload: any) {
    if (payload.payload?.ownerId) {
      this.notificationService.send({
        type: 'deal_won' as any,
        title: 'Deal Won! 🎉',
        message: `Deal "${payload.payload.title}" has been won`,
        channel: 'in_app' as any,
        priority: 'high' as any,
        recipientId: String(payload.payload.ownerId),
        data: payload.payload,
      });
    }
  }

  @EventPattern(DEAL_EVENTS.LOST)
  handleDealLost(@Payload() payload: any) {
    if (payload.payload?.ownerId) {
      this.notificationService.send({
        type: 'deal_lost' as any,
        title: 'Deal Lost',
        message: `Deal "${payload.payload.title}" has been marked as lost`,
        channel: 'in_app' as any,
        recipientId: String(payload.payload.ownerId),
        data: payload.payload,
      });
    }
  }
}
