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
import { MessageCampaign } from './message-campaign.entity';
import { Contact } from '../../contacts/contact.entity';
import { Lead } from '../../leads/lead.entity';

export enum EmailStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
  REJECTED = 'rejected',
  SPAM = 'spam',
  UNSUBSCRIBED = 'unsubscribed',
}

export interface EmailMetadata {
  providerId?: string; // ID от email провайдера (SendGrid, Mailgun, etc)
  providerName?: string;
  errorCode?: string;
  errorMessage?: string;
  error?: string; // Текст ошибки
  stack?: string; // Stack trace ошибки
  messageId?: string; // ID сообщения от SMTP сервера
  accepted?: any[]; // Принятые адреса
  rejected?: any[]; // Отклоненные адреса
  deliveryDetails?: any;
  retryCount?: number;
  variables?: Record<string, any>;
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    size: number;
    contentType: string;
  }>;
}

export interface EmailTracking {
  opens?: number;
  clicks?: number;
  bounces?: number; // Количество отскоков
  lastOpenedAt?: Date;
  lastClickedAt?: Date;
  clickedLinks?: string[];
  userAgent?: string;
  ipAddress?: string;
}

@Entity('email_messages')
@Index(['campaign', 'status'])
@Index(['email'])
@Index(['createdAt'])
@Index(['status'])
export class EmailMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MessageCampaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: MessageCampaign;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  // Получатель
  @Column()
  email: string;

  @Column({ nullable: true })
  recipientName: string;

  // Содержимое письма
  @Column()
  subject: string;

  @Column('text')
  htmlContent: string;

  @Column('text', { nullable: true })
  textContent: string;

  // Статус
  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.PENDING,
  })
  status: EmailStatus;

  // Метаданные
  @Column('jsonb', { nullable: true })
  metadata: EmailMetadata;

  // Отслеживание действий
  @Column('jsonb', { nullable: true })
  tracking: EmailTracking;

  // Стоимость (если используется платный провайдер)
  @Column('decimal', { precision: 10, scale: 4, default: 0, nullable: true })
  cost: number;

  // Временные метки
  @Column({ type: 'timestamp', nullable: true })
  queuedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  bouncedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
