import { Injectable, Logger } from '@nestjs/common';
import { SmsProviderService, SendSmsResult } from './sms-provider.service';
import { EmailProviderService, SendEmailResult } from './email-provider.service';
import { RestApiProviderService, WebhookResult } from './rest-api-provider.service';

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
}

export interface NotificationPayload {
  channel: NotificationChannel;
  recipient: string; // Телефон, email или webhook URL
  subject?: string; // Для email
  message: string; // Текст или HTML
  template?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

export interface MultiChannelPayload {
  channels: NotificationChannel[];
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

/**
 * Unified Notification Service
 * Единый интерфейс для отправки уведомлений через SMS, Email и Webhooks
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private smsProvider: SmsProviderService,
    private emailProvider: EmailProviderService,
    private restApiProvider: RestApiProviderService
  ) {}

  /**
   * Отправка уведомления через один канал
   */
  async send(payload: NotificationPayload): Promise<NotificationResult> {
    this.logger.log(`Sending notification via ${payload.channel} to ${payload.recipient}`);

    try {
      switch (payload.channel) {
        case NotificationChannel.SMS:
          return await this.sendSms(payload);

        case NotificationChannel.EMAIL:
          return await this.sendEmail(payload);

        case NotificationChannel.WEBHOOK:
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

  /**
   * Отправка через SMS
   */
  private async sendSms(payload: NotificationPayload): Promise<NotificationResult> {
    const message = payload.template && payload.variables
      ? this.renderTemplate(payload.template, payload.variables)
      : payload.message;

    const result: SendSmsResult = await this.smsProvider.sendSms(
      payload.recipient,
      message
    );

    return {
      channel: NotificationChannel.SMS,
      success: result.success,
      messageId: result.providerId,
      error: result.error,
      details: {
        cost: result.cost,
        segmentsCount: result.segmentsCount,
      },
    };
  }

  /**
   * Отправка через Email
   */
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
      channel: NotificationChannel.EMAIL,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      details: {
        rejectedRecipients: result.rejectedRecipients,
        emailMessageId: result.emailMessageId,
      },
    };
  }

  /**
   * Отправка через Webhook
   */
  private async sendWebhook(payload: NotificationPayload): Promise<NotificationResult> {
    const webhookPayload = {
      event: payload.metadata?.event || 'notification',
      timestamp: new Date(),
      data: {
        message: payload.message,
        ...payload.variables,
      },
      metadata: payload.metadata,
    };

    const result: WebhookResult = await this.restApiProvider.sendWebhook(
      {
        url: payload.recipient,
        method: 'POST',
      },
      webhookPayload
    );

    return {
      channel: NotificationChannel.WEBHOOK,
      success: result.success,
      error: result.error,
      details: {
        statusCode: result.statusCode,
        response: result.response,
        retryCount: result.retryCount,
      },
    };
  }

  /**
   * Мультиканальная отправка (SMS + Email + Webhook одновременно)
   */
  async sendMultiChannel(payload: MultiChannelPayload): Promise<NotificationResult[]> {
    const tasks: Promise<NotificationResult>[] = [];

    // SMS
    if (payload.channels.includes(NotificationChannel.SMS) && payload.sms) {
      tasks.push(
        this.send({
          channel: NotificationChannel.SMS,
          recipient: payload.sms.phoneNumber,
          message: payload.sms.message,
          variables: payload.variables,
        })
      );
    }

    // Email
    if (payload.channels.includes(NotificationChannel.EMAIL) && payload.email) {
      tasks.push(
        this.send({
          channel: NotificationChannel.EMAIL,
          recipient: payload.email.to,
          subject: payload.email.subject,
          message: payload.email.html,
          variables: payload.variables,
        })
      );
    }

    // Webhook
    if (payload.channels.includes(NotificationChannel.WEBHOOK) && payload.webhook) {
      tasks.push(
        this.send({
          channel: NotificationChannel.WEBHOOK,
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
    channel: NotificationChannel,
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
   * Отправка уведомления о событии кампании
   */
  async notifyCampaignEvent(
    campaignId: string,
    event: 'started' | 'completed' | 'paused' | 'failed',
    channels: NotificationChannel[],
    recipients: {
      sms?: string;
      email?: string;
      webhook?: string;
    },
    stats?: any
  ): Promise<NotificationResult[]> {
    const message = this.generateCampaignMessage(event, campaignId, stats);

    return this.sendMultiChannel({
      channels,
      sms: recipients.sms ? {
        phoneNumber: recipients.sms,
        message: message.text,
      } : undefined,
      email: recipients.email ? {
        to: recipients.email,
        subject: message.subject,
        html: message.html,
      } : undefined,
      webhook: recipients.webhook ? {
        url: recipients.webhook,
        event: `campaign.${event}`,
        data: { campaignId, stats },
      } : undefined,
    });
  }

  /**
   * Генерация сообщения о событии кампании
   */
  private generateCampaignMessage(
    event: string,
    campaignId: string,
    stats?: any
  ): { text: string; subject: string; html: string } {
    const eventMessages = {
      started: {
        subject: 'Campaign Started',
        text: `Campaign ${campaignId} has been started`,
        html: `<h2>Campaign Started</h2><p>Campaign <strong>${campaignId}</strong> has been started</p>`,
      },
      completed: {
        subject: 'Campaign Completed',
        text: `Campaign ${campaignId} has been completed. Sent: ${stats?.sentCount || 0}, Delivered: ${stats?.deliveredCount || 0}`,
        html: `<h2>Campaign Completed</h2>
               <p>Campaign <strong>${campaignId}</strong> has been completed</p>
               <ul>
                 <li>Sent: ${stats?.sentCount || 0}</li>
                 <li>Delivered: ${stats?.deliveredCount || 0}</li>
                 <li>Failed: ${stats?.failedCount || 0}</li>
               </ul>`,
      },
      paused: {
        subject: 'Campaign Paused',
        text: `Campaign ${campaignId} has been paused`,
        html: `<h2>Campaign Paused</h2><p>Campaign <strong>${campaignId}</strong> has been paused</p>`,
      },
      failed: {
        subject: 'Campaign Failed',
        text: `Campaign ${campaignId} has failed`,
        html: `<h2>Campaign Failed</h2><p>Campaign <strong>${campaignId}</strong> has failed</p>`,
      },
    };

    return eventMessages[event] || eventMessages.started;
  }

  /**
   * Рендеринг шаблона
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, value?.toString() || '');
    }

    return rendered;
  }

  /**
   * Проверка доступности каналов
   */
  async checkChannelsHealth(): Promise<Record<NotificationChannel, boolean>> {
    const [smsHealth, emailHealth, webhookHealth] = await Promise.allSettled([
      this.smsProvider.checkBalance().then(() => true).catch(() => false),
      this.emailProvider.verifyConnection(),
      Promise.resolve(true), // Webhook всегда доступен
    ]);

    return {
      [NotificationChannel.SMS]: smsHealth.status === 'fulfilled' && smsHealth.value,
      [NotificationChannel.EMAIL]: emailHealth.status === 'fulfilled' && emailHealth.value,
      [NotificationChannel.WEBHOOK]: webhookHealth.status === 'fulfilled' && webhookHealth.value,
    };
  }

  /**
   * Получение статистики отправки
   */
  getChannelStats(): {
    sms: { available: boolean };
    email: { available: boolean };
    webhook: { available: boolean };
  } {
    return {
      sms: { available: true },
      email: { available: true },
      webhook: { available: true },
    };
  }
}
