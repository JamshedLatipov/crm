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

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(
    @Inject(SERVICES.NOTIFICATION) private readonly notificationClient: ClientProxy,
  ) {}

  @Get()
  async findAll(@Query() filter: NotificationFilterDto) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.GET_NOTIFICATIONS, filter).pipe(timeout(5000)),
    );
  }

  @Get('unread-count/:recipientId')
  async getUnreadCount(@Param('recipientId') recipientId: string) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.GET_UNREAD_COUNT, { recipientId }).pipe(timeout(5000)),
    );
  }

  @Post()
  async send(@Body() dto: SendNotificationDto) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.SEND, dto).pipe(timeout(5000)),
    );
  }

  @Post('bulk')
  async sendBulk(@Body() dto: SendBulkNotificationDto) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.SEND_BULK, dto).pipe(timeout(5000)),
    );
  }

  @Post('mark-read')
  async markRead(@Body() dto: MarkReadDto) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_PATTERNS.MARK_READ, dto).pipe(timeout(5000)),
    );
  }
}
