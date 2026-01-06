// Enums
export enum MessageChannel {
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook',
  PUSH = 'push',
}

export enum CampaignType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
  TRIGGERED = 'triggered',
  RECURRING = 'recurring',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TemplateCategory {
  MARKETING = 'marketing',
  TRANSACTIONAL = 'transactional',
  NOTIFICATION = 'notification',
  WELCOME = 'welcome',
  PROMOTIONAL = 'promotional',
  SYSTEM = 'system',
  OTHER = 'other',
}

export enum EmailTemplateCategory {
  MARKETING = 'marketing',
  TRANSACTIONAL = 'transactional',
  NOTIFICATION = 'notification',
  NEWSLETTER = 'newsletter',
  WELCOME = 'welcome',
  PROMOTIONAL = 'promotional',
  SYSTEM = 'system',
  OTHER = 'other',
}

// SMS Template
export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  successRate: number;
  avgDeliveryTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSmsTemplateDto {
  name: string;
  content: string;
  category?: TemplateCategory;
  variables?: string[];
  isActive?: boolean;
}

// Email Template
export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  category: EmailTemplateCategory;
  variables: Record<string, string>;
  isActive: boolean;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  cssStyles?: string;
  preheader?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailTemplateDto {
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  category?: EmailTemplateCategory;
  variables?: Record<string, string>;
  cssStyles?: string;
  preheader?: string;
}

// Segment
export interface SegmentFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in' | 'notIn';
  value: any;
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  filters: SegmentFilter[];
  filterLogic: 'AND' | 'OR';
  contactsCount: number;
  isDynamic: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSegmentDto {
  name: string;
  description?: string;
  filters: SegmentFilter[];
  filterLogic?: 'AND' | 'OR';
  isDynamic?: boolean;
}

// Campaign
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  templateId?: string;
  segmentId?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalCost: number;
  settings: CampaignSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignSettings {
  sendingSpeed?: number;
  retryFailedMessages?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  trackDelivery?: boolean;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  type: CampaignType;
  templateId: string;
  segmentId: string;
  scheduledAt?: Date;
  settings?: CampaignSettings;
}

// Notification Campaign (Multi-channel)
export interface NotificationCampaign {
  id: string;
  name: string;
  description?: string;
  channels: MessageChannel[];
  type: CampaignType;
  status: CampaignStatus;
  settings: MultiChannelSettings;
  channelStats: ChannelStat[];
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  segmentId?: string;
  smsTemplateId?: string;
  emailTemplateId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MultiChannelSettings {
  sms?: {
    enabled: boolean;
    provider?: string;
    sendingSpeed?: number;
    retryFailed?: boolean;
  };
  email?: {
    enabled: boolean;
    smtpHost?: string;
    smtpPort?: number;
    from?: string;
    replyTo?: string;
  };
  webhook?: {
    enabled: boolean;
    url?: string;
    event?: string;
    authentication?: {
      type: 'bearer' | 'basic' | 'apikey';
      token?: string;
      username?: string;
      password?: string;
      apiKey?: string;
    };
  };
}

export interface ChannelStat {
  channel: MessageChannel;
  sent: number;
  delivered: number;
  failed: number;
  cost?: number;
  deliveryRate: number;
  opened?: number;
  clicked?: number;
  openRate?: number;
  clickRate?: number;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  avgCost: number;
  startedAt: Date;
  completedAt?: Date;
}

// Notification
export interface SendNotificationDto {
  channel: MessageChannel;
  recipient: string;
  subject?: string;
  message: string;
  template?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SendMultiChannelDto {
  channels: MessageChannel[];
  sms?: {
    phoneNumber: string;
    message: string;
  };
  email?: {
    to: string;
    subject: string;
    html: string;
  };
  webhook?: {
    url: string;
    event: string;
    data: any;
  };
  variables?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: MessageChannel;
}

export interface MultiChannelResult {
  results: Partial<Record<MessageChannel, NotificationResult>>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Health Check
export interface ChannelHealth {
  available: boolean;
  provider?: string;
  balance?: number;
  host?: string;
  error?: string;
  lastCheck: Date;
}

export interface HealthCheckResponse {
  sms: ChannelHealth;
  email: ChannelHealth;
  webhook: ChannelHealth;
}

// Analytics
export interface DashboardStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

export interface ChannelStats {
  name: string;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

export interface CampaignStats {
  id: string;
  name: string;
  sent: number;
  deliveryRate: number;
}

// Filter and Sort
export interface TableFilter {
  field: string;
  value: any;
  operator?: string;
}

export interface TableSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TableQuery {
  page: number;
  limit: number;
  filters?: TableFilter[];
  sort?: TableSort;
  search?: string;
}

// WhatsApp Template
export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  successRate: number;
  mediaUrl?: string;
  buttonText?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWhatsAppTemplateDto {
  name: string;
  content: string;
  category?: TemplateCategory;
  variables?: string[];
  isActive?: boolean;
  mediaUrl?: string;
  buttonText?: string;
}

// Telegram Template
export interface TelegramTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  successRate: number;
  mediaUrl?: string;
  inlineKeyboard?: TelegramInlineButton[][];
  createdAt: Date;
  updatedAt: Date;
}

export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface CreateTelegramTemplateDto {
  name: string;
  content: string;
  category?: TemplateCategory;
  variables?: string[];
  isActive?: boolean;
  mediaUrl?: string;
  inlineKeyboard?: TelegramInlineButton[][];
}
