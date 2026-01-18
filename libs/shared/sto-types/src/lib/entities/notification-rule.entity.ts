import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StoNotificationTrigger } from '../enums';
import { StoMessageTemplate } from './message-template.entity';

@Entity('sto_notification_rules')
export class StoNotificationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: StoNotificationTrigger })
  triggerStatus: StoNotificationTrigger;

  @Column('jsonb')
  channels: string[]; // ['sms', 'whatsapp', 'email']

  @Column({ nullable: true })
  templateId: string;

  @ManyToOne(() => StoMessageTemplate, { eager: true })
  @JoinColumn({ name: 'templateId' })
  template: StoMessageTemplate;

  @Column({ type: 'int', default: 0 })
  delayMinutes: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
