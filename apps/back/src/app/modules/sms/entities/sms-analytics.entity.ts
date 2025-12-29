import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { SmsCampaign } from './sms-campaign.entity';
import { User } from '../../user/user.entity';

export enum MetricType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  COST = 'cost',
  RESPONSE_RATE = 'response_rate',
}

@Entity('sms_analytics')
@Index(['campaign', 'date'])
@Index(['date'])
export class SmsAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SmsCampaign, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign: SmsCampaign;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: MetricType,
  })
  metricType: MetricType;

  @Column('decimal', { precision: 15, scale: 4 })
  value: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
