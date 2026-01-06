import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsSendJob, SmsBatchJob } from '../queue-producer.service';
import { QUEUE_NAMES } from '../queue.constants';
import { SmsMessage, MessageStatus } from '../../messages/entities/sms-message.entity';
import { SmsCampaign, CampaignStatus } from '../../messages/entities/sms-campaign.entity';
import { SmsProviderService } from '../../messages/services/sms-provider.service';
import { SmsTemplateService } from '../../messages/services/sms-template.service';
import { getRabbitMqUrl } from '../rabbitmq.utils';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsQueueConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsQueueConsumer.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    @InjectRepository(SmsMessage)
    private readonly messageRepo: Repository<SmsMessage>,
    @InjectRepository(SmsCampaign)
    private readonly campaignRepo: Repository<SmsCampaign>,
    private readonly configService: ConfigService,
    private readonly smsProviderService: SmsProviderService,
    private readonly templateService: SmsTemplateService,
  ) {}

  async onModuleInit() {
    await this.setupConsumer();
  }

  private async setupConsumer() {
    try {
      const rmqUrl = getRabbitMqUrl(this.configService);
      this.connection = await amqp.connect(rmqUrl);
      this.channel = await this.connection.createChannel();

      // Setup queues
      await this.channel.assertQueue(QUEUE_NAMES.SMS, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': QUEUE_NAMES.DLQ,
        },
      });

      await this.channel.assertQueue(QUEUE_NAMES.DLQ, { durable: true });

      // Set prefetch for controlled parallelism
      await this.channel.prefetch(10);

      // Start consuming
      await this.channel.consume(QUEUE_NAMES.SMS, async (msg) => {
        if (!msg) return;

        try {
          const job = JSON.parse(msg.content.toString());
          await this.processJob(job);
          this.channel?.ack(msg);
        } catch (error) {
          this.logger.error('Failed to process SMS job', (error as Error).stack);
          // Reject and requeue if retries available, otherwise send to DLQ
          this.channel?.nack(msg, false, false);
        }
      });

      this.logger.log('SMS Queue Consumer started');
    } catch (error) {
      this.logger.error('Failed to setup SMS consumer', (error as Error).stack);
    }
  }

  private async processJob(job: SmsSendJob | SmsBatchJob) {
    switch (job.type) {
      case 'sms_send':
        await this.processSingleSms(job);
        break;
      case 'sms_batch':
        await this.processBatch(job);
        break;
      default:
        this.logger.warn(`Unknown job type: ${(job as any).type}`);
    }
  }

  /**
   * Process a single SMS message
   */
  private async processSingleSms(job: SmsSendJob): Promise<void> {
    const message = await this.messageRepo.findOne({
      where: { id: job.messageId },
      relations: ['campaign', 'campaign.template'],
    });

    if (!message) {
      this.logger.warn(`Message ${job.messageId} not found`);
      return;
    }

    if (message.status !== MessageStatus.PENDING && message.status !== MessageStatus.QUEUED) {
      this.logger.debug(`Message ${job.messageId} already processed (status: ${message.status})`);
      return;
    }

    try {
      // Update status to queued
      message.status = MessageStatus.QUEUED;
      await this.messageRepo.save(message);

      // Send SMS via provider
      const result = await this.smsProviderService.sendSms(
        job.phoneNumber || message.phoneNumber,
        job.content || message.content,
      );

      if (result.success) {
        message.status = MessageStatus.SENT;
        message.sentAt = new Date();
        message.cost = result.cost || 0;
        message.metadata = {
          ...message.metadata,
          providerId: result.providerId,
        };

        // Update campaign counters
        if (message.campaign) {
          await this.campaignRepo.increment({ id: message.campaign.id }, 'sentCount', 1);
          await this.campaignRepo.decrement({ id: message.campaign.id }, 'pendingCount', 1);
        }

        this.logger.debug(`SMS sent successfully: ${job.messageId}`);
      } else {
        await this.handleSendFailure(message, job, result.error || 'Unknown error');
      }

      await this.messageRepo.save(message);

      // Update template usage
      if (message.campaign?.template) {
        await this.templateService.incrementUsageCount(message.campaign.template.id);
      }
    } catch (error) {
      await this.handleSendFailure(message, job, (error as Error).message);
      throw error; // Re-throw for queue retry mechanism
    }
  }

  /**
   * Handle SMS send failure with retry logic
   */
  private async handleSendFailure(
    message: SmsMessage,
    job: SmsSendJob,
    errorMessage: string,
  ): Promise<void> {
    const retryCount = (job.retryCount || 0) + 1;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      // Requeue with incremented retry count via channel
      const retryJob: SmsSendJob = {
        ...job,
        retryCount,
      };
      
      // Delay retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      setTimeout(() => {
        this.publishToQueue(QUEUE_NAMES.SMS, retryJob);
      }, delay);

      this.logger.warn(`SMS ${job.messageId} failed, retry ${retryCount}/${maxRetries}`);
    } else {
      // Mark as failed after max retries
      message.status = MessageStatus.FAILED;
      message.failedAt = new Date();
      message.metadata = {
        ...message.metadata,
        errorMessage,
        retryCount,
      };

      if (message.campaign) {
        await this.campaignRepo.increment({ id: message.campaign.id }, 'failedCount', 1);
        await this.campaignRepo.decrement({ id: message.campaign.id }, 'pendingCount', 1);
      }

      this.logger.error(`SMS ${job.messageId} failed permanently after ${maxRetries} retries`);
    }

    await this.messageRepo.save(message);
  }

  /**
   * Process batch of SMS messages (fan-out to individual jobs)
   */
  private async processBatch(job: SmsBatchJob): Promise<void> {
    this.logger.log(`Processing SMS batch for campaign ${job.campaignId}`);

    const campaign = await this.campaignRepo.findOne({
      where: { id: job.campaignId },
    });

    if (!campaign || campaign.status !== CampaignStatus.SENDING) {
      this.logger.warn(`Campaign ${job.campaignId} not in sending status`);
      return;
    }

    // Queue each message individually for parallel processing
    for (const messageId of job.messageIds) {
      const message = await this.messageRepo.findOne({
        where: { id: messageId },
      });

      if (message && message.status === MessageStatus.PENDING) {
        const smsJob: SmsSendJob = {
          type: 'sms_send',
          messageId,
          campaignId: job.campaignId,
          phoneNumber: message.phoneNumber,
          content: message.content,
          priority: 5,
        };

        this.publishToQueue(QUEUE_NAMES.SMS, smsJob);
      }
    }

    this.logger.log(`Queued ${job.messageIds.length} SMS messages for campaign ${job.campaignId}`);
  }

  /**
   * Publish message to queue via amqplib channel
   */
  private publishToQueue(queue: string, message: SmsSendJob | SmsBatchJob): void {
    if (!this.channel) {
      this.logger.error('Channel not available for publishing');
      return;
    }
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('SMS Queue Consumer stopped');
    } catch (error) {
      this.logger.error('Error closing SMS consumer', (error as Error).stack);
    }
  }
}
