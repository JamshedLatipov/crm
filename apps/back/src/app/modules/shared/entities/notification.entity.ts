import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum NotificationType {
  // Lead-related notifications
  LEAD_SCORE_THRESHOLD = 'lead_score_threshold',
  HOT_LEAD_DETECTED = 'hot_lead_detected',
  LEAD_SCORE_INCREASED = 'lead_score_increased',
  LEAD_SCORE_DECREASED = 'lead_score_decreased',
  LEAD_BECAME_HOT = 'lead_became_hot',
  LEAD_BECAME_WARM = 'lead_became_warm',
  LEAD_BECAME_COLD = 'lead_became_cold',
  LEAD_CREATED = 'lead_created',
  LEAD_ASSIGNED = 'lead_assigned',
  LEAD_STATUS_CHANGED = 'lead_status_changed',
  LEAD_OVERDUE = 'lead_overdue',
  
  // Deal-related notifications
  DEAL_CREATED = 'deal_created',
  DEAL_MOVED = 'deal_moved',
  DEAL_STAGE_CHANGED = 'deal_stage_changed',
  DEAL_WON = 'deal_won',
  DEAL_LOST = 'deal_lost',
  DEAL_ASSIGNED = 'deal_assigned',
  DEAL_AMOUNT_CHANGED = 'deal_amount_changed',
  DEAL_OVERDUE = 'deal_overdue',
  DEAL_CLOSE_DATE_APPROACHING = 'deal_close_date_approaching',
  DEAL_STALE = 'deal_stale',
  DEAL_HIGH_VALUE = 'deal_high_value',
  
  // Task-related notifications
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_DELETED = 'task_deleted',
  TASK_ASSIGNED = 'task_assigned',
  TASK_OVERDUE = 'task_overdue',
  
  // General system notifications
  SYSTEM_REMINDER = 'system_reminder',
  MEETING_REMINDER = 'meeting_reminder'
}

export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  SLACK = 'slack',
  WEBHOOK = 'webhook'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: NotificationType
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM
  })
  priority: NotificationPriority;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING
  })
  status: NotificationStatus;

  @Column()
  recipientId: string; // ID пользователя-получателя

  @Column({ nullable: true })
  recipientEmail?: string;

  @Column({ nullable: true })
  recipientPhone?: string;

  @Column({ type: 'json', nullable: true })
  data: {
    // Lead-related data
    leadId?: number;
    leadName?: string;
    leadEmail?: string;
    previousScore?: number;
    currentScore?: number;
    temperature?: string;
    scoreChange?: number;
    leadStatus?: string;
    leadSource?: string;
    
    // Deal-related data
    dealId?: number;
    dealTitle?: string;
    dealValue?: number;
    previousValue?: number;
    dealStage?: string;
    previousStage?: string;
    dealStatus?: string;
    closeDate?: string;
    daysToClose?: number;
    dealOwner?: string;
    
    // Task-related data
    taskId?: number;
    taskTitle?: string;
    taskStatus?: string;
    previousTaskStatus?: string;
    assignedTo?: string;
    assignedBy?: string;
    changes?: Record<string, { old: any; new: any }>;
    
    // Common data
    actionUrl?: string;
    entityType?: 'lead' | 'deal' | 'task' | 'meeting';
    [key: string]: any;
  };

  @Column({ nullable: true })
  scheduledAt?: Date; // Время когда должно быть отправлено

  @Column({ nullable: true })
  sentAt?: Date;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @Column({ nullable: true })
  readAt?: Date;

  @Column({ nullable: true })
  failedAt?: Date;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    emailId?: string;
    pushId?: string;
    smsId?: string;
    webhookResponse?: any;
    retryCount?: number;
    [key: string]: any;
  };

  @Column({ nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Вспомогательные методы
  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  canRetry(): boolean {
    const maxRetries = 3;
    const retryCount = this.metadata?.retryCount || 0;
    return this.status === NotificationStatus.FAILED && retryCount < maxRetries;
  }

  markAsSent(): void {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
  }

  markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  markAsRead(): void {
    this.status = NotificationStatus.READ;
    this.readAt = new Date();
  }

  markAsFailed(reason: string): void {
    this.status = NotificationStatus.FAILED;
    this.failedAt = new Date();
    this.failureReason = reason;
    
    // Увеличиваем счетчик попыток
    if (!this.metadata) this.metadata = {};
    this.metadata.retryCount = (this.metadata.retryCount || 0) + 1;
  }
}