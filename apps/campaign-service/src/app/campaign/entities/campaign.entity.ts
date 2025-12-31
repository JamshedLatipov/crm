import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Template } from './template.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CampaignType {
  EMAIL = 'email',
  SMS = 'sms',
  CALL = 'call',
  MIXED = 'mixed',
}

export enum AudienceType {
  ALL_CONTACTS = 'all_contacts',
  ALL_LEADS = 'all_leads',
  SEGMENT = 'segment',
  CUSTOM = 'custom',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
    default: CampaignType.EMAIL,
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({
    type: 'enum',
    enum: AudienceType,
    default: AudienceType.ALL_CONTACTS,
  })
  audienceType: AudienceType;

  @Column({ type: 'jsonb', nullable: true })
  audienceFilters: Record<string, unknown>;

  @Column({ nullable: true })
  templateId: number;

  @ManyToOne(() => Template, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: Template;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ default: 0 })
  totalRecipients: number;

  @Column({ default: 0 })
  sent: number;

  @Column({ default: 0 })
  delivered: number;

  @Column({ default: 0 })
  opened: number;

  @Column({ default: 0 })
  clicked: number;

  @Column({ default: 0 })
  bounced: number;

  @Column({ default: 0 })
  unsubscribed: number;

  @Column({ nullable: true })
  createdBy: number;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
