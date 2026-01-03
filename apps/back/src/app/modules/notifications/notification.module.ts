import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Notification } from '../shared/entities/notification.entity';
import { NotificationRule } from '../shared/entities/notification-rule.entity';
import { NotificationAnalytics } from '../shared/entities/notification-analytics.entity';
import { NotificationService } from '../shared/services/notification.service';
import { NotificationRuleService } from '../shared/services/notification-rule.service';
import { NotificationSchedulerService } from './services/notification-scheduler.service';
import { NotificationAnalyticsService } from './services/notification-analytics.service';
import { NotificationController } from './controllers/notification.controller';
import { NotificationRuleController } from './controllers/notification-rule.controller';
import { NotificationAnalyticsController } from './controllers/notification-analytics.controller';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { Lead } from '../leads/lead.entity';
import { Deal } from '../deals/deal.entity';
import { Task } from '../tasks/task.entity';
import { SmsMessage } from '../sms/entities/sms-message.entity';
import { EmailMessage } from '../sms/entities/email-message.entity';
import { NotificationCampaign } from '../sms/entities/notification-campaign.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Notification,
      NotificationRule,
      NotificationAnalytics,
      SmsMessage,
      EmailMessage,
      NotificationCampaign,
      Lead,
      Deal,
      Task
    ])
  ],
  controllers: [
    NotificationController,
    NotificationRuleController,
    NotificationAnalyticsController
  ],
  providers: [
    NotificationService,
    NotificationRuleService,
    NotificationSchedulerService,
    NotificationAnalyticsService,
    NotificationsGateway
  ],
  exports: [
    NotificationService,
    NotificationRuleService,
    NotificationSchedulerService,
    NotificationAnalyticsService,
    NotificationsGateway
  ]
})
export class NotificationModule {}