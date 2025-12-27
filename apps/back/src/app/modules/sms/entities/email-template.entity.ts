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

export enum EmailTemplateCategory {
  MARKETING = 'marketing',
  TRANSACTIONAL = 'transactional',
  NOTIFICATION = 'notification',
  NEWSLETTER = 'newsletter',
  WELCOME = 'welcome',
  PROMOTIONAL = 'promotional',
  SYSTEM = 'system',
  OTHER = 'other',
}

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  subject: string;

  @Column('text')
  htmlContent: string;

  @Column('text', { nullable: true })
  textContent: string;

  @Column({
    type: 'enum',
    enum: EmailTemplateCategory,
    default: EmailTemplateCategory.OTHER,
  })
  category: EmailTemplateCategory;

  // Переменные в шаблоне (например: {{firstName}}, {{company}})
  @Column('jsonb', { nullable: true })
  variables: Record<string, string>;

  @Column({ default: true })
  isActive: boolean;

  // Статистика отправки
  @Column({ default: 0 })
  totalSent: number;

  @Column({ default: 0 })
  totalDelivered: number;

  @Column({ default: 0 })
  totalOpened: number;

  @Column({ default: 0 })
  totalClicked: number;

  @Column({ default: 0 })
  totalBounced: number;

  @Column({ default: 0 })
  totalUnsubscribed: number;

  // CSS стили для email
  @Column('text', { nullable: true })
  cssStyles: string;

  // Preheader текст (отображается после subject в почтовых клиентах)
  @Column({ nullable: true, length: 150 })
  preheader: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
