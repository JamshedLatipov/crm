import { Injectable, Logger } from '@nestjs/common';
import { SmsProviderService, SendSmsResult } from './sms-provider.service';
import { EmailProviderService, SendEmailResult } from './email-provider.service';
import { RestApiProviderService, WebhookResult } from './rest-api-provider.service';
import { WhatsAppProviderService, SendWhatsAppResult } from './whatsapp-provider.service';
import { TelegramProviderService, SendTelegramResult } from './telegram-provider.service';

// Используем единый enum MessageChannel из message-queue.service
import { MessageChannelType } from '../entities/message-campaign.entity';

export interface NotificationPayload {
  channel: MessageChannelType;
  recipient: string;
  subject?: string;
  message: string;
  template?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  channel: MessageChannelType;
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

export interface MultiChannelPayload {
  channels: MessageChannelType[];
  sms?: {
    phoneNumber: string;
    message: string;
  };
  email?: {
    to: string;
    subject: string;
    html: string;
  };
  webhook?: {
    url: string;
    event: string;
    data: any;
  };
  variables?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private smsProvider: SmsProviderService,
    private emailProvider: EmailProviderService,
    private restApiProvider: RestApiProviderService,
    private whatsappProvider: WhatsAppProviderService,
    private telegramProvider: TelegramProviderService
  ) {}

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    this.logger.log(`Sending notification via ${payload.channel} to ${payload.recipient}`);

    try {
      switch (payload.channel) {
        case MessageChannelType.SMS:
          return await this.sendSms(payload);
        case MessageChannelType.EMAIL:
          return await this.sendEmail(payload);
        case MessageChannelType.WHATSAPP:
          return await this.sendWhatsApp(payload);
        case MessageChannelType.TELEGRAM:
          return await this.sendTelegram(payload);
        case MessageChannelType.WEBHOOK:
          return await this.sendWebhook(payload);
        default:
          throw new Error(`Unsupported channel: ${payload.channel}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`, error.stack);
      return {
        channel: payload.channel,
        success: false,
        error: error.message,
      };
    }
  }

  private async sendSms(payload: NotificationPayload): Promise<NotificationResult> {
    const message = payload.template && payload.variables
      ? this.renderTemplate(payload.template, payload.variables)
      : payload.message;

    const result: SendSmsResult = await this.smsProvider.sendSms(payload.recipient, message);

    return {
      channel: MessageChannelType.SMS,
      success: result.success,
      messageId: result.providerId,
      error: result.error,
      details: { cost: result.cost, segmentsCount: result.segmentsCount },
    };
  }

  private async sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
    const html = payload.template && payload.variables
      ? this.renderTemplate(payload.template, payload.variables)
      : payload.message;

    const result: SendEmailResult = await this.emailProvider.sendEmail({
      to: payload.recipient,
      subject: payload.subject || 'Notification',
      html,
      campaignId: payload.metadata?.campaignId,
      contactId: payload.metadata?.contactId,
      leadId: payload.metadata?.leadId,
      recipientName: payload.metadata?.recipientName,
      metadata: payload.metadata,
    });

    return {
      channel: MessageChannelType.EMAIL,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      details: {
        rejectedRecipients: result.rejectedRecipients,
        emailMessageId: result.emailMessageId,
      },
    };
  }

  private async sendWebhook(payload: NotificationPayload): Promise<NotificationResult> {
    const webhookPayload = {
      event: payload.metadata?.event || 'notification',
      timestamp: new Date(),
      data: { message: payload.message, ...payload.variables },
      metadata: payload.metadata,
    };

    const result: WebhookResult = await this.restApiProvider.sendWebhook(
      { url: payload.recipient, method: 'POST' },
      webhookPayload
    );

    return {
      channel: MessageChannelType.WEBHOOK,
      success: result.success,
      error: result.error,
      details: {
        statusCode: result.statusCode,
        response: result.response,
        retryCount: result.retryCount,
      },
    };
  }

  private async sendWhatsApp(payload: NotificationPayload): Promise<NotificationResult> {
    const message = payload.template && payload.variables
      ? this.renderTemplate(payload.template, payload.variables)
      : payload.message;

    const result: SendWhatsAppResult = await this.whatsappProvider.sendMessage(payload.recipient, message);

    return {
      channel: MessageChannelType.WHATSAPP,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      details: { errorCode: result.errorCode },
    };
  }

  private async sendTelegram(payload: NotificationPayload): Promise<NotificationResult> {
    const message = payload.template && payload.variables
      ? this.renderTemplate(payload.template, payload.variables)
      : payload.message;

    const result: SendTelegramResult = await this.telegramProvider.sendMessage(payload.recipient, message);

    return {
      channel: MessageChannelType.TELEGRAM,
      success: result.success,
      messageId: result.messageId?.toString(),
      error: result.error,
      details: { errorCode: result.errorCode },
    };
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, value?.toString() || '');
    }
    return rendered;
  }

  /**
   * Мультиканальная отправка (SMS + Email + Webhook одновременно)
   */
  async sendMultiChannel(payload: MultiChannelPayload): Promise<NotificationResult[]> {
    const tasks: Promise<NotificationResult>[] = [];

    // SMS
    if (payload.channels.includes(MessageChannelType.SMS) && payload.sms) {
      tasks.push(
        this.send({
          channel: MessageChannelType.SMS,
          recipient: payload.sms.phoneNumber,
          message: payload.sms.message,
          variables: payload.variables,
        })
      );
    }

    // Email
    if (payload.channels.includes(MessageChannelType.EMAIL) && payload.email) {
      tasks.push(
        this.send({
          channel: MessageChannelType.EMAIL,
          recipient: payload.email.to,
          subject: payload.email.subject,
          message: payload.email.html,
          variables: payload.variables,
        })
      );
    }

    // Webhook
    if (payload.channels.includes(MessageChannelType.WEBHOOK) && payload.webhook) {
      tasks.push(
        this.send({
          channel: MessageChannelType.WEBHOOK,
          recipient: payload.webhook.url,
          message: '',
          metadata: {
            event: payload.webhook.event,
            data: payload.webhook.data,
          },
          variables: payload.variables,
        })
      );
    }

    // Отправляем все параллельно
    const results = await Promise.allSettled(tasks);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          channel: payload.channels[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }

  /**
   * Массовая отправка по одному каналу
   */
  async sendBulk(
    channel: MessageChannelType,
    notifications: Array<{
      recipient: string;
      message: string;
      subject?: string;
      variables?: Record<string, any>;
    }>
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const notification of notifications) {
      const result = await this.send({
        channel,
        recipient: notification.recipient,
        message: notification.message,
        subject: notification.subject,
        variables: notification.variables,
      });

      results.push(result);
    }

    return results;
  }

  /**
   * Проверка доступности каналов
   */
  async checkChannelsHealth(): Promise<Partial<Record<MessageChannelType, boolean>>> {
    const [smsHealth, emailHealth, whatsappHealth, telegramHealth, webhookHealth] = await Promise.allSettled([
      this.smsProvider.checkBalance().then(() => true).catch(() => false),
      this.emailProvider.verifyConnection(),
      this.whatsappProvider.checkHealth(),
      this.telegramProvider.checkHealth(),
      Promise.resolve(true), // Webhook всегда доступен
    ]);

    return {
      [MessageChannelType.SMS]: smsHealth.status === 'fulfilled' && smsHealth.value,
      [MessageChannelType.EMAIL]: emailHealth.status === 'fulfilled' && emailHealth.value,
      [MessageChannelType.WHATSAPP]: whatsappHealth.status === 'fulfilled' && whatsappHealth.value,
      [MessageChannelType.TELEGRAM]: telegramHealth.status === 'fulfilled' && telegramHealth.value,
      [MessageChannelType.WEBHOOK]: webhookHealth.status === 'fulfilled' && webhookHealth.value,
    };
  }

  /**
   * Получение статистики отправки
   */
  getChannelStats(): {
    sms: { available: boolean };
    email: { available: boolean };
    whatsapp: { available: boolean };
    telegram: { available: boolean };
    webhook: { available: boolean };
  } {
    return {
      sms: { available: true },
      email: { available: true },
      whatsapp: { available: true },
      telegram: { available: true },
      webhook: { available: true },
    };
  }
}
