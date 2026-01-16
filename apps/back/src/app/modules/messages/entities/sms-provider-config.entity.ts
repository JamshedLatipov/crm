import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AuthType = 'api_key' | 'basic' | 'bearer' | 'custom' | 'md5_password';
export type RequestFormat = 'json' | 'form' | 'query';
export type RequestMethod = 'POST' | 'GET';

export interface ProviderConfig {
  // Основные параметры
  baseUrl: string;
  authType: AuthType;

  // Endpoints
  endpoints: {
    send: string;
    balance?: string;
    status?: string;
  };

  // Credentials (ссылки на env)
  credentials: {
    apiKeyEnv?: string;
    loginEnv?: string;
    passwordEnv?: string;
    tokenEnv?: string;
  };

  // Маппинг полей (JSON)
  fieldMapping: {
    phone: string;
    message: string;
    sender?: string;
    login?: string;
    password?: string;
  };

  // Формат запроса
  requestFormat: RequestFormat;
  requestMethod: RequestMethod;

  // Заголовки (опционально)
  headers?: Record<string, string>;

  // Обработка ответа
  responseMapping: {
    messageIdField: string;
    successField?: string;
    successValue?: any;
    errorField?: string;
  };

  // Специфичная логика
  customLogic?: {
    md5Password?: boolean;
    phoneFormat?: string;
  };
}

export interface WebhookConfig {
  enabled: boolean;
  url?: string;
  secret?: string;
  statusMapping?: {
    delivered: string[];
    failed: string[];
    pending: string[];
  };
}

export interface ProviderSettings {
  timeout?: number;
  maxRetries?: number;
  costPerMessage?: number;
}

/**
 * Конфигурация SMS-провайдера
 * Позволяет динамически подключать любые SMS-сервисы
 */
@Entity('sms_provider_configs')
export class SmsProviderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string; // 'sms_ru', 'smsc_ru', 'imon_tj', 'generic'

  @Column({ length: 255 })
  displayName: string; // "IMON.TJ", "SMS.RU"

  @Column({ default: false })
  isActive: boolean; // Только один может быть active

  @Column({ type: 'json' })
  config: ProviderConfig;

  @Column({ type: 'json', nullable: true })
  webhookConfig?: WebhookConfig;

  @Column({ type: 'json', nullable: true })
  settings?: ProviderSettings;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
