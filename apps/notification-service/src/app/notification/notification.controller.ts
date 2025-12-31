import {
  Controller,
  Get,
  Post,
  Delete,
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

  @MessagePattern(NOTIFICATION_PATTERNS.GET_NOTIFICATIONS)
  handleGetNotifications(@Payload() filter: NotificationFilterDto) {
    return this.notificationService.findAll(filter);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.GET_UNREAD_COUNT)
  handleGetUnreadCount(@Payload() data: { recipientId: string }) {
    return this.notificationService.getUnreadCount(data.recipientId);
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
