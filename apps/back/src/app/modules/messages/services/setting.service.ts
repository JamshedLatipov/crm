import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting, SettingCategory } from '../entities/setting.entity';
import { CreateSettingDto, UpdateSettingDto, BulkUpdateSettingDto } from '../dto/setting.dto';

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
  ) {}

  /**
   * Получить все настройки
   */
  async findAll(): Promise<Setting[]> {
    const settings = await this.settingRepo.find({
      order: { category: 'ASC', key: 'ASC' },
    });

    // Расшифровываем зашифрованные значения и скрываем секретные
    return settings.map((setting) => {
      let value = setting.value;
      if (setting.isEncrypted) {
        value = this.decrypt(value);
      }
      if (setting.isSecret) {
        value = '********';
      }
      return { ...setting, value };
    });
  }

  /**
   * Получить настройки по категории
   */
  async findByCategory(category: SettingCategory): Promise<Setting[]> {
    const settings = await this.settingRepo.find({
      where: { category },
      order: { key: 'ASC' },
    });

    return settings.map((setting) => {
      let value = setting.value;
      if (setting.isEncrypted) {
        value = this.decrypt(value);
      }
      if (setting.isSecret) {
        value = '********';
      }
      return { ...setting, value };
    });
  }

  /**
   * Получить настройку по ключу
   */
  async findByKey(key: string): Promise<Setting | null> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) return null;

    return {
      ...setting,
      value: setting.isEncrypted ? this.decrypt(setting.value) : setting.value,
    };
  }

  /**
   * Получить значение настройки по ключу
   */
  async getValue(key: string, defaultValue?: string): Promise<string | null> {
    const setting = await this.findByKey(key);
    return setting ? setting.value : defaultValue || null;
  }

  /**
   * Создать настройку
   */
  async create(dto: CreateSettingDto): Promise<Setting> {
    const value = dto.isSecret ? this.encrypt(dto.value) : dto.value;

    const setting = this.settingRepo.create({
      ...dto,
      value,
      isEncrypted: dto.isSecret || false,
    });

    return this.settingRepo.save(setting);
  }

  /**
   * Обновить настройку
   */
  async update(key: string, dto: UpdateSettingDto): Promise<Setting> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) {
      throw new Error(`Setting with key "${key}" not found`);
    }

    if (dto.value !== undefined) {
      setting.value = setting.isSecret ? this.encrypt(dto.value) : dto.value;
    }

    if (dto.description !== undefined) {
      setting.description = dto.description;
    }

    return this.settingRepo.save(setting);
  }

  /**
   * Массовое обновление настроек
   */
  async bulkUpdate(updates: BulkUpdateSettingDto[]): Promise<Setting[]> {
    const results: Setting[] = [];

    for (const update of updates) {
      const setting = await this.settingRepo.findOne({ where: { key: update.key } });
      
      if (setting) {
        setting.value = setting.isSecret ? this.encrypt(update.value) : update.value;
        results.push(await this.settingRepo.save(setting));
      } else {
        // Создаём новую настройку, если не существует
        const newSetting = this.settingRepo.create({
          key: update.key,
          value: update.value,
          category: this.getCategoryFromKey(update.key),
          isSecret: this.isKeySecret(update.key),
          isEncrypted: this.isKeySecret(update.key),
        });
        results.push(await this.settingRepo.save(newSetting));
      }
    }

    return results;
  }

  /**
   * Удалить настройку
   */
  async delete(key: string): Promise<void> {
    await this.settingRepo.delete({ key });
  }

  /**
   * Инициализировать настройки по умолчанию из .env
   */
  async initializeDefaults(): Promise<void> {
    const defaults = this.getDefaultSettings();

    for (const defaultSetting of defaults) {
      const existing = await this.findByKey(defaultSetting.key);
      if (!existing) {
        await this.create(defaultSetting);
      }
    }
  }

  /**
   * Шифрование значения (простое base64 кодирование)
   */
  private encrypt(text: string): string {
    return Buffer.from(text).toString('base64');
  }

  /**
   * Расшифровка значения
   */
  private decrypt(encrypted: string): string {
    try {
      return Buffer.from(encrypted, 'base64').toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      return encrypted;
    }
  }

  /**
   * Определить категорию по ключу
   */
  private getCategoryFromKey(key: string): SettingCategory {
    if (key.startsWith('SMS_') || key.startsWith('SMSC_') || key.startsWith('TWILIO_')) {
      return SettingCategory.SMS;
    }
    if (key.startsWith('SMTP_') || key.startsWith('EMAIL_')) {
      return SettingCategory.EMAIL;
    }
    if (key.startsWith('WHATSAPP_')) {
      return SettingCategory.WHATSAPP;
    }
    if (key.startsWith('TELEGRAM_')) {
      return SettingCategory.TELEGRAM;
    }
    if (key.startsWith('WEBHOOK_')) {
      return SettingCategory.WEBHOOK;
    }
    if (key.includes('CAMPAIGN')) {
      return SettingCategory.CAMPAIGN;
    }
    if (key.includes('NOTIFICATION')) {
      return SettingCategory.NOTIFICATION;
    }
    if (key.startsWith('FEATURE_')) {
      return SettingCategory.FEATURE;
    }
    return SettingCategory.GENERAL;
  }

  /**
   * Проверить, является ли ключ секретным
   */
  private isKeySecret(key: string): boolean {
    const secretKeywords = ['PASSWORD', 'TOKEN', 'KEY', 'SECRET', 'API_KEY', 'AUTH'];
    return secretKeywords.some((keyword) => key.includes(keyword));
  }

  /**
   * Получить настройки по умолчанию из .env
   */
  private getDefaultSettings(): CreateSettingDto[] {
    return [
      // SMS Settings
      { key: 'SMS_PROVIDER', value: process.env.SMS_PROVIDER || 'smsru', category: SettingCategory.SMS, description: 'SMS провайдер (smsru, smsc, twilio)' },
      { key: 'SMS_API_KEY', value: process.env.SMS_API_KEY || '', category: SettingCategory.SMS, isSecret: true, description: 'SMS.RU API ключ' },
      { key: 'SMS_SENDER', value: process.env.SMS_SENDER || 'CRM', category: SettingCategory.SMS, description: 'Отправитель SMS' },
      { key: 'SMSC_LOGIN', value: process.env.SMSC_LOGIN || '', category: SettingCategory.SMS, description: 'SMSC логин' },
      { key: 'SMSC_PASSWORD', value: process.env.SMSC_PASSWORD || '', category: SettingCategory.SMS, isSecret: true, description: 'SMSC пароль' },
      { key: 'TWILIO_ACCOUNT_SID', value: process.env.TWILIO_ACCOUNT_SID || '', category: SettingCategory.SMS, isSecret: true, description: 'Twilio Account SID' },
      { key: 'TWILIO_AUTH_TOKEN', value: process.env.TWILIO_AUTH_TOKEN || '', category: SettingCategory.SMS, isSecret: true, description: 'Twilio Auth Token' },
      { key: 'TWILIO_PHONE_NUMBER', value: process.env.TWILIO_PHONE_NUMBER || '', category: SettingCategory.SMS, description: 'Twilio номер телефона' },
      
      // Email Settings
      { key: 'SMTP_HOST', value: process.env.SMTP_HOST || 'smtp.gmail.com', category: SettingCategory.EMAIL, description: 'SMTP хост' },
      { key: 'SMTP_PORT', value: process.env.SMTP_PORT || '587', category: SettingCategory.EMAIL, description: 'SMTP порт' },
      { key: 'SMTP_USER', value: process.env.SMTP_USER || '', category: SettingCategory.EMAIL, description: 'SMTP пользователь' },
      { key: 'SMTP_PASSWORD', value: process.env.SMTP_PASSWORD || '', category: SettingCategory.EMAIL, isSecret: true, description: 'SMTP пароль' },
      { key: 'SMTP_FROM', value: process.env.SMTP_FROM || 'noreply@example.com', category: SettingCategory.EMAIL, description: 'Email отправителя' },
      { key: 'SMTP_FROM_NAME', value: process.env.SMTP_FROM_NAME || 'CRM System', category: SettingCategory.EMAIL, description: 'Имя отправителя' },
      
      // WhatsApp Settings
      { key: 'WHATSAPP_API_URL', value: process.env.WHATSAPP_API_URL || '', category: SettingCategory.WHATSAPP, description: 'WhatsApp API URL' },
      { key: 'WHATSAPP_API_KEY', value: process.env.WHATSAPP_API_KEY || '', category: SettingCategory.WHATSAPP, isSecret: true, description: 'WhatsApp API ключ' },
      { key: 'WHATSAPP_PHONE_NUMBER_ID', value: process.env.WHATSAPP_PHONE_NUMBER_ID || '', category: SettingCategory.WHATSAPP, description: 'WhatsApp Phone Number ID' },
      { key: 'WHATSAPP_BUSINESS_ACCOUNT_ID', value: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '', category: SettingCategory.WHATSAPP, description: 'WhatsApp Business Account ID' },
      { key: 'WHATSAPP_ACCESS_TOKEN', value: process.env.WHATSAPP_ACCESS_TOKEN || '', category: SettingCategory.WHATSAPP, isSecret: true, description: 'WhatsApp Access Token' },
      
      // Telegram Settings
      { key: 'TELEGRAM_BOT_TOKEN', value: process.env.TELEGRAM_BOT_TOKEN || '', category: SettingCategory.TELEGRAM, isSecret: true, description: 'Telegram Bot Token' },
      { key: 'TELEGRAM_BOT_USERNAME', value: process.env.TELEGRAM_BOT_USERNAME || '', category: SettingCategory.TELEGRAM, description: 'Telegram Bot Username' },
      { key: 'TELEGRAM_WEBHOOK_URL', value: process.env.TELEGRAM_WEBHOOK_URL || '', category: SettingCategory.TELEGRAM, description: 'Telegram Webhook URL' },
      { key: 'TELEGRAM_API_URL', value: process.env.TELEGRAM_API_URL || 'https://api.telegram.org', category: SettingCategory.TELEGRAM, description: 'Telegram API URL' },
      
      // Webhook Settings
      { key: 'WEBHOOK_URL', value: process.env.WEBHOOK_URL || '', category: SettingCategory.WEBHOOK, description: 'Webhook URL для исходящих уведомлений' },
      { key: 'WEBHOOK_SECRET', value: process.env.WEBHOOK_SECRET || '', category: SettingCategory.WEBHOOK, isSecret: true, description: 'Webhook секретный ключ для подписи' },
      { key: 'WEBHOOK_TIMEOUT', value: process.env.WEBHOOK_TIMEOUT || '5000', category: SettingCategory.WEBHOOK, description: 'Webhook timeout (мс)' },
      { key: 'WEBHOOK_RETRY_COUNT', value: process.env.WEBHOOK_RETRY_COUNT || '3', category: SettingCategory.WEBHOOK, description: 'Количество попыток повтора' },
      { key: 'WEBHOOK_AUTH_TYPE', value: process.env.WEBHOOK_AUTH_TYPE || 'none', category: SettingCategory.WEBHOOK, description: 'Тип авторизации (none, basic, bearer, api_key)' },
      { key: 'WEBHOOK_AUTH_VALUE', value: process.env.WEBHOOK_AUTH_VALUE || '', category: SettingCategory.WEBHOOK, isSecret: true, description: 'Значение авторизации' },
      
      // Feature Flags
      { key: 'FEATURE_SMS_ENABLED', value: process.env.FEATURE_SMS_ENABLED || 'true', category: SettingCategory.FEATURE, description: 'Включить SMS' },
      { key: 'FEATURE_EMAIL_ENABLED', value: process.env.FEATURE_EMAIL_ENABLED || 'true', category: SettingCategory.FEATURE, description: 'Включить Email' },
      { key: 'FEATURE_WHATSAPP_ENABLED', value: process.env.FEATURE_WHATSAPP_ENABLED || 'false', category: SettingCategory.FEATURE, description: 'Включить WhatsApp' },
      { key: 'FEATURE_TELEGRAM_ENABLED', value: process.env.FEATURE_TELEGRAM_ENABLED || 'false', category: SettingCategory.FEATURE, description: 'Включить Telegram' },
      { key: 'FEATURE_WEBHOOK_ENABLED', value: process.env.FEATURE_WEBHOOK_ENABLED || 'true', category: SettingCategory.FEATURE, description: 'Включить Webhook' },
    ];
  }
}
