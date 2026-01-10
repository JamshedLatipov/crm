import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES } from '../queue.constants';
import { TelegramMessage, TelegramMessageStatus, TelegramMessageType } from '../../messages/entities/telegram-message.entity';
import { TelegramTemplate } from '../../messages/entities/telegram-template.entity';
import { TelegramProviderService } from '../../messages/services/telegram-provider.service';
import { TemplateRenderService } from '../../messages/services/template-render.service';
import { MessageCampaign } from '../../messages/entities/message-campaign.entity';
import { getRabbitMqUrl } from '../rabbitmq.utils';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { QueuedMessage } from '../../messages/services/message-queue.service';

@Injectable()
export class TelegramQueueConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramQueueConsumer.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    @InjectRepository(TelegramMessage)
    private readonly messageRepo: Repository<TelegramMessage>,
    @InjectRepository(TelegramTemplate)
    private readonly templateRepo: Repository<TelegramTemplate>,
    private readonly configService: ConfigService,
    private readonly telegramProvider: TelegramProviderService,
    private readonly templateRender: TemplateRenderService,
  ) {}

  async onModuleInit() {
    await this.setupConsumer();
  }

  private async setupConsumer() {
    try {
      const rmqUrl = getRabbitMqUrl(this.configService);
      this.connection = await amqp.connect(rmqUrl);
      this.channel = await this.connection.createChannel();

      // Setup Telegram queue
      await this.channel.assertQueue(QUEUE_NAMES.TELEGRAM, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': QUEUE_NAMES.DLQ,
        },
      });

      // Set prefetch for controlled parallelism
      await this.channel.prefetch(5);

      // Start consuming
      await this.channel.consume(QUEUE_NAMES.TELEGRAM, async (msg) => {
        if (!msg) return;

        try {
          const job: QueuedMessage = JSON.parse(msg.content.toString());
          await this.processMessage(job);
          this.channel?.ack(msg);
        } catch (error) {
          this.logger.error('Failed to process Telegram message', (error as Error).stack);
          this.channel?.nack(msg, false, false);
        }
      });

      this.logger.log('Telegram Queue Consumer started');
    } catch (error) {
      this.logger.error('Failed to setup Telegram consumer', (error as Error).stack);
    }
  }

  private async processMessage(data: QueuedMessage) {
    this.logger.log(`Processing Telegram message: ${data.id}`);

    try {
      // 1. Загружаем шаблон
      const template = await this.templateRepo.findOne({
        where: { id: data.templateId },
      });

      if (!template) {
        throw new Error(`Telegram template not found: ${data.templateId}`);
      }

      // 2. Загружаем контекст для переменных
      const ctx = await this.templateRender.loadContext({
        contactId: data.recipient.contactId,
        leadId: data.recipient.leadId,
        dealId: data.recipient.dealId,
        companyId: data.recipient.companyId,
      });

      // 3. Рендерим шаблон с переменными
      const message = await this.templateRender.renderTemplate(
        template.content,
        ctx,
      );

      // 4. Определяем chat ID
      const chatId = data.recipient.chatId;

      if (!chatId) {
        throw new Error('Telegram chat ID not found for recipient');
      }

      // 5. Отправляем через провайдера
      const result = await this.telegramProvider.sendMessage(chatId, message);

      // 6. Сохраняем в БД для истории
      await this.messageRepo.save({
        chatId,
        content: message,
        messageType: TelegramMessageType.TEXT,
        status: TelegramMessageStatus.SENT,
        sentAt: new Date(),
        queuedAt: data.queuedAt,
        campaign: data.metadata?.campaignId
          ? ({ id: data.metadata.campaignId } as MessageCampaign)
          : null,
        contact: ctx.contact || null,
        lead: ctx.lead || null,
        metadata: {
          messageId: result.messageId,
          templateName: template.name,
          retryCount: data.retryCount,
        },
      });

      this.logger.log(`Telegram message sent successfully: ${data.id}`);
    } catch (error) {
      this.logger.error(`Telegram message failed: ${data.id}`, error.stack);

      // Сохраняем как failed
      const template = await this.templateRepo.findOne({
        where: { id: data.templateId },
      });

      await this.messageRepo.save({
        chatId: data.recipient.chatId || 'unknown',
        content: template?.content || '',
        messageType: TelegramMessageType.TEXT,
        status: TelegramMessageStatus.FAILED,
        failedAt: new Date(),
        queuedAt: data.queuedAt,
        metadata: {
          error: error.message,
          retryCount: data.retryCount,
        },
      });

      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('Telegram Queue Consumer stopped');
    } catch (error) {
      this.logger.error('Error closing Telegram consumer', (error as Error).stack);
    }
  }
}
