import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';

export enum NotificationMetricType {
  TOTAL = 'total',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  PENDING = 'pending',
  READ = 'read',
}

@Entity('notification_analytics')
@Index(['date'])
@Index(['channel', 'date'])
export class NotificationAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  channel: string; // 'websocket', 'email', 'sms', 'webhook', etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  campaignId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  campaignName: string;

  @Column({
    type: 'enum',
    enum: NotificationMetricType,
  })
  metricType: NotificationMetricType;

  @Column('decimal', { precision: 15, scale: 4 })
  value: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
