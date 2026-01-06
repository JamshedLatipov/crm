import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export interface WhatsAppProviderConfig {
  apiUrl: string;
  accessToken: string;
  phoneNumberId: string;
  provider: 'meta' | 'twilio' | 'custom';
}

/**
 * Сервис для интеграции с WhatsApp Business API
 * Поддерживает: Meta WhatsApp Business API, Twilio WhatsApp
 */
@Injectable()
export class WhatsAppProviderService {
  private readonly logger = new Logger(WhatsAppProviderService.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: WhatsAppProviderConfig;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('FEATURE_WHATSAPP_ENABLED', false);

    if (!this.isEnabled) {
      this.logger.warn('WhatsApp provider is disabled. Set FEATURE_WHATSAPP_ENABLED=true to enable.');
    }

    this.config = {
      apiUrl: this.configService.get<string>('WHATSAPP_API_URL', 'https://graph.facebook.com/v18.0'),
      accessToken: this.configService.get<string>('WHATSAPP_ACCESS_TOKEN', ''),
      phoneNumberId: this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', ''),
      provider: this.configService.get<'meta' | 'twilio' | 'custom'>('WHATSAPP_PROVIDER', 'meta'),
    };

    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
    });
  }

  /**
   * Отправка сообщения через WhatsApp
   */
  async sendMessage(phoneNumber: string, message: string): Promise<SendWhatsAppResult> {
    if (!this.isEnabled) {
      this.logger.warn('WhatsApp sending is disabled');
      return {
        success: false,
        error: 'WhatsApp provider is disabled',
      };
    }

    try {
      this.logger.log(`Sending WhatsApp message to ${phoneNumber} via ${this.config.provider}`);

      switch (this.config.provider) {
        case 'meta':
          return await this.sendViaMeta(phoneNumber, message);
        case 'twilio':
          return await this.sendViaTwilio(phoneNumber, message);
        default:
          throw new Error(`Unsupported WhatsApp provider: ${this.config.provider}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Отправка через Meta WhatsApp Business API
   */
  private async sendViaMeta(phoneNumber: string, message: string): Promise<SendWhatsAppResult> {
    try {
      const url = `${this.config.apiUrl}/${this.config.phoneNumberId}/messages`;
      
      const response = await this.httpClient.post(url, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      });

      if (response.data.messages && response.data.messages[0]) {
        return {
          success: true,
          messageId: response.data.messages[0].id,
        };
      }

      return {
        success: false,
        error: 'Invalid response from WhatsApp API',
      };
    } catch (error) {
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error.message,
          errorCode: error.response.data.error.code?.toString(),
        };
      }
      throw new Error(`Meta WhatsApp API error: ${error.message}`);
    }
  }

  /**
   * Отправка через Twilio WhatsApp
   */
  private async sendViaTwilio(phoneNumber: string, message: string): Promise<SendWhatsAppResult> {
    try {
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
      const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
      const fromNumber = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER', '');

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      
      const response = await axios.post(
        url,
        new URLSearchParams({
          From: `whatsapp:${fromNumber}`,
          To: `whatsapp:${phoneNumber}`,
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

      return {
        success: true,
        messageId: response.data.sid,
      };
    } catch (error) {
      throw new Error(`Twilio WhatsApp API error: ${error.message}`);
    }
  }

  /**
   * Отправка шаблонного сообщения
   */
  async sendTemplate(
    phoneNumber: string,
    templateName: string,
    languageCode: string,
    parameters: any[]
  ): Promise<SendWhatsAppResult> {
    if (!this.isEnabled) {
      this.logger.warn('WhatsApp sending is disabled');
      return {
        success: false,
        error: 'WhatsApp provider is disabled',
      };
    }

    try {
      const url = `${this.config.apiUrl}/${this.config.phoneNumberId}/messages`;
      
      const response = await this.httpClient.post(url, {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: [
            {
              type: 'body',
              parameters: parameters.map(param => ({
                type: 'text',
                text: param,
              })),
            },
          ],
        },
      });

      if (response.data.messages && response.data.messages[0]) {
        return {
          success: true,
          messageId: response.data.messages[0].id,
        };
      }

      return {
        success: false,
        error: 'Invalid response from WhatsApp API',
      };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp template: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Проверка доступности сервиса
   */
  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      // Проверяем доступность API
      const url = `${this.config.apiUrl}/${this.config.phoneNumberId}`;
      const response = await this.httpClient.get(url);
      return response.status === 200;
    } catch (error) {
      this.logger.error(`WhatsApp health check failed: ${error.message}`);
      return false;
    }
  }
}
