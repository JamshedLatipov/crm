import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SendSmsResult {
  success: boolean;
  providerId?: string;
  cost?: number;
  segmentsCount?: number;
  error?: string;
  errorCode?: string;
}

export interface SmsProviderConfig {
  apiUrl: string;
  apiKey: string;
  sender: string;
  provider: 'twilio' | 'smsc' | 'smsru' | 'custom';
}

/**
 * Сервис для интеграции с СМС-провайдерами
 * Поддерживает: SMS.RU, SMSC.RU, Twilio
 */
@Injectable()
export class SmsProviderService {
  private readonly logger = new Logger(SmsProviderService.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: SmsProviderConfig;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('FEATURE_SMS_ENABLED', true);

    if (!this.isEnabled) {
      this.logger.warn('SMS provider is disabled. Set FEATURE_SMS_ENABLED=true to enable.');
    }

    this.config = {
      apiUrl: this.configService.get<string>('SMS_API_URL', 'https://sms.ru/sms/send'),
      apiKey: this.configService.get<string>('SMS_API_KEY', ''),
      sender: this.configService.get<string>('SMS_SENDER', 'CRM'),
      provider: this.configService.get<'twilio' | 'smsc' | 'smsru' | 'custom'>('SMS_PROVIDER', 'smsru'),
    };

    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Отправка СМС через провайдера
   */
  async sendSms(phoneNumber: string, message: string): Promise<SendSmsResult> {
    if (!this.isEnabled) {
      this.logger.warn('SMS sending is disabled');
      return {
        success: false,
        error: 'SMS provider is disabled',
      };
    }
    try {
      this.logger.log(`Sending SMS to ${phoneNumber} via ${this.config.provider}`);

      switch (this.config.provider) {
        case 'smsru':
          return await this.sendViaSmsRu(phoneNumber, message);
        case 'smsc':
          return await this.sendViaSmsc(phoneNumber, message);
        case 'twilio':
          return await this.sendViaTwilio(phoneNumber, message);
        default:
          throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Отправка через SMS.RU
   */
  private async sendViaSmsRu(phoneNumber: string, message: string): Promise<SendSmsResult> {
    try {
      const response = await this.httpClient.get('https://sms.ru/sms/send', {
        params: {
          api_id: this.config.apiKey,
          to: phoneNumber,
          msg: message,
          json: 1,
        },
      });

      const data = response.data;

      if (data.status === 'OK') {
        const smsData = data.sms?.[phoneNumber];
        return {
          success: true,
          providerId: smsData?.sms_id,
          cost: smsData?.cost,
          segmentsCount: this.calculateSegments(message),
        };
      } else {
        return {
          success: false,
          error: data.status_text || 'Unknown error',
          errorCode: data.status_code,
        };
      }
    } catch (error) {
      throw new Error(`SMS.RU API error: ${error.message}`);
    }
  }

  /**
   * Отправка через SMSC.RU
   */
  private async sendViaSmsc(phoneNumber: string, message: string): Promise<SendSmsResult> {
    try {
      const login = this.configService.get<string>('SMSC_LOGIN', '');
      const password = this.configService.get<string>('SMSC_PASSWORD', '');

      const response = await this.httpClient.get('https://smsc.ru/sys/send.php', {
        params: {
          login,
          psw: password,
          phones: phoneNumber,
          mes: message,
          fmt: 3, // JSON format
        },
      });

      const data = response.data;

      if (data.error) {
        return {
          success: false,
          error: data.error,
          errorCode: data.error_code,
        };
      }

      return {
        success: true,
        providerId: data.id?.toString(),
        cost: data.cost,
        segmentsCount: data.cnt || this.calculateSegments(message),
      };
    } catch (error) {
      throw new Error(`SMSC.RU API error: ${error.message}`);
    }
  }

  /**
   * Отправка через Twilio
   */
  private async sendViaTwilio(phoneNumber: string, message: string): Promise<SendSmsResult> {
    try {
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
      const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER', '');

      const response = await this.httpClient.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          From: fromNumber,
          To: phoneNumber,
          Body: message,
        }),
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      return {
        success: true,
        providerId: data.sid,
        cost: parseFloat(data.price || '0'),
        segmentsCount: parseInt(data.num_segments || '1'),
      };
    } catch (error) {
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.message || 'Twilio API error',
          errorCode: error.response.data.code,
        };
      }
      throw new Error(`Twilio API error: ${error.message}`);
    }
  }

  /**
   * Получение статуса сообщения
   */
  async getMessageStatus(providerId: string): Promise<{
    status: string;
    deliveredAt?: Date;
  }> {
    // Реализация зависит от провайдера
    // Здесь можно добавить проверку статуса через API провайдера
    this.logger.log(`Getting status for message ${providerId}`);
    return {
      status: 'unknown',
    };
  }

  /**
   * Подсчёт количества СМС-сегментов
   */
  private calculateSegments(message: string): number {
    const hasUnicode = /[^\x00-\x7F]/.test(message);
    const segmentLength = hasUnicode ? 70 : 160;
    return Math.ceil(message.length / segmentLength);
  }

  /**
   * Валидация номера телефона
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Простая валидация для международного формата
    const phoneRegex = /^\+?[1-9]\d{10,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-()]/g, ''));
  }

  /**
   * Проверка баланса провайдера
   */
  async checkBalance(): Promise<{ balance: number; currency: string }> {
    try {
      switch (this.config.provider) {
        case 'smsru':
          return await this.checkBalanceSmsRu();
        case 'smsc':
          return await this.checkBalanceSmsc();
        default:
          return { balance: 0, currency: 'RUB' };
      }
    } catch (error) {
      this.logger.error(`Failed to check balance: ${error.message}`);
      return { balance: 0, currency: 'RUB' };
    }
  }

  private async checkBalanceSmsRu(): Promise<{ balance: number; currency: string }> {
    const response = await this.httpClient.get('https://sms.ru/my/balance', {
      params: {
        api_id: this.config.apiKey,
        json: 1,
      },
    });

    return {
      balance: parseFloat(response.data.balance || '0'),
      currency: 'RUB',
    };
  }

  private async checkBalanceSmsc(): Promise<{ balance: number; currency: string }> {
    const login = this.configService.get<string>('SMSC_LOGIN', '');
    const password = this.configService.get<string>('SMSC_PASSWORD', '');

    const response = await this.httpClient.get('https://smsc.ru/sys/balance.php', {
      params: {
        login,
        psw: password,
        fmt: 3,
      },
    });

    return {
      balance: parseFloat(response.data.balance || '0'),
      currency: 'RUB',
    };
  }
}
