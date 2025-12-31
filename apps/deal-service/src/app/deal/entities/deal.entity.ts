import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  contactId?: string;

  @Column({ nullable: true })
  companyId?: string;

  @Column({ nullable: true })
  leadId?: string;

  @Column('decimal', { precision: 15, scale: 2 })
  amount!: number;

  @Column({ default: 'TJS' })
  currency!: string;

  @Column('int', { default: 50 })
  probability!: number;

  @Column('timestamp')
  expectedCloseDate!: Date;

  @Column('timestamp', { nullable: true })
  actualCloseDate?: Date;

  @Column({ nullable: true })
  stageId?: string;

  @Column({
    type: 'enum',
    enum: DealStatus,
    default: DealStatus.OPEN,
  })
  status!: DealStatus;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('json', { nullable: true })
  meta?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
