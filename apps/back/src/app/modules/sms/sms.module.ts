import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { SmsTemplate } from './entities/sms-template.entity';
import { SmsCampaign } from './entities/sms-campaign.entity';
import { SmsMessage } from './entities/sms-message.entity';
import { SmsSegment } from './entities/sms-segment.entity';
import { SmsAnalytics } from './entities/sms-analytics.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { NotificationCampaign } from './entities/notification-campaign.entity';
import { Contact } from '../contacts/contact.entity';
import { Lead } from '../leads/lead.entity';

// Services
import { SmsProviderService } from './services/sms-provider.service';
import { SmsTemplateService } from './services/sms-template.service';
import { SmsCampaignService } from './services/sms-campaign.service';
import { SmsSegmentService } from './services/sms-segment.service';
import { SmsAnalyticsService } from './services/sms-analytics.service';
import { EmailProviderService } from './services/email-provider.service';
import { RestApiProviderService } from './services/rest-api-provider.service';
import { NotificationService } from './services/notification.service';
import { EmailTemplateService } from './services/email-template.service';

// Controllers
import { SmsTemplateController } from './controllers/sms-template.controller';
import { SmsCampaignController } from './controllers/sms-campaign.controller';
import { SmsSegmentController } from './controllers/sms-segment.controller';
import { SmsAnalyticsController } from './controllers/sms-analytics.controller';
import { EmailTemplateController } from './controllers/email-template.controller';
import { NotificationController } from './controllers/notification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmsTemplate,
      SmsCampaign,
      SmsMessage,
      SmsSegment,
      SmsAnalytics,
      EmailTemplate,
      NotificationCampaign,
      Contact,
      Lead,
    ]),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    SmsTemplateController,
    SmsCampaignController,
    SmsSegmentController,
    SmsAnalyticsController,
    EmailTemplateController,
    NotificationController,
  ],
  providers: [
    SmsProviderService,
    SmsTemplateService,
    SmsCampaignService,
    SmsSegmentService,
    SmsAnalyticsService,
    EmailProviderService,
    RestApiProviderService,
    NotificationService,
    EmailTemplateService,
  ],
  exports: [
    SmsProviderService,
    SmsTemplateService,
    SmsCampaignService,
    SmsSegmentService,
    SmsAnalyticsService,
    EmailProviderService,
    RestApiProviderService,
    NotificationService,
    EmailTemplateService,
  ],
})
export class SmsModule {}
