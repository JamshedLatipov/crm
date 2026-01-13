import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { SmsTemplate } from './sms-template.entity';
import { EmailTemplate } from './email-template.entity';
import { ContactSegment } from '../../segments/entities/contact-segment.entity';

export enum MessageChannelType {
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook',
  PUSH = 'push',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum CampaignType {
  IMMEDIATE = 'immediate', // Отправить сразу
  SCHEDULED = 'scheduled', // По расписанию
  TRIGGERED = 'triggered', // По триггеру (событие)
  RECURRING = 'recurring', // Периодическая
}

export interface CampaignSettings {
  sendingSpeed?: number; // Сообщений в минуту
  retryFailedMessages?: boolean;
  maxRetries?: number;
  scheduleTime?: string; // Время отправки для recurring
  timezone?: string;
}

export interface MultiChannelSettings {
  channels: MessageChannelType[];
  
  // SMS настройки
  sms?: {
    enabled: boolean;
    sendingSpeed?: number;
  };
  
  // Email настройки
  email?: {
    enabled: boolean;
    trackOpens?: boolean;
    trackClicks?: boolean;
  };
  
  // Webhook настройки
  webhook?: {
    enabled: boolean;
    url?: string;
    method?: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    auth?: {
      type: 'bearer' | 'basic' | 'apikey';
      token?: string;
    };
  };
  
  // Общие настройки
  retryFailedMessages?: boolean;
  maxRetries?: number;
  timezone?: string;
}

export interface ChannelStats {
  channel: MessageChannelType;
  totalSent: number;
  delivered: number;
  failed: number;
  cost: number;
}

@Entity('message_campaigns')
export class MessageCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // Универсальное поле для ID шаблона (любого канала)
  @Column('uuid', { nullable: true })
  templateId: string;

  // Канал кампании (определяет какой шаблон используется)
  @Column({
    type: 'enum',
    enum: MessageChannelType,
    default: MessageChannelType.SMS,
  })
  channel: MessageChannelType;

  // Устаревшие поля (для обратной совместимости, можно удалить позже)
  @ManyToOne(() => SmsTemplate, { nullable: true })
  @JoinColumn({ name: 'smsTemplateId' })
  smsTemplate: SmsTemplate;

  @ManyToOne(() => EmailTemplate, { nullable: true })
  @JoinColumn({ name: 'emailTemplateId' })
  emailTemplate: EmailTemplate;

  // Универсальный сегмент получателей (для всех каналов)
  // Использует UUID без FK constraint для обратной совместимости
  @Column({ type: 'uuid', nullable: true, name: 'segmentId' })
  segmentId: string | null;

  @Column({
    type: 'enum',
    enum: CampaignType,
    default: CampaignType.IMMEDIATE,
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  // Активные каналы
  @Column('simple-array')
  channels: MessageChannelType[];

  // Настройки мультиканальной кампании
  @Column('jsonb')
  settings: MultiChannelSettings;

  // Временные метки
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  pausedAt: Date;

  // Общая статистика
  @Column({ default: 0 })
  totalRecipients: number;

  @Column({ default: 0 })
  totalSent: number;

  @Column({ default: 0 })
  totalDelivered: number;

  @Column({ default: 0 })
  totalFailed: number;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  totalCost: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  // Статистика по каналам
  @Column('jsonb', { nullable: true })
  channelStats: ChannelStats[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
