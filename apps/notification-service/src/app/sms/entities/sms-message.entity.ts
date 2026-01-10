import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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
  providerId?: string;
  providerName?: string;
  errorCode?: string;
  errorMessage?: string;
  deliveryDetails?: any;
  retryCount?: number;
  variables?: Record<string, any>;
}

@Entity('sms_messages')
@Index(['status'])
@Index(['phoneNumber'])
@Index(['createdAt'])
export class SmsMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  campaignId?: string;

  @Column({ nullable: true })
  contactId?: number;

  @Column({ nullable: true })
  leadId?: number;

  @Column()
  phoneNumber!: string;

  @Column('text')
  content!: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status!: MessageStatus;

  @Column({
    type: 'enum',
    enum: MessageDirection,
    default: MessageDirection.OUTBOUND,
  })
  direction!: MessageDirection;

  @Column({ nullable: true })
  templateId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: MessageMetadata;

  @Column({ nullable: true })
  sentAt?: Date;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @Column({ nullable: true })
  failedAt?: Date;

  @Column({ type: 'int', default: 0 })
  segments!: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  cost?: number;

  @Column({ nullable: true })
  sender?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
