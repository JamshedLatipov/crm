import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { SmsProviderConfig } from '../../entities/sms-provider-config.entity';
import { BaseSmsProvider } from './base-sms-provider';
import {
  SendSmsParams,
  SendSmsResult,
  ProviderCapabilities,
} from './sms-provider.interface';

/**
 * Универсальный HTTP провайдер для любых REST API
 * Использует динамический маппинг полей из конфига
 */
export class GenericHttpProvider extends BaseSmsProvider {
  constructor(config: SmsProviderConfig, configService: ConfigService) {
    super(config, configService);
  }

  /**
   * Отправка SMS через универсальный HTTP API
   */
  async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    return this.retryOperation(async () => {
      try {
        const { config } = this.config;
        const credentials = this.getCredentials();

        // Строим тело запроса согласно маппингу
        const requestBody = this.buildRequestBody(params, credentials);

        // Логируем запрос (без паролей)
        this.logger.log(`Sending SMS to ${params.phoneNumber} via ${this.config.name}`);

        // Отправляем запрос
        const response = await this.sendRequest(
          config.endpoints.send,
          requestBody,
          config.requestMethod,
          config.requestFormat
        );

        // Парсим ответ
        return this.parseResponse(response.data);
      } catch (error) {
        this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
        return {
          success: false,
          provider: this.config.name,
          error: error.message,
          errorCode: error.response?.status?.toString(),
        };
      }
    });
  }

  /**
   * Построение тела запроса с маппингом полей
   */
  private buildRequestBody(
    params: SendSmsParams,
    credentials: Record<string, string>
  ): Record<string, any> {
    const { fieldMapping, customLogic } = this.config.config;
    const body: Record<string, any> = {};

    // Маппим номер телефона
    if (fieldMapping.phone) {
      let phone = params.phoneNumber;
      // Применяем форматирование если указано
      if (customLogic?.phoneFormat) {
        phone = this.formatPhone(phone, customLogic.phoneFormat);
      }
      body[fieldMapping.phone] = phone;
    }

    // Маппим сообщение
    if (fieldMapping.message) {
      body[fieldMapping.message] = params.message;
    }

    // Маппим отправителя (если есть)
    if (fieldMapping.sender && params.sender) {
      body[fieldMapping.sender] = params.sender;
    }

    // Маппим login
    if (fieldMapping.login && credentials.login) {
      body[fieldMapping.login] = credentials.login;
    }

    // Маппим password с возможным MD5 хешированием
    if (fieldMapping.password && credentials.password) {
      let password = credentials.password;
      if (customLogic?.md5Password) {
        password = this.md5Hash(password);
      }
      body[fieldMapping.password] = password;
    }

    return body;
  }

  /**
   * Отправка HTTP запроса
   */
  private async sendRequest(
    endpoint: string,
    data: Record<string, any>,
    method: string,
    format: string
  ): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : endpoint;

    switch (format) {
      case 'json':
        return method === 'POST'
          ? this.httpClient.post(url, data)
          : this.httpClient.get(url, { params: data });

      case 'form':
        const formData = new URLSearchParams(data as any).toString();
        return this.httpClient.post(url, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

      case 'query':
        return this.httpClient.get(url, { params: data });

      default:
        throw new Error(`Unsupported request format: ${format}`);
    }
  }

  /**
   * Парсинг ответа провайдера
   */
  private parseResponse(data: any): SendSmsResult {
    const { responseMapping } = this.config.config;

    // Проверяем успешность запроса
    let success = true;
    if (responseMapping.successField) {
      const successValue = this.getNestedValue(data, responseMapping.successField);
      if (responseMapping.successValue !== undefined) {
        success = successValue === responseMapping.successValue;
      } else {
        success = !!successValue;
      }
    }

    // Получаем ID сообщения
    const messageId = this.getNestedValue(data, responseMapping.messageIdField);

    // Получаем ошибку (если есть)
    let error: string | undefined;
    if (responseMapping.errorField && !success) {
      error = this.getNestedValue(data, responseMapping.errorField);
    }

    return {
      success,
      messageId: messageId?.toString(),
      provider: this.config.name,
      error,
      metadata: { rawResponse: data },
    };
  }

  /**
   * Получить значение по вложенному ключу (поддержка dot notation)
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Форматирование номера телефона
   */
  private formatPhone(phone: string, format: string): string {
    // Удаляем все нецифровые символы
    const digits = phone.replace(/\D/g, '');

    // Применяем формат (пример: "+992XXXXXXXXX")
    // В будущем можно сделать более гибкую логику
    if (format.startsWith('+')) {
      return `+${digits}`;
    }

    return digits;
  }

  /**
   * MD5 хеширование
   */
  private md5Hash(text: string): string {
    return createHash('md5').update(text).digest('hex');
  }

  /**
   * Возможности провайдера
   */
  getCapabilities(): ProviderCapabilities {
    return {
      supportsSender: !!this.config.config.fieldMapping.sender,
      supportsBalance: !!this.config.config.endpoints.balance,
      supportsDeliveryStatus: !!this.config.config.endpoints.status,
      supportsWebhook: !!this.config.webhookConfig?.enabled,
      maxMessageLength: 1000, // По умолчанию
    };
  }
}
