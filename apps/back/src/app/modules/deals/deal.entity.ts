import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PipelineStage } from '../pipeline/pipeline.entity';

export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
}

export enum LeadSource {
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  OTHER = 'other',
}

@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  leadId?: string; // Связь с лидом (если сделка создана из лида)

  @Column({ nullable: true })
  contactId?: string; // Связь с контактом

  // Контактная информация (deprecated - используйте contactId)
  @Column('json', { nullable: true })
  contact?: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  };

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column({ default: 'RUB' })
  currency: string;

  @Column('int', { default: 50 })
  probability: number; // 0-100

  @Column('timestamp')
  expectedCloseDate: Date;

  @Column('timestamp', { nullable: true })
  actualCloseDate?: Date;

  @Column()
  stageId: string;

  @ManyToOne(() => PipelineStage)
  @JoinColumn({ name: 'stageId' })
  stage: PipelineStage;

  @Column({
    type: 'enum',
    enum: DealStatus,
    default: DealStatus.OPEN,
  })
  status: DealStatus;

  @Column()
  assignedTo: string; // ID менеджера

  @Column('text', { nullable: true })
  notes?: string;

  @Column('json', { nullable: true })
  meta?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
