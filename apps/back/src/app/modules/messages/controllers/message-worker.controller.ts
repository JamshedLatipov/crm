import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { TelegramTemplate } from '../entities/telegram-template.entity';
import {
  WhatsAppMessage,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
} from '../entities/whatsapp-message.entity';
import {
  TelegramMessage,
  TelegramMessageStatus,
  TelegramMessageType,
} from '../entities/telegram-message.entity';
import { MessageCampaign } from '../entities/message-campaign.entity';
import { WhatsAppProviderService } from '../services/whatsapp-provider.service';
import { TelegramProviderService } from '../services/telegram-provider.service';
import { TemplateRenderService } from '../services/template-render.service';
import { QueuedMessage } from '../services/message-queue.service';

/**
 * Worker для обработки очереди сообщений из RabbitMQ
 * Принимает сообщения из очереди, рендерит шаблоны и отправляет через провайдеры
 */
@Controller()
export class MessageWorkerController {
  private readonly logger = new Logger(MessageWorkerController.name);

  constructor(
    @InjectRepository(WhatsAppTemplate)
    private readonly whatsappTemplateRepo: Repository<WhatsAppTemplate>,

    @InjectRepository(TelegramTemplate)
    private readonly telegramTemplateRepo: Repository<TelegramTemplate>,

    @InjectRepository(WhatsAppMessage)
    private readonly whatsappMessageRepo: Repository<WhatsAppMessage>,

    @InjectRepository(TelegramMessage)
    private readonly telegramMessageRepo: Repository<TelegramMessage>,

    private readonly whatsappProvider: WhatsAppProviderService,
    private readonly telegramProvider: TelegramProviderService,
    private readonly templateRender: TemplateRenderService,
  ) {}

  /**
   * Обработка WhatsApp сообщений из очереди
   */
  @MessagePattern('whatsapp.send')
  async handleWhatsAppMessage(
    @Payload() data: QueuedMessage,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    this.logger.log(`Processing WhatsApp message: ${data.id}`);

    try {
      // 1. Загружаем шаблон
      const template = await this.whatsappTemplateRepo.findOne({
        where: { id: data.templateId },
      });

      if (!template) {
        throw new Error(`WhatsApp template not found: ${data.templateId}`);
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

      // 4. Определяем номер телефона
      const phoneNumber =
        data.recipient.phoneNumber ||
        ctx.contact?.phone ||
        ctx.lead?.phone;

      if (!phoneNumber) {
        throw new Error('Phone number not found for recipient');
      }

      // 5. Отправляем через провайдера
      const result = await this.whatsappProvider.sendMessage(phoneNumber, message);

      // 6. Сохраняем в БД для истории
      await this.whatsappMessageRepo.save({
        phoneNumber,
        content: message,
        messageType: WhatsAppMessageType.TEXT,
        status: WhatsAppMessageStatus.SENT,
        sentAt: new Date(),
        queuedAt: data.queuedAt,
        campaign: data.metadata?.campaignId
          ? ({ id: data.metadata.campaignId } as MessageCampaign)
          : null,
        contact: ctx.contact || null,
        lead: ctx.lead || null,
        metadata: {
          wamid: result.messageId,
          templateName: template.name,
          retryCount: data.retryCount,
        },
      });

      this.logger.log(`WhatsApp message sent successfully: ${data.id}`);

      // Подтверждаем обработку сообщения
      channel.ack(originalMsg);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`WhatsApp message failed: ${data.id}`, error.stack);

      // Retry logic
      if (data.retryCount < data.maxRetries) {
        this.logger.log(
          `Retrying WhatsApp message: ${data.id} (attempt ${data.retryCount + 1})`,
        );

        // Возвращаем в очередь с увеличенным счетчиком
        channel.nack(originalMsg, false, true); // requeue=true
      } else {
        this.logger.error(`WhatsApp message exhausted retries: ${data.id}`);

        // Загружаем шаблон для сохранения в failed
        const template = await this.whatsappTemplateRepo.findOne({
          where: { id: data.templateId },
        });

        // Сохраняем как failed
        await this.whatsappMessageRepo.save({
          phoneNumber: data.recipient.phoneNumber || 'unknown',
          content: template?.content || '',
          messageType: WhatsAppMessageType.TEXT,
          status: WhatsAppMessageStatus.FAILED,
          failedAt: new Date(),
          queuedAt: data.queuedAt,
          metadata: {
            error: error.message,
            templateName: template?.name,
            retryCount: data.retryCount,
          },
        });

        // Подтверждаем чтобы убрать из очереди
        channel.ack(originalMsg);
      }

      throw error;
    }
  }

  /**
   * Обработка Telegram сообщений из очереди
   */
  @MessagePattern('telegram.send')
  async handleTelegramMessage(
    @Payload() data: QueuedMessage,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    this.logger.log(`Processing Telegram message: ${data.id}`);

    try {
      // 1. Загружаем шаблон
      const template = await this.telegramTemplateRepo.findOne({
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
        throw new Error('Chat ID not found for recipient');
      }

      // 5. Отправляем через провайдера
      const result = await this.telegramProvider.sendMessage(chatId, message);

      // 6. Сохраняем в БД для истории
      await this.telegramMessageRepo.save({
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
          retryCount: data.retryCount,
        },
      });

      this.logger.log(`Telegram message sent successfully: ${data.id}`);

      // Подтверждаем обработку сообщения
      channel.ack(originalMsg);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Telegram message failed: ${data.id}`, error.stack);

      // Retry logic
      if (data.retryCount < data.maxRetries) {
        this.logger.log(
          `Retrying Telegram message: ${data.id} (attempt ${data.retryCount + 1})`,
        );

        // Возвращаем в очередь с увеличенным счетчиком
        channel.nack(originalMsg, false, true); // requeue=true
      } else {
        this.logger.error(`Telegram message exhausted retries: ${data.id}`);

        // Загружаем шаблон для сохранения в failed
        const template = await this.telegramTemplateRepo.findOne({
          where: { id: data.templateId },
        });

        // Сохраняем как failed
        await this.telegramMessageRepo.save({
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

        // Подтверждаем чтобы убрать из очереди
        channel.ack(originalMsg);
      }

      throw error;
    }
  }
}
