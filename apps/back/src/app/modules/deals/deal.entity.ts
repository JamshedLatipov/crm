import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PipelineStage } from '../pipeline/pipeline.entity';
import { Company } from '../companies/entities/company.entity';
import { Contact } from '../contacts/contact.entity';
import { Lead } from '../leads/lead.entity';
import { Assignment } from '../shared/entities/assignment.entity';

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

  // Связи с другими сущностями
  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact?: Contact;

  @ManyToOne(() => Company, company => company.deals, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead?: Lead;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column({ default: 'TJS' })
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


  @Column('text', { nullable: true })
  notes?: string;

  @Column('jsonb', { nullable: true })
  customFields?: Record<string, unknown>;

  @Column('json', { nullable: true })
  meta?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Assignment, assignment => assignment.deal)
  assignments?: Assignment[];
}
