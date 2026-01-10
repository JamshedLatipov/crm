import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CaptureSource } from './lead-capture.entity';

@Entity('lead_capture_configs')
export class LeadCaptureConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: CaptureSource })
  source: CaptureSource;

  @Column({ name: 'api_key', nullable: true })
  apiKey: string;

  @Column({ name: 'api_secret', nullable: true })
  apiSecret: string;

  @Column({ name: 'webhook_url', nullable: true })
  webhookUrl: string;

  @Column({ type: 'jsonb', name: 'field_mapping', nullable: true, default: {} })
  fieldMapping: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  settings: Record<string, any>;

  @Column({ name: 'default_status', nullable: true })
  defaultStatus: string;

  @Column({ name: 'default_assignee', nullable: true })
  defaultAssignee: number;

  @Column({ name: 'auto_create_lead', default: true })
  autoCreateLead: boolean;

  @Column({ name: 'deduplicate_by', nullable: true })
  deduplicateBy: string; // email, phone, email_phone

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
