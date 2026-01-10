import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATING = 'negotiating',
  CONVERTED = 'converted',
  REJECTED = 'rejected',
  LOST = 'lost',
}

export enum LeadSource {
  WEBSITE = 'website',
  FACEBOOK = 'facebook',
  GOOGLE_ADS = 'google_ads',
  LINKEDIN = 'linkedin',
  EMAIL = 'email',
  PHONE = 'phone',
  REFERRAL = 'referral',
  TRADE_SHOW = 'trade_show',
  WEBINAR = 'webinar',
  CONTENT_MARKETING = 'content_marketing',
  COLD_OUTREACH = 'cold_outreach',
  PARTNER = 'partner',
  OTHER = 'other',
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  position?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  industry?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status!: LeadStatus;

  @Column({ type: 'int', default: 0 })
  score!: number;

  @Column({
    type: 'enum',
    enum: LeadSource,
    nullable: true,
  })
  source?: LeadSource;

  @Column({ nullable: true })
  sourceDetails?: string;

  @Column({ nullable: true })
  campaign?: string;

  @Column({ nullable: true })
  utmSource?: string;

  @Column({ nullable: true })
  utmMedium?: string;

  @Column({ nullable: true })
  utmCampaign?: string;

  @Column({ nullable: true })
  utmContent?: string;

  @Column({ nullable: true })
  utmTerm?: string;

  @Column({
    type: 'enum',
    enum: LeadPriority,
    default: LeadPriority.MEDIUM,
  })
  priority!: LeadPriority;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedValue?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget?: number;

  @Column({ nullable: true })
  decisionTimeframe?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionProbability!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'json', nullable: true })
  customFields?: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ type: 'timestamp', nullable: true })
  lastContactDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextFollowUpDate?: Date;

  @Column({ type: 'int', default: 0 })
  contactAttempts!: number;

  @Column({ type: 'json', nullable: true })
  activityLog?: Array<{ timestamp: Date; action: string; details: string; userId?: string }>;

  @Column({ default: false })
  isQualified!: boolean;

  @Column({ default: false })
  isUnsubscribed!: boolean;

  @Column({ default: false })
  isDoNotCall!: boolean;

  @Column({ nullable: true })
  promoCompanyId?: number;

  @Column({ type: 'uuid', nullable: true })
  companyId?: string;

  @Column({ nullable: true })
  assignedTo?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
