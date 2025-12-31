import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RetentionPolicy {
  DAYS_30 = '30_days',
  DAYS_90 = '90_days',
  DAYS_180 = '180_days',
  DAYS_365 = '365_days',
  FOREVER = 'forever',
}

@Entity('audit_settings')
export class AuditSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'jsonb' })
  value: Record<string, unknown>;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;
}

@Entity('audit_retention')
@Index(['entityType', 'action'])
export class AuditRetention {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  entityType: string;

  @Column({ nullable: true })
  action: string;

  @Column({
    type: 'enum',
    enum: RetentionPolicy,
    default: RetentionPolicy.DAYS_90,
  })
  policy: RetentionPolicy;

  @Column({ type: 'int', default: 90 })
  retentionDays: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
