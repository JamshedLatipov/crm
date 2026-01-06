import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';

// Entities
import { SmsTemplate } from './entities/sms-template.entity';
import { SmsCampaign } from './entities/sms-campaign.entity';
import { SmsMessage } from './entities/sms-message.entity';
import { SmsSegment } from './entities/sms-segment.entity';
import { SmsAnalytics } from './entities/sms-analytics.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailMessage } from './entities/email-message.entity';
import { WhatsAppMessage } from './entities/whatsapp-message.entity';
import { WhatsAppTemplate } from './entities/whatsapp-template.entity';
import { TelegramMessage } from './entities/telegram-message.entity';
import { TelegramTemplate } from './entities/telegram-template.entity';
import { MessageCampaign } from './entities/message-campaign.entity';
import { Media } from './entities/media.entity';
import { Setting } from './entities/setting.entity';
import { NotificationAnalytics } from '../shared/entities/notification-analytics.entity';
import { Contact } from '../contacts/contact.entity';
import { Lead } from '../leads/lead.entity';
import { Deal } from '../deals/deal.entity';
import { Company } from '../companies/entities/company.entity';

// Services
import { SmsProviderService } from './services/sms-provider.service';
import { SmsTemplateService } from './services/sms-template.service';
import { SmsCampaignService } from './services/sms-campaign.service';
import { SmsSegmentService } from './services/sms-segment.service';
import { SmsAnalyticsService } from './services/sms-analytics.service';
import { EmailProviderService } from './services/email-provider.service';
import { WhatsAppProviderService } from './services/whatsapp-provider.service';
import { WhatsAppTemplateService } from './services/whatsapp-template.service';
import { TelegramProviderService } from './services/telegram-provider.service';
import { TelegramTemplateService } from './services/telegram-template.service';
import { RestApiProviderService } from './services/rest-api-provider.service';
import { NotificationService } from './services/notification.service';
import { EmailTemplateService } from './services/email-template.service';
import { TemplateRenderService } from './services/template-render.service';
import { MessageQueueService } from './services/message-queue.service';
import { MessageAnalyticsService } from './services/message-analytics.service';
import { MediaService } from './services/media.service';
import { SettingService } from './services/setting.service';

// Controllers
import { SmsTemplateController } from './controllers/sms-template.controller';
import { SmsCampaignController } from './controllers/sms-campaign.controller';
import { SmsSegmentController } from './controllers/sms-segment.controller';
import { SmsAnalyticsController } from './controllers/sms-analytics.controller';
import { EmailTemplateController } from './controllers/email-template.controller';
import { NotificationController } from './controllers/notification.controller';
import { WhatsAppTemplateController } from './controllers/whatsapp-template.controller';
import { TelegramTemplateController } from './controllers/telegram-template.controller';
import { MessageWorkerController } from './controllers/message-worker.controller';
import { MessageAnalyticsController } from './controllers/message-analytics.controller';
import { MediaController } from './controllers/media.controller';
import { SettingController } from './controllers/setting.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmsTemplate,
      SmsCampaign,
      SmsMessage,
      SmsSegment,
      SmsAnalytics,
      EmailTemplate,
      EmailMessage,
      WhatsAppMessage,
      WhatsAppTemplate,
      TelegramMessage,
      TelegramTemplate,
      MessageCampaign,
      Media,
      Setting,
      NotificationAnalytics,
      Contact,
      Lead,
      Deal,
      Company,
    ]),
    ConfigModule,
    ScheduleModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
    }),
    // RabbitMQ для массовых рассылок
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_QUEUE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672'],
            queue: 'notifications_queue',
            queueOptions: {
              durable: true,
              arguments: {
                'x-message-ttl': 86400000, // 24 hours
                'x-max-length': 10000, // Max queue size
              },
            },
            prefetchCount: 10, // Workers берут по 10 сообщений за раз
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [
    SmsTemplateController,
    SmsCampaignController,
    SmsSegmentController,
    SmsAnalyticsController,
    EmailTemplateController,
    NotificationController,
    WhatsAppTemplateController,
    TelegramTemplateController,
    MessageWorkerController,
    MessageAnalyticsController,
    MediaController,
    SettingController,
  ],
  providers: [
    SmsProviderService,
    SmsTemplateService,
    SmsCampaignService,
    SmsSegmentService,
    SmsAnalyticsService,
    EmailProviderService,
    EmailTemplateService,
    WhatsAppProviderService,
    WhatsAppTemplateService,
    TelegramProviderService,
    TelegramTemplateService,
    RestApiProviderService,
    NotificationService,
    TemplateRenderService,
    MessageQueueService,
    MessageAnalyticsService,
    MediaService,
    SettingService,
  ],
  exports: [
    SmsProviderService,
    SmsTemplateService,
    SmsCampaignService,
    SmsSegmentService,
    SmsAnalyticsService,
    EmailProviderService,
    EmailTemplateService,
    WhatsAppProviderService,
    WhatsAppTemplateService,
    TelegramProviderService,
    TelegramTemplateService,
    RestApiProviderService,
    NotificationService,
    TemplateRenderService,
    MessageQueueService,
    MessageAnalyticsService,
    MediaService,
    SettingService,
  ],
})
export class MessagesModule {}
