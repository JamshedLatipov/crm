import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { SmsTemplate } from './sms-template.entity';
import { SmsSegment } from './sms-segment.entity';
import { SmsMessage } from './sms-message.entity';

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

@Entity('sms_campaigns')
export class SmsCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => SmsTemplate)
  @JoinColumn({ name: 'templateId' })
  template: SmsTemplate;

  @ManyToOne(() => SmsSegment, { nullable: true })
  @JoinColumn({ name: 'segmentId' })
  segment: SmsSegment;

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

  // Настройки кампании
  @Column('jsonb', { nullable: true })
  settings: CampaignSettings;

  // Временные метки
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  pausedAt: Date;

  // Статистика
  @Column({ default: 0 })
  totalRecipients: number;

  @Column({ default: 0 })
  sentCount: number;

  @Column({ default: 0 })
  deliveredCount: number;

  @Column({ default: 0 })
  failedCount: number;

  @Column({ default: 0 })
  pendingCount: number;

  // Стоимость
  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  totalCost: number;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  estimatedCost: number;

  // Процент выполнения
  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  @OneToMany(() => SmsMessage, (message) => message.campaign)
  messages: SmsMessage[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
