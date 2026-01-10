import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TemplateCategory {
  MARKETING = 'marketing',
  TRANSACTIONAL = 'transactional',
  NOTIFICATION = 'notification',
  REMINDER = 'reminder',
  PROMOTIONAL = 'promotional',
  WELCOME = 'welcome',
  VERIFICATION = 'verification',
  OTHER = 'other',
}

@Entity('sms_templates')
export class SmsTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('text')
  content!: string;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
    default: TemplateCategory.OTHER,
  })
  category!: TemplateCategory;

  @Column('simple-array', { nullable: true })
  variables?: string[];

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 0 })
  usageCount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  deliveryRate!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  responseRate!: number;

  @Column({ nullable: true })
  createdById?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
