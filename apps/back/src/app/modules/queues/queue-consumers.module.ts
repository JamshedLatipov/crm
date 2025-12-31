import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsQueueConsumer } from './consumers/sms-queue.consumer';
import { LeadQueueConsumer } from './consumers/lead-queue.consumer';
import { WebhookQueueConsumer } from './consumers/webhook-queue.consumer';
import { SmsMessage } from '../sms/entities/sms-message.entity';
import { SmsCampaign } from '../sms/entities/sms-campaign.entity';
import { SmsModule } from '../sms/sms.module';
import { LeadModule } from '../leads/lead.module';

/**
 * Separate module for queue consumers.
 * This module must be loaded AFTER all feature modules to ensure
 * services are available via DI.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([SmsMessage, SmsCampaign]),
    SmsModule,
    LeadModule,
  ],
  providers: [
    SmsQueueConsumer,
    LeadQueueConsumer,
    WebhookQueueConsumer,
  ],
})
export class QueueConsumersModule {}
