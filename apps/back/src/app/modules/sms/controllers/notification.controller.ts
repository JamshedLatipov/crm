import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  NotificationService,
  NotificationChannel,
  NotificationPayload,
  MultiChannelPayload,
} from '../services/notification.service';

export class SendNotificationDto {
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  message: string;
  template?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class SendMultiChannelDto {
  channels: NotificationChannel[];
  sms?: {
    phoneNumber: string;
    message: string;
  };
  email?: {
    to: string;
    subject: string;
    html: string;
  };
  webhook?: {
    url: string;
    event: string;
    data: any;
  };
  variables?: Record<string, any>;
}

export class SendBulkDto {
  channel: NotificationChannel;
  notifications: Array<{
    recipient: string;
    message: string;
    subject?: string;
    variables?: Record<string, any>;
  }>;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @ApiOperation({ summary: 'Отправить уведомление через один канал' })
  @ApiResponse({ status: 200, description: 'Уведомление отправлено' })
  async send(@Body() dto: SendNotificationDto) {
    return this.notificationService.send(dto as NotificationPayload);
  }

  @Post('send-multi')
  @ApiOperation({ summary: 'Отправить уведомление через несколько каналов' })
  @ApiResponse({ status: 200, description: 'Уведомления отправлены' })
  async sendMulti(@Body() dto: SendMultiChannelDto) {
    return this.notificationService.sendMultiChannel(dto as MultiChannelPayload);
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Массовая отправка через один канал' })
  @ApiResponse({ status: 200, description: 'Массовая рассылка выполнена' })
  async sendBulk(@Body() dto: SendBulkDto) {
    return this.notificationService.sendBulk(
      dto.channel,
      dto.notifications
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Проверка доступности каналов' })
  @ApiResponse({ status: 200, description: 'Статус каналов' })
  async checkHealth() {
    return this.notificationService.checkChannelsHealth();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Статистика по каналам' })
  @ApiResponse({ status: 200, description: 'Статистика каналов' })
  async getStats() {
    return this.notificationService.getChannelStats();
  }
}
