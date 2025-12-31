import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { LeadCaptureJob, LeadScoringJob, LeadDistributionJob } from '../queue-producer.service';
import { QUEUE_NAMES } from '../queue.constants';
import { getRabbitMqUrl } from '../rabbitmq.utils';
import { LeadCaptureService, WebhookData } from '../../leads/services/lead-capture.service';
import { LeadScoringService } from '../../leads/services/lead-scoring.service';
import { LeadDistributionService } from '../../leads/services/lead-distribution.service';

@Injectable()
export class LeadQueueConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeadQueueConsumer.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly leadCaptureService: LeadCaptureService,
    private readonly leadScoringService: LeadScoringService,
    private readonly leadDistributionService: LeadDistributionService,
  ) {}

  async onModuleInit() {
    await this.setupConsumer();
  }

  private async setupConsumer() {
    try {
      const rmqUrl = getRabbitMqUrl(this.configService);
      this.connection = await amqp.connect(rmqUrl);
      this.channel = await this.connection.createChannel();

      // Setup queue with DLQ
      await this.channel.assertQueue(QUEUE_NAMES.LEAD, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': QUEUE_NAMES.DLQ,
        },
      });

      // Set prefetch for controlled parallelism
      await this.channel.prefetch(5);

      // Start consuming
      await this.channel.consume(QUEUE_NAMES.LEAD, async (msg) => {
        if (!msg) return;

        try {
          const job = JSON.parse(msg.content.toString());
          await this.processJob(job);
          this.channel?.ack(msg);
        } catch (error) {
          this.logger.error('Failed to process Lead job', (error as Error).stack);
          // Send to DLQ on failure
          this.channel?.nack(msg, false, false);
        }
      });

      this.logger.log('Lead Queue Consumer started');
    } catch (error) {
      this.logger.error('Failed to setup Lead consumer', (error as Error).stack);
    }
  }

  private async processJob(job: LeadCaptureJob | LeadScoringJob | LeadDistributionJob) {
    switch (job.type) {
      case 'lead_capture':
        await this.processLeadCapture(job);
        break;
      case 'lead_scoring':
        await this.processLeadScoring(job);
        break;
      case 'lead_distribution':
        await this.processLeadDistribution(job);
        break;
      default:
        this.logger.warn(`Unknown job type: ${(job as any).type}`);
    }
  }

  /**
   * Process lead capture from webhook
   */
  private async processLeadCapture(job: LeadCaptureJob): Promise<void> {
    this.logger.debug(`Processing lead capture from ${job.source}`);

    try {
      const data = job.data as WebhookData;
      
      switch (job.source) {
        case 'website':
        case 'api':
        default:
          await this.leadCaptureService.captureFromWebsite(
            data,
            job.ipAddress,
            job.userAgent,
          );
          break;
        case 'social':
          await this.leadCaptureService.captureFromSocialMedia(
            data.source || 'unknown',
            { name: data.name },
          );
          break;
      }

      this.logger.log(`Lead captured successfully from ${job.source}`);
    } catch (error) {
      this.logger.error(`Failed to capture lead from ${job.source}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Process lead scoring calculation
   * Note: calculateScore fetches Lead internally, we pass minimal context
   */
  private async processLeadScoring(job: LeadScoringJob): Promise<void> {
    this.logger.debug(`Processing scoring for lead ${job.leadId}`);

    try {
      // Lead is fetched inside calculateScore, we need to provide context with lead placeholder
      // The service will use leadId to get actual lead
      await this.leadScoringService.calculateScore(job.leadId, { lead: {} as any });
      this.logger.debug(`Scoring completed for lead ${job.leadId}`);
    } catch (error) {
      this.logger.error(`Failed to score lead ${job.leadId}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Process lead distribution/assignment
   */
  private async processLeadDistribution(job: LeadDistributionJob): Promise<void> {
    this.logger.debug(`Processing distribution for lead ${job.leadId}`);

    try {
      await this.leadDistributionService.distributeLeadAutomatically(job.leadId);
      this.logger.debug(`Distribution completed for lead ${job.leadId}`);
    } catch (error) {
      this.logger.error(`Failed to distribute lead ${job.leadId}`, (error as Error).stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('Lead Queue Consumer stopped');
    } catch (error) {
      this.logger.error('Error closing Lead consumer', (error as Error).stack);
    }
  }
}
