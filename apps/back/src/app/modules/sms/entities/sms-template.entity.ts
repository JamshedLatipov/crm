import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';

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
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
    default: TemplateCategory.OTHER,
  })
  category: TemplateCategory;

  // Переменные в шаблоне (например: {{firstName}}, {{company}}, {{amount}})
  @Column('simple-array', { nullable: true })
  variables: string[];

  @Column({ default: true })
  isActive: boolean;

  // Статистика использования
  @Column({ default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  deliveryRate: number; // Процент доставленных

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  responseRate: number; // Процент откликов

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
