import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { NotificationCampaign } from './notification-campaign.entity';
import { Contact } from '../../contacts/contact.entity';
import { Lead } from '../../leads/lead.entity';

export enum TelegramMessageStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export enum TelegramMessageType {
  TEXT = 'text',
  PHOTO = 'photo',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VOICE = 'voice',
  LOCATION = 'location',
  CONTACT = 'contact',
  STICKER = 'sticker',
}

export interface TelegramMessageMetadata {
  messageId?: number; // ID сообщения от Telegram API
  errorCode?: string;
  errorMessage?: string;
  replyToMessageId?: number; // ID сообщения, на которое отвечаем
  retryCount?: number;
  variables?: Record<string, any>;
  inlineKeyboard?: any; // Inline кнопки
  replyKeyboard?: any; // Reply кнопки
}

@Entity('telegram_messages')
@Index(['campaign', 'status'])
@Index(['chatId'])
@Index(['createdAt'])
export class TelegramMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NotificationCampaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: NotificationCampaign;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  // Chat ID пользователя в Telegram
  @Column()
  chatId: string;

  // Username пользователя (опционально)
  @Column({ nullable: true })
  username: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: TelegramMessageType,
    default: TelegramMessageType.TEXT,
  })
  messageType: TelegramMessageType;

  @Column({
    type: 'enum',
    enum: TelegramMessageStatus,
    default: TelegramMessageStatus.PENDING,
  })
  status: TelegramMessageStatus;

  // Метаданные сообщения
  @Column('jsonb', { nullable: true })
  metadata: TelegramMessageMetadata;

  // URL медиафайла (для фото, видео и т.д.)
  @Column({ nullable: true })
  mediaUrl: string;

  // Временные метки
  @Column({ type: 'timestamp', nullable: true })
  queuedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
