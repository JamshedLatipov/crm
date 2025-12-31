import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import axios, { AxiosError } from 'axios';
import { WebhookJob } from '../queue-producer.service';
import { QUEUE_NAMES } from '../queue.constants';
import { getRabbitMqUrl } from '../rabbitmq.utils';

interface WebhookResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

@Injectable()
export class WebhookQueueConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookQueueConsumer.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly configService: ConfigService,
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
      await this.channel.assertQueue(QUEUE_NAMES.WEBHOOK, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': QUEUE_NAMES.DLQ,
        },
      });

      // Setup DLQ
      await this.channel.assertQueue(QUEUE_NAMES.DLQ, { durable: true });

      // Set prefetch for controlled parallelism
      await this.channel.prefetch(20); // Webhooks can be more parallel

      // Start consuming
      await this.channel.consume(QUEUE_NAMES.WEBHOOK, async (msg) => {
        if (!msg) return;

        try {
          const job: WebhookJob = JSON.parse(msg.content.toString());
          const result = await this.processWebhook(job);
          
          if (result.success) {
            this.channel?.ack(msg);
          } else {
            // Check if we should retry
            const shouldRetry = this.shouldRetry(job, result);
            if (shouldRetry) {
              await this.scheduleRetry(job);
              this.channel?.ack(msg); // Ack original, we've scheduled retry
            } else {
              // Send to DLQ
              this.channel?.nack(msg, false, false);
            }
          }
        } catch (error) {
          this.logger.error('Failed to process Webhook job', (error as Error).stack);
          this.channel?.nack(msg, false, false);
        }
      });

      this.logger.log('Webhook Queue Consumer started');
    } catch (error) {
      this.logger.error('Failed to setup Webhook consumer', (error as Error).stack);
    }
  }

  /**
   * Process a single webhook call
   */
  private async processWebhook(job: WebhookJob): Promise<WebhookResult> {
    const startTime = Date.now();
    const timeout = job.timeout || 10000;

    this.logger.debug(`Sending webhook to ${job.url} (attempt ${(job.retryCount || 0) + 1})`);

    try {
      const response = await axios({
        method: job.method.toLowerCase() as any,
        url: job.url,
        data: job.method !== 'GET' ? job.payload : undefined,
        params: job.method === 'GET' ? job.payload : undefined,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CRM-Webhook/1.0',
          'X-Webhook-Source': job.sourceType || 'crm',
          'X-Webhook-ID': job.sourceId || '',
          ...job.headers,
        },
        timeout,
        validateStatus: (status) => status < 500, // 4xx are not retried
      });

      const responseTime = Date.now() - startTime;

      if (response.status >= 200 && response.status < 300) {
        this.logger.debug(`Webhook success: ${job.url} (${response.status}) in ${responseTime}ms`);
        return {
          success: true,
          statusCode: response.status,
          responseTime,
        };
      } else {
        // 4xx errors - don't retry
        this.logger.warn(`Webhook client error: ${job.url} (${response.status})`);
        return {
          success: false,
          statusCode: response.status,
          responseTime,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      const responseTime = Date.now() - startTime;

      if (axiosError.code === 'ECONNABORTED') {
        this.logger.warn(`Webhook timeout: ${job.url} after ${timeout}ms`);
        return {
          success: false,
          responseTime,
          error: 'Timeout',
        };
      }

      if (axiosError.response) {
        // 5xx server errors - should retry
        this.logger.warn(`Webhook server error: ${job.url} (${axiosError.response.status})`);
        return {
          success: false,
          statusCode: axiosError.response.status,
          responseTime,
          error: `HTTP ${axiosError.response.status}`,
        };
      }

      // Network errors - should retry
      this.logger.warn(`Webhook network error: ${job.url} - ${axiosError.message}`);
      return {
        success: false,
        responseTime,
        error: axiosError.message,
      };
    }
  }

  /**
   * Determine if webhook should be retried
   */
  private shouldRetry(job: WebhookJob, result: WebhookResult): boolean {
    const currentRetry = job.retryCount || 0;
    const maxRetries = job.maxRetries || 3;

    // Don't retry if max retries reached
    if (currentRetry >= maxRetries) {
      this.logger.warn(`Webhook ${job.url} failed permanently after ${maxRetries} retries`);
      return false;
    }

    // Don't retry 4xx errors (client errors)
    if (result.statusCode && result.statusCode >= 400 && result.statusCode < 500) {
      this.logger.warn(`Webhook ${job.url} failed with client error ${result.statusCode}, not retrying`);
      return false;
    }

    // Retry 5xx errors, timeouts, and network errors
    return true;
  }

  /**
   * Schedule webhook retry with exponential backoff
   */
  private async scheduleRetry(job: WebhookJob): Promise<void> {
    const retryCount = (job.retryCount || 0) + 1;
    const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s, 16s

    const retryJob: WebhookJob = {
      ...job,
      retryCount,
    };

    this.logger.debug(`Scheduling webhook retry ${retryCount} for ${job.url} in ${delay}ms`);

    // Use setTimeout for delay, then publish via channel
    setTimeout(() => {
      this.publishToQueue(QUEUE_NAMES.WEBHOOK, retryJob);
    }, delay);
  }

  /**
   * Publish message to queue via amqplib channel
   */
  private publishToQueue(queue: string, message: WebhookJob): void {
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
      this.logger.log('Webhook Queue Consumer stopped');
    } catch (error) {
      this.logger.error('Error closing Webhook consumer', (error as Error).stack);
    }
  }
}
