/**
 * Параметры для отправки SMS
 */
export interface SendSmsParams {
  phoneNumber: string;
  message: string;
  sender?: string;
  metadata?: Record<string, any>;
}

/**
 * Результат отправки SMS
 */
export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  segmentsCount?: number;
  provider: string;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
}

/**
 * Результат проверки баланса
 */
export interface BalanceResult {
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}

/**
 * Статус доставки сообщения
 */
export interface DeliveryStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'unknown';
  updatedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Возможности провайдера
 */
export interface ProviderCapabilities {
  supportsSender: boolean;
  supportsBalance: boolean;
  supportsDeliveryStatus: boolean;
  supportsWebhook: boolean;
  maxMessageLength: number;
}

/**
 * Унифицированный интерфейс для всех SMS-провайдеров
 */
export interface SmsProviderInterface {
  /**
   * Отправить SMS
   */
  sendSms(params: SendSmsParams): Promise<SendSmsResult>;

  /**
   * Получить баланс (если поддерживается)
   */
  getBalance?(): Promise<BalanceResult>;

  /**
   * Получить статус доставки (если поддерживается)
   */
  getDeliveryStatus?(messageId: string): Promise<DeliveryStatus>;

  /**
   * Проверка работоспособности провайдера
   */
  isHealthy(): Promise<boolean>;

  /**
   * Получить имя провайдера
   */
  getName(): string;

  /**
   * Получить возможности провайдера
   */
  getCapabilities(): ProviderCapabilities;
}
