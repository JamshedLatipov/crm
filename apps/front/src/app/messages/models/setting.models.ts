export enum SettingCategory {
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook',
  CAMPAIGN = 'campaign',
  NOTIFICATION = 'notification',
  FEATURE = 'feature',
  GENERAL = 'general',
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  category: SettingCategory;
  description?: string;
  isEncrypted: boolean;
  isSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSettingDto {
  key: string;
  value: string;
  category: SettingCategory;
  description?: string;
  isSecret?: boolean;
}

export interface UpdateSettingDto {
  value?: string;
  description?: string;
}

export interface BulkUpdateSettingDto {
  key: string;
  value: string;
}

export interface TestSettingDto {
  category: SettingCategory;
  recipient?: string;
}

export interface TestSettingResponse {
  success: boolean;
  message: string;
  recipient?: string;
}
