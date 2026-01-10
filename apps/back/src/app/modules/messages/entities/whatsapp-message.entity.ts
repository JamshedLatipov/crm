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

export enum WhatsAppMessageStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export enum WhatsAppMessageType {
  TEXT = 'text',
  TEMPLATE = 'template',
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  LOCATION = 'location',
  CONTACTS = 'contacts',
}

export interface WhatsAppMessageMetadata {
  messageId?: string; // ID сообщения от WhatsApp API
  wamid?: string; // WhatsApp Message ID
  errorCode?: string;
  errorMessage?: string;
  templateName?: string; // Имя шаблона, если используется
  templateLanguage?: string;
  templateParameters?: any[];
  retryCount?: number;
  variables?: Record<string, any>;
}

@Entity('whatsapp_messages')
@Index(['campaign', 'status'])
@Index(['phoneNumber'])
@Index(['createdAt'])
export class WhatsAppMessage {
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
    enum: WhatsAppMessageType,
    default: WhatsAppMessageType.TEXT,
  })
  messageType: WhatsAppMessageType;

  @Column({
    type: 'enum',
    enum: WhatsAppMessageStatus,
    default: WhatsAppMessageStatus.PENDING,
  })
  status: WhatsAppMessageStatus;

  // Метаданные сообщения
  @Column('jsonb', { nullable: true })
  metadata: WhatsAppMessageMetadata;

  // URL медиафайла (для изображений, видео и т.д.)
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
  readAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
