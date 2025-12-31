import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AUDIT_SERVICE } from '../constants';
import { AUDIT_PATTERNS } from '../patterns';
import { AUDIT_EVENTS, AuditAction, AuditEntityType, AuditSeverity } from '../events/audit.events';

export interface AuditLogDto {
  userId?: number;
  username?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  description?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  severity?: AuditSeverity;
  isSystemAction?: boolean;
  serviceName?: string;
  endpoint?: string;
  httpMethod?: string;
  statusCode?: number;
  duration?: number;
  isError?: boolean;
  errorMessage?: string;
}

export interface AuditFilterDto {
  userId?: number;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  isError?: boolean;
  serviceName?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class AuditClientService {
  constructor(
    @Inject(AUDIT_SERVICE) private readonly client: ClientProxy,
  ) {}

  async onModuleInit() {
    await this.client.connect();
  }

  /**
   * Log an audit entry
   */
  async log(dto: AuditLogDto): Promise<void> {
    try {
      this.client.emit(AUDIT_PATTERNS.LOG, dto);
    } catch (error) {
      console.error('Failed to send audit log:', error);
    }
  }

  /**
   * Log entity creation
   */
  async logCreate(
    entityType: AuditEntityType,
    entityId: string,
    newValue: Record<string, unknown>,
    options?: Partial<AuditLogDto>,
  ): Promise<void> {
    await this.log({
      action: AuditAction.CREATE,
      entityType,
      entityId,
      newValue,
      ...options,
    });
  }

  /**
   * Log entity update
   */
  async logUpdate(
    entityType: AuditEntityType,
    entityId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    options?: Partial<AuditLogDto>,
  ): Promise<void> {
    await this.log({
      action: AuditAction.UPDATE,
      entityType,
      entityId,
      oldValue,
      newValue,
      ...options,
    });
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    entityType: AuditEntityType,
    entityId: string,
    oldValue?: Record<string, unknown>,
    options?: Partial<AuditLogDto>,
  ): Promise<void> {
    await this.log({
      action: AuditAction.DELETE,
      entityType,
      entityId,
      oldValue,
      severity: AuditSeverity.HIGH,
      ...options,
    });
  }

  /**
   * Log user login
   */
  async logLogin(userId: number, username: string, ipAddress?: string, userAgent?: string): Promise<void> {
    this.client.emit(AUDIT_EVENTS.USER_LOGIN, {
      userId,
      username,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId: number, username: string): Promise<void> {
    this.client.emit(AUDIT_EVENTS.USER_LOGOUT, {
      userId,
      username,
    });
  }

  /**
   * Log permission change
   */
  async logPermissionChange(
    userId: number,
    username: string,
    targetUserId: number,
    targetUsername: string,
    oldRoles: string[],
    newRoles: string[],
  ): Promise<void> {
    this.client.emit(AUDIT_EVENTS.PERMISSION_CHANGED, {
      userId,
      username,
      targetUserId,
      targetUsername,
      oldRoles,
      newRoles,
    });
  }

  /**
   * Find all audit logs with filters
   */
  async findAll(filter: AuditFilterDto) {
    return firstValueFrom(
      this.client.send(AUDIT_PATTERNS.FIND_ALL, filter).pipe(
        timeout(5000),
        catchError(error => {
          console.error('Failed to fetch audit logs:', error);
          throw error;
        }),
      ),
    );
  }

  /**
   * Find audit log by ID
   */
  async findOne(id: string) {
    return firstValueFrom(
      this.client.send(AUDIT_PATTERNS.FIND_ONE, { id }).pipe(
        timeout(5000),
        catchError(error => {
          console.error('Failed to fetch audit log:', error);
          throw error;
        }),
      ),
    );
  }

  /**
   * Find audit logs by entity
   */
  async findByEntity(entityType: AuditEntityType, entityId: string) {
    return firstValueFrom(
      this.client.send(AUDIT_PATTERNS.FIND_BY_ENTITY, { entityType, entityId }).pipe(
        timeout(5000),
        catchError(error => {
          console.error('Failed to fetch entity audit logs:', error);
          throw error;
        }),
      ),
    );
  }

  /**
   * Find audit logs by user
   */
  async findByUser(userId: number, limit?: number) {
    return firstValueFrom(
      this.client.send(AUDIT_PATTERNS.FIND_BY_USER, { userId, limit }).pipe(
        timeout(5000),
        catchError(error => {
          console.error('Failed to fetch user audit logs:', error);
          throw error;
        }),
      ),
    );
  }

  /**
   * Get audit statistics
   */
  async getStats(period: 'day' | 'week' | 'month' = 'day', entityType?: AuditEntityType) {
    return firstValueFrom(
      this.client.send(AUDIT_PATTERNS.GET_STATS, { period, entityType }).pipe(
        timeout(5000),
        catchError(error => {
          console.error('Failed to fetch audit stats:', error);
          throw error;
        }),
      ),
    );
  }

  /**
   * Get entity timeline
   */
  async getTimeline(entityType: AuditEntityType, entityId: string, limit?: number) {
    return firstValueFrom(
      this.client.send(AUDIT_PATTERNS.GET_TIMELINE, { entityType, entityId, limit }).pipe(
        timeout(5000),
        catchError(error => {
          console.error('Failed to fetch entity timeline:', error);
          throw error;
        }),
      ),
    );
  }

  /**
   * Search audit logs
   */
  async search(query: string, limit?: number) {
    return firstValueFrom(
      this.client.send(AUDIT_PATTERNS.SEARCH, { query, limit }).pipe(
        timeout(5000),
        catchError(error => {
          console.error('Failed to search audit logs:', error);
          throw error;
        }),
      ),
    );
  }
}
