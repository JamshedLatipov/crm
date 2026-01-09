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

export enum MessageStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum MessageDirection {
  OUTBOUND = 'outbound',
  INBOUND = 'inbound',
}

export interface MessageMetadata {
  providerId?: string; // ID от провайдера СМС
  providerName?: string; // Название провайдера
  errorCode?: string;
  errorMessage?: string;
  deliveryDetails?: any;
  retryCount?: number;
  variables?: Record<string, any>; // Переменные, использованные в шаблоне
}

@Entity('sms_messages')
@Index(['campaign', 'status'])
@Index(['phoneNumber'])
@Index(['createdAt'])
export class SmsMessage {
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

  @Column()
  phoneNumber: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: MessageDirection,
    default: MessageDirection.OUTBOUND,
  })
  direction: MessageDirection;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  // Метаданные сообщения
  @Column('jsonb', { nullable: true })
  metadata: MessageMetadata;

  // Стоимость отправки
  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  cost: number;

  // Количество сегментов СМС (для расчета стоимости)
  @Column({ default: 1 })
  segmentsCount: number;

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
