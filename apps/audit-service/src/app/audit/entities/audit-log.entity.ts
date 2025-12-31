import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  ASSIGN = 'assign',
  STATUS_CHANGE = 'status_change',
  CALL_START = 'call_start',
  CALL_END = 'call_end',
  EMAIL_SENT = 'email_sent',
  PERMISSION_CHANGE = 'permission_change',
  BULK_ACTION = 'bulk_action',
}

export enum AuditEntityType {
  USER = 'user',
  LEAD = 'lead',
  CONTACT = 'contact',
  DEAL = 'deal',
  TASK = 'task',
  CALL = 'call',
  CAMPAIGN = 'campaign',
  TEMPLATE = 'template',
  NOTIFICATION = 'notification',
  PIPELINE = 'pipeline',
  REPORT = 'report',
  SYSTEM = 'system',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
@Index(['action', 'createdAt'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @Index()
  userId: number;

  @Column({ nullable: true })
  username: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  @Index()
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditEntityType,
  })
  entityType: AuditEntityType;

  @Column({ nullable: true })
  entityId: string;

  @Column({ nullable: true })
  entityName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValue: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  newValue: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, { old: unknown; new: unknown }>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  requestId: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.LOW,
  })
  severity: AuditSeverity;

  @Column({ default: false })
  isSystemAction: boolean;

  @Column({ nullable: true })
  serviceName: string;

  @Column({ nullable: true })
  endpoint: string;

  @Column({ nullable: true })
  httpMethod: string;

  @Column({ nullable: true })
  statusCode: number;

  @Column({ nullable: true })
  duration: number; // milliseconds

  @Column({ default: false })
  isError: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}
