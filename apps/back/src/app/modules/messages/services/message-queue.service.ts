import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { MessageChannelType } from '../entities/message-campaign.entity';

export enum MessagePriority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

export interface QueuedMessage {
  id: string;
  channel: MessageChannelType;
  templateId: string;
  recipient: {
    contactId?: string;
    leadId?: number;
    dealId?: string;
    companyId?: string;
    phoneNumber?: string;
    email?: string;
    chatId?: string; // Для Telegram
  };
  priority: MessagePriority;
  scheduledAt?: Date;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, any>;
  queuedAt: Date;
}

export interface BulkSendResult {
  batchId: string;
  total: number;
  queued: number;
  failed: number;
  estimatedTime: number; // seconds
}

@Injectable()
export class MessageQueueService {
  private readonly logger = new Logger(MessageQueueService.name);

  constructor(
    @Inject('NOTIFICATION_QUEUE')
    private readonly client: ClientProxy,
  ) {}

  /**
   * Отправить одно сообщение в очередь
   */
  async queueNotification(
    notification: Omit<QueuedMessage, 'id' | 'queuedAt' | 'retryCount'>
  ): Promise<string> {
    const messageId = uuidv4();

    const payload: QueuedMessage = {
      ...notification,
      id: messageId,
      queuedAt: new Date(),
      retryCount: 0,
    };

    try {
      // Определяем имя очереди по каналу
      const queueName = this.getQueueNameByChannel(notification.channel);
      
      this.logger.log(`Queueing message ${messageId} to queue ${queueName}, channel: ${notification.channel}`);
      
      // Отправляем в RabbitMQ, routing key = имя очереди (для default exchange)
      await this.client.emit(queueName, payload).toPromise();

      this.logger.log(`Queued ${notification.channel} message: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Failed to queue message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Получить имя очереди по каналу
   */
  private getQueueNameByChannel(channel: MessageChannelType): string {
    switch (channel) {
      case MessageChannelType.WHATSAPP:
        return 'crm_whatsapp_queue';
      case MessageChannelType.TELEGRAM:
        return 'crm_telegram_queue';
      case MessageChannelType.SMS:
        return 'crm_sms_queue';
      case MessageChannelType.EMAIL:
        return 'crm_email_queue';
      case MessageChannelType.WEBHOOK:
        return 'crm_webhook_queue';
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Массовая отправка - ставим в очередь сразу много сообщений
   */
  async queueBulkSend(params: {
    channel: MessageChannelType;
    templateId: string;
    recipients: Array<{
      contactId?: string;
      leadId?: number;
      dealId?: string;
      phoneNumber?: string;
      email?: string;
      chatId?: string;
    }>;
    priority?: MessagePriority;
    scheduledAt?: Date;
  }): Promise<BulkSendResult> {
    const batchId = uuidv4();
    const {
      channel,
      templateId,
      recipients,
      priority = MessagePriority.NORMAL,
      scheduledAt,
    } = params;

    this.logger.log(
      `Starting bulk send: ${recipients.length} recipients via ${channel}`
    );

    let queued = 0;
    let failed = 0;

    // Отправляем батчами по 100 для эффективности
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      // Параллельно ставим в очередь каждое сообщение в батче
      const promises = batch.map(async (recipient) => {
        try {
          await this.queueNotification({
            channel,
            templateId,
            recipient,
            priority,
            scheduledAt,
            maxRetries: 3,
            metadata: {
              batchId,
              batchIndex: i + batch.indexOf(recipient),
            },
          });
          queued++;
        } catch (error) {
          this.logger.error(`Failed to queue message for recipient:`, error);
          failed++;
        }
      });

      await Promise.all(promises);

      // Небольшая задержка между батчами чтобы не перегрузить RabbitMQ
      if (i + batchSize < recipients.length) {
        await this.sleep(100);
      }
    }

    // Примерная оценка времени: 10 сообщений/сек с учетом rate limits
    const estimatedTime = Math.ceil(recipients.length / 10);

    this.logger.log(
      `Bulk send completed: ${queued} queued, ${failed} failed, batchId: ${batchId}`
    );

    return {
      batchId,
      total: recipients.length,
      queued,
      failed,
      estimatedTime,
    };
  }

  /**
   * Массовая отправка WhatsApp по списку контактов
   */
  async queueWhatsAppBulk(params: {
    templateId: string;
    contactIds: string[];
    priority?: MessagePriority;
  }): Promise<BulkSendResult> {
    const recipients = params.contactIds.map((contactId) => ({
      contactId,
    }));

    return this.queueBulkSend({
      channel: MessageChannelType.WHATSAPP,
      templateId: params.templateId,
      recipients,
      priority: params.priority,
    });
  }

  /**
   * Массовая отправка Telegram по списку контактов
   */
  async queueTelegramBulk(params: {
    templateId: string;
    contactIds: string[];
    priority?: MessagePriority;
  }): Promise<BulkSendResult> {
    const recipients = params.contactIds.map((contactId) => ({
      contactId,
    }));

    return this.queueBulkSend({
      channel: MessageChannelType.TELEGRAM,
      templateId: params.templateId,
      recipients,
      priority: params.priority,
    });
  }

  /**
   * Массовая отправка по сегменту (фильтр контактов)
   */
  async queueBySegment(params: {
    channel: MessageChannelType;
    templateId: string;
    segmentFilters: {
      tags?: string[];
      source?: string;
      assignedTo?: string;
      companyId?: string;
    };
    priority?: MessagePriority;
  }): Promise<BulkSendResult> {
    // Здесь нужно загрузить контакты по фильтрам
    // Пока заглушка - в реальности используйте ContactsService
    this.logger.warn('Segment filtering not implemented yet');

    return {
      batchId: uuidv4(),
      total: 0,
      queued: 0,
      failed: 0,
      estimatedTime: 0,
    };
  }

  /**
   * Отложенная отправка (scheduled)
   */
  async queueScheduled(params: {
    channel: MessageChannelType;
    templateId: string;
    recipients: Array<{ contactId: string }>;
    scheduledAt: Date;
  }): Promise<BulkSendResult> {
    return this.queueBulkSend({
      ...params,
      scheduledAt: params.scheduledAt,
    });
  }

  /**
   * Проверить статус очереди
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
  }> {
    // В production используйте RabbitMQ Management API
    // или храните статистику в Redis
    return {
      pending: 0,
      processing: 0,
      failed: 0,
    };
  }

  /**
   * Очистить очередь (для тестирования)
   */
  async purgeQueue(): Promise<void> {
    this.logger.warn('Purging notification queue');
    // Реализуется через RabbitMQ Management API
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
