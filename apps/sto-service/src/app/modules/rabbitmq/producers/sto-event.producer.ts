import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { StoOrder } from '@libs/shared/sto-types';

interface StoOrderCreatedEvent {
  orderId: string;
  customerId?: string;
  phone: string;
  customerName?: string;
  zone: string;
  workType: string;
  queueNumber: number;
  status: string;
  createdAt: string;
}

interface StoNotificationRequestEvent {
  orderId: string;
  channel: 'SMS' | 'WhatsApp' | 'Email' | 'Telegram';
  recipient: string;
  message: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
}

interface StoOrderCompletedEvent {
  orderId: string;
  customerId?: string;
  completedAt: string;
  totalDuration: number; // minutes
  zone: string;
  workType: string;
}

@Injectable()
export class StoEventProducer implements OnModuleInit {
  private readonly logger = new Logger(StoEventProducer.name);
  private connection: any;
  private channel: any;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      this.logger.log('Connected to RabbitMQ for producing STO events');

      // Handle connection errors
      this.connection.on('error', (err: any) => {
        this.logger.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, attempting to reconnect...');
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error: any) {
      this.logger.error('Failed to connect to RabbitMQ:', error?.message);
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Publish sto_order_created event to CRM
   */
  async publishOrderCreated(order: StoOrder) {
    const event: StoOrderCreatedEvent = {
      orderId: order.id,
      customerId: order.customerId,
      phone: order.customerPhone,
      customerName: order.customerName,
      zone: order.zone,
      workType: order.workType,
      queueNumber: order.queueNumber,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    };

    await this.publishEvent('sto_order_created', event);
    this.logger.log(`Published sto_order_created event: ${order.id}`);
  }

  /**
   * Publish sto_order_completed event to CRM
   */
  async publishOrderCompleted(order: StoOrder) {
    const totalDuration = order.completedAt && order.startedAt
      ? Math.floor((order.completedAt.getTime() - order.startedAt.getTime()) / 60000)
      : 0;

    const event: StoOrderCompletedEvent = {
      orderId: order.id,
      customerId: order.customerId,
      completedAt: order.completedAt?.toISOString() || new Date().toISOString(),
      totalDuration,
      zone: order.zone,
      workType: order.workType,
    };

    await this.publishEvent('sto_order_completed', event);
    this.logger.log(`Published sto_order_completed event: ${order.id}`);
  }

  /**
   * Publish notification request to CRM MessagesModule
   */
  async publishNotificationRequest(
    orderId: string,
    channel: StoNotificationRequestEvent['channel'],
    recipient: string,
    message: string,
    priority: StoNotificationRequestEvent['priority'] = 'NORMAL',
  ) {
    const event: StoNotificationRequestEvent = {
      orderId,
      channel,
      recipient,
      message,
      priority,
    };

    await this.publishEvent('sto_notification_request', event);
    this.logger.log(`Published notification request: ${orderId} via ${channel} to ${recipient}`);
  }

  /**
   * Generic event publisher
   */
  private async publishEvent(queueName: string, event: any) {
    try {
      if (!this.channel) {
        this.logger.warn('RabbitMQ channel not ready, skipping event publish');
        return;
      }

      await this.channel.assertQueue(queueName, { durable: true });
      
      const message = Buffer.from(JSON.stringify(event));
      this.channel.sendToQueue(queueName, message, {
        persistent: true,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      this.logger.error(`Failed to publish event to ${queueName}:`, error?.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('RabbitMQ producer disconnected');
    } catch (error: any) {
      this.logger.error('Error closing RabbitMQ connection:', error?.message);
    }
  }
}
