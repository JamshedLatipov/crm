import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomerSyncService } from '../services/customer-sync.service';
import * as amqp from 'amqplib';

interface CustomerUpdatedEvent {
  customerId: string;
  phone?: string;
  name?: string;
  email?: string;
  company?: string;
  updatedFields: string[];
}

interface InventoryReservedEvent {
  orderId: string;
  customerId: string;
  items: Array<{
    partId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
}

@Injectable()
export class CrmEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(CrmEventConsumer.name);
  private connection: any;
  private channel: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly customerSyncService: CustomerSyncService,
  ) {}

  async onModuleInit() {
    await this.connect();
    await this.setupConsumers();
  }

  private async connect() {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      this.logger.log('Connected to RabbitMQ for consuming CRM events');

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

  private async setupConsumers() {
    try {
      // Consumer for customer_updated events from CRM
      await this.channel.assertQueue('crm_customer_updated', { durable: true });
      await this.channel.consume(
        'crm_customer_updated',
        async (msg: any) => {
          if (msg) {
            try {
              const event: CustomerUpdatedEvent = JSON.parse(msg.content.toString());
              await this.handleCustomerUpdated(event);
              this.channel.ack(msg);
            } catch (error: any) {
              this.logger.error('Error processing customer_updated event:', error?.message);
              this.channel.nack(msg, false, false); // Dead letter queue
            }
          }
        },
        { noAck: false },
      );

      // Consumer for inventory_reserved events from CRM
      await this.channel.assertQueue('crm_inventory_reserved', { durable: true });
      await this.channel.consume(
        'crm_inventory_reserved',
        async (msg: any) => {
          if (msg) {
            try {
              const event: InventoryReservedEvent = JSON.parse(msg.content.toString());
              await this.handleInventoryReserved(event);
              this.channel.ack(msg);
            } catch (error: any) {
              this.logger.error('Error processing inventory_reserved event:', error?.message);
              this.channel.nack(msg, false, false);
            }
          }
        },
        { noAck: false },
      );

      this.logger.log('RabbitMQ consumers setup completed');
    } catch (error: any) {
      this.logger.error('Failed to setup RabbitMQ consumers:', error?.message);
    }
  }

  private async handleCustomerUpdated(event: CustomerUpdatedEvent) {
    this.logger.log(`Handling customer_updated event: ${event.customerId}`);
    
    try {
      await this.customerSyncService.syncCustomerFromCrm(event.customerId);
      this.logger.log(`Customer cache updated: ${event.customerId}`);
    } catch (error: any) {
      this.logger.error(`Failed to sync customer ${event.customerId}:`, error?.message);
      throw error; // Re-throw to nack message
    }
  }

  private async handleInventoryReserved(event: InventoryReservedEvent) {
    this.logger.log(`Handling inventory_reserved event for order: ${event.orderId}`);
    
    try {
      // TODO: Update order with inventory reservation details
      // This will be implemented when order-inventory linking is added
      this.logger.log(`Inventory reserved for order ${event.orderId}: ${event.totalAmount}`);
    } catch (error: any) {
      this.logger.error(`Failed to process inventory reservation:`, error?.message);
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
      this.logger.log('RabbitMQ consumers disconnected');
    } catch (error: any) {
      this.logger.error('Error closing RabbitMQ connection:', error?.message);
    }
  }
}
