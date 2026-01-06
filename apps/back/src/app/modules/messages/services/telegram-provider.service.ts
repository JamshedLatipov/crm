import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SendTelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
  errorCode?: string;
}

export interface TelegramProviderConfig {
  apiUrl: string;
  botToken: string;
}

/**
 * Сервис для интеграции с Telegram Bot API
 */
@Injectable()
export class TelegramProviderService {
  private readonly logger = new Logger(TelegramProviderService.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: TelegramProviderConfig;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('FEATURE_TELEGRAM_ENABLED', false);

    if (!this.isEnabled) {
      this.logger.warn('Telegram provider is disabled. Set FEATURE_TELEGRAM_ENABLED=true to enable.');
    }

    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
    
    this.config = {
      apiUrl: `https://api.telegram.org/bot${botToken}`,
      botToken,
    };

    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Отправка текстового сообщения
   */
  async sendMessage(chatId: string | number, message: string): Promise<SendTelegramResult> {
    if (!this.isEnabled) {
      this.logger.warn('Telegram sending is disabled');
      return {
        success: false,
        error: 'Telegram provider is disabled',
      };
    }

    try {
      this.logger.log(`Sending Telegram message to chat ${chatId}`);

      const url = `${this.config.apiUrl}/sendMessage`;
      
      const response = await this.httpClient.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      });

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.result.message_id,
        };
      }

      return {
        success: false,
        error: response.data.description || 'Unknown error',
        errorCode: response.data.error_code?.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to send Telegram message: ${error.message}`, error.stack);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.description || error.message,
          errorCode: error.response.data.error_code?.toString(),
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Отправка сообщения с кнопками (inline keyboard)
   */
  async sendMessageWithButtons(
    chatId: string | number,
    message: string,
    buttons: Array<Array<{ text: string; url?: string; callback_data?: string }>>
  ): Promise<SendTelegramResult> {
    if (!this.isEnabled) {
      this.logger.warn('Telegram sending is disabled');
      return {
        success: false,
        error: 'Telegram provider is disabled',
      };
    }

    try {
      const url = `${this.config.apiUrl}/sendMessage`;
      
      const response = await this.httpClient.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: buttons,
        },
      });

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.result.message_id,
        };
      }

      return {
        success: false,
        error: response.data.description || 'Unknown error',
        errorCode: response.data.error_code?.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to send Telegram message with buttons: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Отправка фото с подписью
   */
  async sendPhoto(
    chatId: string | number,
    photoUrl: string,
    caption?: string
  ): Promise<SendTelegramResult> {
    if (!this.isEnabled) {
      this.logger.warn('Telegram sending is disabled');
      return {
        success: false,
        error: 'Telegram provider is disabled',
      };
    }

    try {
      const url = `${this.config.apiUrl}/sendPhoto`;
      
      const response = await this.httpClient.post(url, {
        chat_id: chatId,
        photo: photoUrl,
        caption: caption || '',
        parse_mode: 'HTML',
      });

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.result.message_id,
        };
      }

      return {
        success: false,
        error: response.data.description || 'Unknown error',
        errorCode: response.data.error_code?.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to send Telegram photo: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Проверка доступности бота
   */
  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const url = `${this.config.apiUrl}/getMe`;
      const response = await this.httpClient.get(url);
      return response.data.ok === true;
    } catch (error) {
      this.logger.error(`Telegram health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Получение информации о боте
   */
  async getBotInfo(): Promise<any> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const url = `${this.config.apiUrl}/getMe`;
      const response = await this.httpClient.get(url);
      
      if (response.data.ok) {
        return response.data.result;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to get bot info: ${error.message}`);
      return null;
    }
  }
}
