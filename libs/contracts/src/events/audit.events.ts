import { BaseEvent } from './base.event';

/**
 * Audit Events - events emitted from other services to be logged by Audit Service
 * These are published by various services and consumed by the Audit Service
 */

// Audit Event Patterns (for publishing)
export const AUDIT_EVENTS = {
  USER_LOGIN: 'audit.event.user.login',
  USER_LOGOUT: 'audit.event.user.logout',
  ENTITY_CREATED: 'audit.event.entity.created',
  ENTITY_UPDATED: 'audit.event.entity.updated',
  ENTITY_DELETED: 'audit.event.entity.deleted',
  PERMISSION_CHANGED: 'audit.event.permission.changed',
  CALL_STARTED: 'audit.event.call.started',
  CALL_ENDED: 'audit.event.call.ended',
  EMAIL_SENT: 'audit.event.email.sent',
  BULK_ACTION: 'audit.event.bulk.action',
  EXPORT_DATA: 'audit.event.export.data',
  IMPORT_DATA: 'audit.event.import.data',
} as const;

// Audit Actions
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

// Audit Entity Types
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

// Audit Severity Levels
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Event Payloads
export interface UserLoginAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.USER_LOGIN;
  payload: {
    userId: number;
    username: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

export interface UserLogoutAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.USER_LOGOUT;
  payload: {
    userId: number;
    username: string;
    sessionId?: string;
  };
}

export interface EntityCreatedAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.ENTITY_CREATED;
  payload: {
    userId?: number;
    username?: string;
    entityType: AuditEntityType;
    entityId: string;
    entityName?: string;
    newValue?: Record<string, unknown>;
    serviceName?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface EntityUpdatedAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.ENTITY_UPDATED;
  payload: {
    userId?: number;
    username?: string;
    entityType: AuditEntityType;
    entityId: string;
    entityName?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    serviceName?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface EntityDeletedAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.ENTITY_DELETED;
  payload: {
    userId?: number;
    username?: string;
    entityType: AuditEntityType;
    entityId: string;
    entityName?: string;
    oldValue?: Record<string, unknown>;
    serviceName?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface PermissionChangedAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.PERMISSION_CHANGED;
  payload: {
    userId: number;
    username: string;
    targetUserId: number;
    targetUsername: string;
    oldRoles?: string[];
    newRoles?: string[];
    metadata?: Record<string, unknown>;
  };
}

export interface CallStartedAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.CALL_STARTED;
  payload: {
    userId: number;
    username: string;
    callId: string;
    phoneNumber: string;
    direction: 'inbound' | 'outbound';
    contactId?: number;
    leadId?: number;
    metadata?: Record<string, unknown>;
  };
}

export interface CallEndedAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.CALL_ENDED;
  payload: {
    userId: number;
    username: string;
    callId: string;
    duration: number;
    status: string;
    recordingUrl?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface BulkActionAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.BULK_ACTION;
  payload: {
    userId: number;
    username: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityIds: string[];
    description?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ExportDataAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.EXPORT_DATA;
  payload: {
    userId: number;
    username: string;
    entityType: AuditEntityType;
    format: 'csv' | 'excel' | 'pdf';
    recordCount: number;
    filters?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
}

export interface ImportDataAuditEvent extends BaseEvent {
  type: typeof AUDIT_EVENTS.IMPORT_DATA;
  payload: {
    userId: number;
    username: string;
    entityType: AuditEntityType;
    source: string;
    recordCount: number;
    successCount?: number;
    errorCount?: number;
    metadata?: Record<string, unknown>;
  };
}

// Union type for all audit events
export type AuditEvent =
  | UserLoginAuditEvent
  | UserLogoutAuditEvent
  | EntityCreatedAuditEvent
  | EntityUpdatedAuditEvent
  | EntityDeletedAuditEvent
  | PermissionChangedAuditEvent
  | CallStartedAuditEvent
  | CallEndedAuditEvent
  | BulkActionAuditEvent
  | ExportDataAuditEvent
  | ImportDataAuditEvent;
