import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProviderConfig } from '../../entities/sms-provider-config.entity';
import { SmsProviderInterface } from './sms-provider.interface';
import { GenericHttpProvider } from './generic-http-provider';

/**
 * Фабрика для создания экземпляров SMS-провайдеров
 * 
 * Всегда использует GenericHttpProvider - универсальный провайдер
 * который работает с любыми REST API через динамическую конфигурацию
 */
@Injectable()
export class SmsProviderFactory {
  private readonly logger = new Logger(SmsProviderFactory.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Создать провайдера на основе конфигурации
   * Всегда используем GenericHttpProvider - он универсален для любых REST API
   * Не нужно создавать отдельные классы для каждого провайдера!
   */
  create(config: SmsProviderConfig): SmsProviderInterface {
    this.logger.log(`Creating provider: ${config.name} (${config.displayName})`);

    // Используем универсальный провайдер для ВСЕХ конфигураций
    // Он поддерживает любые REST API через динамический маппинг
    return new GenericHttpProvider(config, this.configService);
  }

  /**
   * Проверить валидность конфигурации
   */
  validateConfig(config: SmsProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Проверяем обязательные поля
    if (!config.name) {
      errors.push('Provider name is required');
    }

    if (!config.config) {
      errors.push('Provider config is required');
      return { valid: false, errors };
    }

    if (!config.config.baseUrl) {
      errors.push('Base URL is required');
    }

    if (!config.config.endpoints?.send) {
      errors.push('Send endpoint is required');
    }

    if (!config.config.fieldMapping) {
      errors.push('Field mapping is required');
    } else {
      if (!config.config.fieldMapping.phone) {
        errors.push('Phone field mapping is required');
      }
      if (!config.config.fieldMapping.message) {
        errors.push('Message field mapping is required');
      }
    }

    if (!config.config.responseMapping?.messageIdField) {
      errors.push('Message ID field mapping is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
