import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum NotificationRuleTrigger {
  LEAD_CREATED = 'lead_created',
  LEAD_UPDATED = 'lead_updated',
  LEAD_ASSIGNED = 'lead_assigned',
  LEAD_STATUS_CHANGED = 'lead_status_changed',
  DEAL_CREATED = 'deal_created',
  DEAL_UPDATED = 'deal_updated',
  DEAL_STAGE_CHANGED = 'deal_stage_changed',
  DEAL_WON = 'deal_won',
  DEAL_LOST = 'deal_lost',
  TASK_CREATED = 'task_created',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
  TASK_DUE_SOON = 'task_due_soon',
  CONTACT_CREATED = 'contact_created',
  COMPANY_CREATED = 'company_created',
  CALL_COMPLETED = 'call_completed',
  CALL_MISSED = 'call_missed',
  MEETING_SCHEDULED = 'meeting_scheduled',
  CUSTOM = 'custom',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  TELEGRAM = 'telegram',
}

@Entity('notification_rules')
export class NotificationRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: NotificationRuleTrigger })
  trigger: NotificationRuleTrigger;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  conditions: Record<string, any>;

  @Column({ type: 'enum', enum: NotificationChannel, array: true, default: [NotificationChannel.IN_APP] })
  channels: NotificationChannel[];

  @Column({ type: 'jsonb', name: 'template', nullable: true })
  template: {
    subject?: string;
    body: string;
    variables?: string[];
  };

  @Column({ type: 'jsonb', name: 'recipients', nullable: true })
  recipients: {
    users?: number[];
    roles?: string[];
    dynamic?: string; // 'owner', 'assignee', 'created_by'
  };

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
