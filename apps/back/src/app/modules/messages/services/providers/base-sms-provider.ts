import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SmsProviderConfig } from '../../entities/sms-provider-config.entity';
import {
  SmsProviderInterface,
  SendSmsParams,
  SendSmsResult,
  BalanceResult,
  DeliveryStatus,
  ProviderCapabilities,
} from './sms-provider.interface';

/**
 * Базовый класс для всех SMS-провайдеров
 * Содержит общую логику: retry, логирование, обработка ошибок
 */
export abstract class BaseSmsProvider implements SmsProviderInterface {
  protected readonly logger: Logger;
  protected readonly httpClient: AxiosInstance;
  protected readonly config: SmsProviderConfig;
  protected readonly configService: ConfigService;

  constructor(config: SmsProviderConfig, configService: ConfigService) {
    this.config = config;
    this.configService = configService;
    this.logger = new Logger(`${this.constructor.name}`);

    // Создаем HTTP клиент с базовой конфигурацией
    this.httpClient = axios.create({
      baseURL: config.config.baseUrl,
      timeout: config.settings?.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.config.headers || {}),
      },
    });

    // Логирование запросов
    this.httpClient.interceptors.request.use((request) => {
      this.logger.debug(`Request: ${request.method} ${request.url}`);
      return request;
    });

    // Логирование ответов
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error(`Error: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Абстрактный метод отправки SMS (должен быть реализован в наследниках)
   */
  abstract sendSms(params: SendSmsParams): Promise<SendSmsResult>;

  /**
   * Получить имя провайдера
   */
  getName(): string {
    return this.config.displayName;
  }

  /**
   * Получить возможности провайдера
   */
  abstract getCapabilities(): ProviderCapabilities;

  /**
   * Проверка здоровья провайдера
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Простая проверка доступности базового URL
      await axios.head(this.config.config.baseUrl, { timeout: 5000 });
      return true;
    } catch (error) {
      this.logger.warn(`Provider ${this.config.name} is not healthy: ${error.message}`);
      return false;
    }
  }

  /**
   * Получить credentials из env
   */
  protected getCredentials(): Record<string, string> {
    const credentials: Record<string, string> = {};
    const { credentials: credConfig } = this.config.config;

    if (credConfig.apiKeyEnv) {
      credentials.apiKey = this.configService.get<string>(credConfig.apiKeyEnv, '');
    }

    if (credConfig.loginEnv) {
      credentials.login = this.configService.get<string>(credConfig.loginEnv, '');
    }

    if (credConfig.passwordEnv) {
      credentials.password = this.configService.get<string>(credConfig.passwordEnv, '');
    }

    if (credConfig.tokenEnv) {
      credentials.token = this.configService.get<string>(credConfig.tokenEnv, '');
    }

    return credentials;
  }

  /**
   * Retry механизм для отправки
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries || this.config.settings?.maxRetries || 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt}/${retries} failed: ${error.message}`);

        if (attempt < retries) {
          // Экспоненциальная задержка
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Задержка
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Подсчет сегментов SMS (базовая логика)
   */
  protected calculateSegments(message: string): number {
    // Проверяем есть ли кириллица или спецсимволы
    const hasUnicode = /[^\x00-\x7F]/.test(message);
    const maxLength = hasUnicode ? 70 : 160;
    const segmentLength = hasUnicode ? 67 : 153;

    if (message.length <= maxLength) {
      return 1;
    }

    return Math.ceil(message.length / segmentLength);
  }
}
