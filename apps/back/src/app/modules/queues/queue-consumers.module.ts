import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsQueueConsumer } from './consumers/sms-queue.consumer';
import { WhatsAppQueueConsumer } from './consumers/whatsapp-queue.consumer';
import { TelegramQueueConsumer } from './consumers/telegram-queue.consumer';
import { LeadQueueConsumer } from './consumers/lead-queue.consumer';
import { WebhookQueueConsumer } from './consumers/webhook-queue.consumer';
import { SmsMessage } from '../messages/entities/sms-message.entity';
import { MessageCampaign } from '../messages/entities/message-campaign.entity';
import { WhatsAppMessage } from '../messages/entities/whatsapp-message.entity';
import { WhatsAppTemplate } from '../messages/entities/whatsapp-template.entity';
import { TelegramMessage } from '../messages/entities/telegram-message.entity';
import { TelegramTemplate } from '../messages/entities/telegram-template.entity';
import { MessagesModule } from '../messages/messages.module';
import { LeadModule } from '../leads/lead.module';

/**
 * Separate module for queue consumers.
 * This module must be loaded AFTER all feature modules to ensure
 * services are available via DI.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      SmsMessage,
      MessageCampaign,
      WhatsAppMessage,
      WhatsAppTemplate,
      TelegramMessage,
      TelegramTemplate,
    ]),
    MessagesModule,
    LeadModule,
  ],
  providers: [
    SmsQueueConsumer,
    WhatsAppQueueConsumer,
    TelegramQueueConsumer,
    LeadQueueConsumer,
    WebhookQueueConsumer,
  ],
})
export class QueueConsumersModule {}
