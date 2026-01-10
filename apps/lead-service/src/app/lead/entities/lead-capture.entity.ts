import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './lead.entity';

export enum CaptureSource {
  WEBSITE_FORM = 'website_form',
  SOCIAL_MEDIA = 'social_media',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  GOOGLE_ADS = 'google_ads',
  EMAIL = 'email',
  COLD_CALL = 'cold_call',
  CHAT = 'chat',
  REFERRAL = 'referral',
  ZAPIER = 'zapier',
  MAILCHIMP = 'mailchimp',
  API = 'api',
  WEBHOOK = 'webhook',
}

@Entity('lead_captures')
export class LeadCapture {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'lead_id', nullable: true })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'enum', enum: CaptureSource })
  source: CaptureSource;

  @Column({ name: 'source_id', nullable: true })
  sourceId: string;

  @Column({ type: 'jsonb', name: 'raw_data', nullable: true })
  rawData: Record<string, any>;

  @Column({ type: 'jsonb', name: 'mapped_data', nullable: true })
  mappedData: Record<string, any>;

  @Column({ type: 'jsonb', name: 'field_mapping', nullable: true })
  fieldMapping: Record<string, string>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  referrer: string;

  @Column({ name: 'utm_source', nullable: true })
  utmSource: string;

  @Column({ name: 'utm_medium', nullable: true })
  utmMedium: string;

  @Column({ name: 'utm_campaign', nullable: true })
  utmCampaign: string;

  @Column({ name: 'utm_term', nullable: true })
  utmTerm: string;

  @Column({ name: 'utm_content', nullable: true })
  utmContent: string;

  @Column({ default: false })
  processed: boolean;

  @Column({ name: 'processing_error', nullable: true })
  processingError: string;

  @CreateDateColumn({ name: 'captured_at' })
  capturedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
