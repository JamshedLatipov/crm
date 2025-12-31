import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { QUEUE_NAMES } from './queue.constants';
import { getRabbitMqUrl } from './rabbitmq.utils';

// ============== SMS Queue Types ==============
export interface SmsSendJob {
  type: 'sms_send';
  messageId: string;
  campaignId: string;
  phoneNumber: string;
  content: string;
  priority?: number;
  retryCount?: number;
  scheduledAt?: string;
}

export interface SmsBatchJob {
  type: 'sms_batch';
  campaignId: string;
  messageIds: string[];
}

// ============== Lead Queue Types ==============
export interface LeadCaptureJob {
  type: 'lead_capture';
  source: 'website' | 'social' | 'api' | 'import';
  data: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  receivedAt: string;
}

export interface LeadScoringJob {
  type: 'lead_scoring';
  leadId: number;
  context?: Record<string, any>;
}

export interface LeadDistributionJob {
  type: 'lead_distribution';
  leadId: number;
}

// ============== Webhook Queue Types ==============
export interface WebhookJob {
  type: 'webhook_send';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  payload: Record<string, any>;
  headers?: Record<string, string>;
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
  sourceType?: 'ivr' | 'lead' | 'deal' | 'notification';
  sourceId?: string;
}

// Union type for all jobs
export type QueueJob = 
  | SmsSendJob 
  | SmsBatchJob 
  | LeadCaptureJob 
  | LeadScoringJob 
  | LeadDistributionJob 
  | WebhookJob;

@Injectable()
export class QueueProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueProducerService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const rmqUrl = getRabbitMqUrl(this.configService);
      this.connection = await amqp.connect(rmqUrl);
      this.channel = await this.connection.createChannel();

      // Assert all queues exist
      await this.channel.assertQueue(QUEUE_NAMES.SMS, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': QUEUE_NAMES.DLQ,
        },
      });
      await this.channel.assertQueue(QUEUE_NAMES.LEAD, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': QUEUE_NAMES.DLQ,
        },
      });
      await this.channel.assertQueue(QUEUE_NAMES.WEBHOOK, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': QUEUE_NAMES.DLQ,
        },
      });
      await this.channel.assertQueue(QUEUE_NAMES.DLQ, { durable: true });

      this.isConnected = true;
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', (error as Error).stack);
    }
  }

  private async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.isConnected = false;
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ', (error as Error).stack);
    }
  }

  // ============== SMS Queue Methods ==============

  /**
   * Queue a single SMS message for sending
   */
  async queueSms(job: Omit<SmsSendJob, 'type'>): Promise<void> {
    const message: SmsSendJob = { type: 'sms_send', ...job };
    await this.emit(QUEUE_NAMES.SMS, message);
    this.logger.debug(`Queued SMS for message ${job.messageId}`);
  }

  /**
   * Queue a batch of SMS messages (for campaign)
   */
  async queueSmsBatch(campaignId: string, messageIds: string[]): Promise<void> {
    const message: SmsBatchJob = { type: 'sms_batch', campaignId, messageIds };
    await this.emit(QUEUE_NAMES.SMS, message);
    this.logger.log(`Queued SMS batch for campaign ${campaignId} with ${messageIds.length} messages`);
  }

  // ============== Lead Queue Methods ==============

  /**
   * Queue lead capture from webhook (fast response)
   */
  async queueLeadCapture(job: Omit<LeadCaptureJob, 'type' | 'receivedAt'>): Promise<void> {
    const message: LeadCaptureJob = {
      type: 'lead_capture',
      ...job,
      receivedAt: new Date().toISOString(),
    };
    await this.emit(QUEUE_NAMES.LEAD, message);
    this.logger.debug(`Queued lead capture from ${job.source}`);
  }

  /**
   * Queue lead scoring calculation
   */
  async queueLeadScoring(leadId: number, context?: Record<string, any>): Promise<void> {
    const message: LeadScoringJob = { type: 'lead_scoring', leadId, context };
    await this.emit(QUEUE_NAMES.LEAD, message);
    this.logger.debug(`Queued scoring for lead ${leadId}`);
  }

  /**
   * Queue lead distribution/assignment
   */
  async queueLeadDistribution(leadId: number): Promise<void> {
    const message: LeadDistributionJob = { type: 'lead_distribution', leadId };
    await this.emit(QUEUE_NAMES.LEAD, message);
    this.logger.debug(`Queued distribution for lead ${leadId}`);
  }

  // ============== Webhook Queue Methods ==============

  /**
   * Queue webhook call with retry support
   */
  async queueWebhook(job: Omit<WebhookJob, 'type'>): Promise<void> {
    const message: WebhookJob = {
      type: 'webhook_send',
      retryCount: 0,
      maxRetries: 3,
      timeout: 10000,
      ...job,
    };
    await this.emit(QUEUE_NAMES.WEBHOOK, message);
    this.logger.debug(`Queued webhook to ${job.url}`);
  }

  // ============== Generic Methods ==============

  /**
   * Emit message to specific queue
   */
  private async emit(queue: string, message: QueueJob): Promise<void> {
    if (!this.channel || !this.isConnected) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    try {
      this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );
    } catch (error) {
      this.logger.error(`Failed to emit to queue ${queue}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Check if connected to RabbitMQ
   */
  isReady(): boolean {
    return this.isConnected && this.channel !== null;
  }
}
