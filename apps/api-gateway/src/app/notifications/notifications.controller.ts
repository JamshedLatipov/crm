import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  SERVICES,
  NOTIFICATION_PATTERNS,
  SendNotificationDto,
  SendBulkNotificationDto,
  NotificationFilterDto,
  MarkReadDto,
} from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(
    @Inject(SERVICES.NOTIFICATION) private readonly notificationClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications', description: 'Retrieve notifications with optional filtering' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async findAll(@Query() filter: NotificationFilterDto) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.GET_NOTIFICATIONS, filter).pipe(timeout(5000)),
    );
  }

  @Get('unread-count/:recipientId')
  @ApiOperation({ summary: 'Get unread count', description: 'Get count of unread notifications for a user' })
  @ApiParam({ name: 'recipientId', description: 'Recipient user ID' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Param('recipientId') recipientId: string) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.GET_UNREAD_COUNT, { recipientId }).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID', description: 'Retrieve a specific notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification found' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.GET_NOTIFICATION, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Send notification', description: 'Create and send a new notification' })
  @ApiResponse({ status: 201, description: 'Notification sent' })
  async send(@Body() dto: SendNotificationDto) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.SEND, dto).pipe(timeout(5000)),
    );
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send bulk notifications', description: 'Send notifications to multiple recipients' })
  @ApiResponse({ status: 201, description: 'Notifications sent' })
  async sendBulk(@Body() dto: SendBulkNotificationDto) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.SEND_BULK, dto).pipe(timeout(5000)),
    );
  }

  @Post('mark-read')
  @ApiOperation({ summary: 'Mark notifications as read', description: 'Mark one or more notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markRead(@Body() dto: MarkReadDto) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.MARK_READ, dto).pipe(timeout(5000)),
    );
  }

  @Post('mark-all-read/:recipientId')
  @ApiOperation({ summary: 'Mark all as read', description: 'Mark all notifications for a user as read' })
  @ApiParam({ name: 'recipientId', description: 'Recipient user ID' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(@Param('recipientId') recipientId: string) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.MARK_ALL_READ, { recipientId }).pipe(timeout(5000)),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification', description: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 204, description: 'Notification deleted' })
  async remove(@Param('id') id: string) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.DELETE, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  // ========== Notification Rules Endpoints ==========

  @Get('rules')
  @ApiOperation({ summary: 'Get notification rules' })
  async getRules() {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.RULES_GET_ALL, {}).pipe(timeout(5000)),
    );
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get notification rule by ID' })
  async getRule(@Param('id') id: string) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.RULES_GET_ONE, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create notification rule' })
  async createRule(@Body() dto: any) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.RULES_CREATE, dto).pipe(timeout(5000)),
    );
  }

  @Post('rules/:id')
  @ApiOperation({ summary: 'Update notification rule' })
  async updateRule(@Param('id') id: string, @Body() dto: any) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.RULES_UPDATE, { id: parseInt(id), dto }).pipe(timeout(5000)),
    );
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete notification rule' })
  async deleteRule(@Param('id') id: string) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.RULES_DELETE, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Post('rules/:id/toggle')
  @ApiOperation({ summary: 'Toggle notification rule' })
  async toggleRule(@Param('id') id: string) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.RULES_TOGGLE, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Post('rules/evaluate')
  @ApiOperation({ summary: 'Evaluate rules for trigger' })
  async evaluateRules(@Body() dto: { trigger: string; context: Record<string, any> }) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.RULES_EVALUATE, dto).pipe(timeout(5000)),
    );
  }

  @Get('rules/stats')
  @ApiOperation({ summary: 'Get rule statistics' })
  async getRuleStats() {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.RULES_GET_STATS, {}).pipe(timeout(5000)),
    );
  }
}
