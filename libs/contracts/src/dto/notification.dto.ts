import { IsString, IsOptional, IsNumber, IsEnum, IsObject, IsArray, IsDateString, IsEmail } from 'class-validator';

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
  LEAD_ASSIGNED = 'lead_assigned',
  LEAD_STATUS_CHANGED = 'lead_status_changed',
  DEAL_STAGE_CHANGED = 'deal_stage_changed',
  DEAL_WON = 'deal_won',
  DEAL_LOST = 'deal_lost',
  CALL_MISSED = 'call_missed',
  CALL_RECEIVED = 'call_received',
  SYSTEM = 'system',
  CUSTOM = 'custom',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBSOCKET = 'websocket',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export class SendNotificationDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsString()
  recipientId!: string;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SendBulkNotificationDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsArray()
  @IsString({ each: true })
  recipientIds!: string[];

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class NotificationFilterDto {
  @IsOptional()
  @IsString()
  recipientId?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class MarkReadDto {
  @IsArray()
  @IsNumber({}, { each: true })
  notificationIds!: number[];
}

export interface NotificationResponseDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  data?: Record<string, unknown>;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponseDto {
  items: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

export interface UnreadCountResponseDto {
  count: number;
  byType: Record<string, number>;
}
