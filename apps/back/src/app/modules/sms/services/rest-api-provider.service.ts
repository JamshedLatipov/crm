import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  retryCount?: number;
}

export interface WebhookPayload {
  event: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface WebhookConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'basic' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

@Injectable()
export class RestApiProviderService {
  private readonly logger = new Logger(RestApiProviderService.name);
  private readonly httpClient: AxiosInstance;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('FEATURE_WEBHOOK_ENABLED', true);

    if (!this.isEnabled) {
      this.logger.warn('Webhook provider is disabled. Set FEATURE_WEBHOOK_ENABLED=true to enable.');
    }

    this.httpClient = axios.create({
      timeout: this.configService.get<number>('WEBHOOK_TIMEOUT', 10000),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-System-Webhook/1.0',
      },
    });
  }

  /**
   * Отправка webhook уведомления
   */
  async sendWebhook(
    config: WebhookConfig,
    payload: WebhookPayload
  ): Promise<WebhookResult> {
    if (!this.isEnabled) {
      this.logger.warn('Webhook sending is disabled');
      return {
        success: false,
        error: 'Webhook provider is disabled',
      };
    }

    const maxRetries = config.retries || 3;
    const retryDelay = config.retryDelay || 1000;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Sending webhook to ${config.url} (attempt ${attempt + 1}/${maxRetries + 1})`
        );

        const requestConfig = this.buildRequestConfig(config, payload);
        const response = await this.httpClient.request(requestConfig);

        this.logger.log(
          `Webhook sent successfully: ${response.status} ${response.statusText}`
        );

        return {
          success: true,
          statusCode: response.status,
          response: response.data,
          retryCount: attempt,
        };
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Webhook attempt ${attempt + 1} failed: ${error.message}`
        );

        // Если это не последняя попытка, ждём перед следующей
        if (attempt < maxRetries) {
          await this.delay(retryDelay * (attempt + 1)); // Экспоненциальная задержка
        }
      }
    }

    // Все попытки провалились
    this.logger.error(`Webhook failed after ${maxRetries + 1} attempts`, lastError.stack);

    return {
      success: false,
      error: lastError.message,
      statusCode: lastError.response?.status,
      retryCount: maxRetries,
    };
  }

  /**
   * Построение конфигурации запроса
   */
  private buildRequestConfig(
    config: WebhookConfig,
    payload: WebhookPayload
  ): AxiosRequestConfig {
    const requestConfig: AxiosRequestConfig = {
      url: config.url,
      method: config.method || 'POST',
      headers: { ...config.headers },
      timeout: config.timeout || 10000,
    };

    // Добавляем данные в зависимости от метода
    if (['POST', 'PUT', 'PATCH'].includes(requestConfig.method)) {
      requestConfig.data = payload;
    } else if (requestConfig.method === 'GET') {
      requestConfig.params = payload;
    }

    // Настраиваем аутентификацию
    if (config.auth) {
      this.setupAuthentication(requestConfig, config.auth);
    }

    return requestConfig;
  }

  /**
   * Настройка аутентификации
   */
  private setupAuthentication(
    requestConfig: AxiosRequestConfig,
    auth: WebhookConfig['auth']
  ): void {
    switch (auth.type) {
      case 'bearer':
        requestConfig.headers['Authorization'] = `Bearer ${auth.token}`;
        break;

      case 'basic':
        requestConfig.auth = {
          username: auth.username,
          password: auth.password,
        };
        break;

      case 'apikey':
        const headerName = auth.apiKeyHeader || 'X-API-Key';
        requestConfig.headers[headerName] = auth.apiKey;
        break;
    }
  }

  /**
   * Отправка уведомления о событии
   */
  async sendEventNotification(
    webhookUrl: string,
    event: string,
    data: any,
    config?: Partial<WebhookConfig>
  ): Promise<WebhookResult> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date(),
      data,
      metadata: {
        source: 'crm-system',
        version: '1.0',
      },
    };

    return this.sendWebhook(
      {
        url: webhookUrl,
        method: 'POST',
        ...config,
      },
      payload
    );
  }

  /**
   * Массовая отправка webhook'ов
   */
  async sendBulkWebhooks(
    webhooks: Array<{
      config: WebhookConfig;
      payload: WebhookPayload;
    }>,
    parallel: boolean = false
  ): Promise<WebhookResult[]> {
    if (parallel) {
      // Параллельная отправка
      return Promise.all(
        webhooks.map((webhook) =>
          this.sendWebhook(webhook.config, webhook.payload)
        )
      );
    } else {
      // Последовательная отправка
      const results: WebhookResult[] = [];
      for (const webhook of webhooks) {
        const result = await this.sendWebhook(webhook.config, webhook.payload);
        results.push(result);
      }
      return results;
    }
  }

  /**
   * Отправка уведомления о кампании
   */
  async notifyCampaignEvent(
    webhookUrl: string,
    campaignId: string,
    event: 'started' | 'completed' | 'failed' | 'paused',
    stats?: any
  ): Promise<WebhookResult> {
    return this.sendEventNotification(
      webhookUrl,
      `campaign.${event}`,
      {
        campaignId,
        stats,
      }
    );
  }

  /**
   * Отправка уведомления о сообщении
   */
  async notifyMessageEvent(
    webhookUrl: string,
    messageId: string,
    event: 'sent' | 'delivered' | 'failed',
    details?: any
  ): Promise<WebhookResult> {
    return this.sendEventNotification(
      webhookUrl,
      `message.${event}`,
      {
        messageId,
        details,
      }
    );
  }

  /**
   * Проверка доступности webhook URL
   */
  async testWebhook(config: WebhookConfig): Promise<WebhookResult> {
    const testPayload: WebhookPayload = {
      event: 'webhook.test',
      timestamp: new Date(),
      data: {
        message: 'This is a test webhook',
      },
    };

    return this.sendWebhook(config, testPayload);
  }

  /**
   * Валидация webhook URL
   */
  validateWebhookUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Задержка выполнения
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Отправка с пользовательскими заголовками
   */
  async sendWithCustomHeaders(
    url: string,
    payload: any,
    headers: Record<string, string>
  ): Promise<WebhookResult> {
    return this.sendWebhook(
      {
        url,
        method: 'POST',
        headers,
      },
      {
        event: 'custom',
        timestamp: new Date(),
        data: payload,
      }
    );
  }
}
