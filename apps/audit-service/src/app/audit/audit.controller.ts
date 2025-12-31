import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { AuditService, CreateAuditLogDto, AuditFilterDto } from './audit.service';
import { AuditAction, AuditEntityType, AuditSeverity } from './entities/audit-log.entity';

// Message patterns for audit service
export const AUDIT_PATTERNS = {
  LOG: 'audit.log',
  FIND_ALL: 'audit.findAll',
  FIND_ONE: 'audit.findOne',
  FIND_BY_ENTITY: 'audit.findByEntity',
  FIND_BY_USER: 'audit.findByUser',
  GET_STATS: 'audit.getStats',
  GET_TIMELINE: 'audit.getTimeline',
  SEARCH: 'audit.search',
  GET_SECURITY_EVENTS: 'audit.getSecurityEvents',
  GET_ERRORS: 'audit.getErrors',
};

// Event patterns (from other services)
export const AUDIT_EVENTS = {
  USER_LOGIN: 'audit.event.user.login',
  USER_LOGOUT: 'audit.event.user.logout',
  ENTITY_CREATED: 'audit.event.entity.created',
  ENTITY_UPDATED: 'audit.event.entity.updated',
  ENTITY_DELETED: 'audit.event.entity.deleted',
  PERMISSION_CHANGED: 'audit.event.permission.changed',
  CALL_STARTED: 'audit.event.call.started',
  CALL_ENDED: 'audit.event.call.ended',
};

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // HTTP Endpoints
  @Get()
  async findAll(@Query() filter: AuditFilterDto) {
    return this.auditService.findAll(filter);
  }

  @Get('stats')
  async getStats(
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
    @Query('entityType') entityType?: AuditEntityType,
  ) {
    return this.auditService.getStats({ period, entityType });
  }

  @Get('security')
  async getSecurityEvents(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.auditService.getSecurityEvents(page, limit);
  }

  @Get('errors')
  async getErrors(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.auditService.getErrorLogs(page, limit);
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('limit') limit = 50,
  ) {
    return this.auditService.searchLogs(query, limit);
  }

  @Get('entity/:entityType/:entityId')
  async findByEntity(
    @Param('entityType') entityType: AuditEntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }

  @Get('entity/:entityType/:entityId/timeline')
  async getTimeline(
    @Param('entityType') entityType: AuditEntityType,
    @Param('entityId') entityId: string,
    @Query('limit') limit = 50,
  ) {
    return this.auditService.getTimeline(entityType, entityId, limit);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Query('limit') limit = 100,
  ) {
    return this.auditService.findByUser(parseInt(userId, 10), limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAuditLogDto) {
    return this.auditService.create(dto);
  }

  // RabbitMQ Message Patterns
  @MessagePattern(AUDIT_PATTERNS.LOG)
  async handleLog(@Payload() dto: CreateAuditLogDto) {
    return this.auditService.create(dto);
  }

  @MessagePattern(AUDIT_PATTERNS.FIND_ALL)
  async handleFindAll(@Payload() filter: AuditFilterDto) {
    return this.auditService.findAll(filter);
  }

  @MessagePattern(AUDIT_PATTERNS.FIND_ONE)
  async handleFindOne(@Payload() data: { id: string }) {
    return this.auditService.findOne(data.id);
  }

  @MessagePattern(AUDIT_PATTERNS.FIND_BY_ENTITY)
  async handleFindByEntity(
    @Payload() data: { entityType: AuditEntityType; entityId: string },
  ) {
    return this.auditService.findByEntity(data.entityType, data.entityId);
  }

  @MessagePattern(AUDIT_PATTERNS.FIND_BY_USER)
  async handleFindByUser(@Payload() data: { userId: number; limit?: number }) {
    return this.auditService.findByUser(data.userId, data.limit);
  }

  @MessagePattern(AUDIT_PATTERNS.GET_STATS)
  async handleGetStats(
    @Payload() data: { period: 'day' | 'week' | 'month'; entityType?: AuditEntityType },
  ) {
    return this.auditService.getStats(data);
  }

  @MessagePattern(AUDIT_PATTERNS.GET_TIMELINE)
  async handleGetTimeline(
    @Payload() data: { entityType: AuditEntityType; entityId: string; limit?: number },
  ) {
    return this.auditService.getTimeline(data.entityType, data.entityId, data.limit);
  }

  @MessagePattern(AUDIT_PATTERNS.SEARCH)
  async handleSearch(@Payload() data: { query: string; limit?: number }) {
    return this.auditService.searchLogs(data.query, data.limit);
  }

  // Event Handlers (from other services)
  @EventPattern(AUDIT_EVENTS.USER_LOGIN)
  async handleUserLogin(
    @Payload() data: { userId: number; username: string; ipAddress?: string; userAgent?: string },
  ) {
    await this.auditService.create({
      userId: data.userId,
      username: data.username,
      action: AuditAction.LOGIN,
      entityType: AuditEntityType.USER,
      entityId: data.userId.toString(),
      description: `User ${data.username} logged in`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      severity: AuditSeverity.MEDIUM,
    });
  }

  @EventPattern(AUDIT_EVENTS.USER_LOGOUT)
  async handleUserLogout(
    @Payload() data: { userId: number; username: string },
  ) {
    await this.auditService.create({
      userId: data.userId,
      username: data.username,
      action: AuditAction.LOGOUT,
      entityType: AuditEntityType.USER,
      entityId: data.userId.toString(),
      description: `User ${data.username} logged out`,
      severity: AuditSeverity.LOW,
    });
  }

  @EventPattern(AUDIT_EVENTS.ENTITY_CREATED)
  async handleEntityCreated(
    @Payload() data: {
      userId?: number;
      username?: string;
      entityType: AuditEntityType;
      entityId: string;
      entityName?: string;
      newValue?: Record<string, unknown>;
      serviceName?: string;
    },
  ) {
    await this.auditService.create({
      userId: data.userId,
      username: data.username,
      action: AuditAction.CREATE,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      description: `Created ${data.entityType} ${data.entityName || data.entityId}`,
      newValue: data.newValue,
      serviceName: data.serviceName,
    });
  }

  @EventPattern(AUDIT_EVENTS.ENTITY_UPDATED)
  async handleEntityUpdated(
    @Payload() data: {
      userId?: number;
      username?: string;
      entityType: AuditEntityType;
      entityId: string;
      entityName?: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
      serviceName?: string;
    },
  ) {
    await this.auditService.create({
      userId: data.userId,
      username: data.username,
      action: AuditAction.UPDATE,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      description: `Updated ${data.entityType} ${data.entityName || data.entityId}`,
      oldValue: data.oldValue,
      newValue: data.newValue,
      serviceName: data.serviceName,
    });
  }

  @EventPattern(AUDIT_EVENTS.ENTITY_DELETED)
  async handleEntityDeleted(
    @Payload() data: {
      userId?: number;
      username?: string;
      entityType: AuditEntityType;
      entityId: string;
      entityName?: string;
      oldValue?: Record<string, unknown>;
      serviceName?: string;
    },
  ) {
    await this.auditService.create({
      userId: data.userId,
      username: data.username,
      action: AuditAction.DELETE,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      description: `Deleted ${data.entityType} ${data.entityName || data.entityId}`,
      oldValue: data.oldValue,
      serviceName: data.serviceName,
      severity: AuditSeverity.HIGH,
    });
  }

  @EventPattern(AUDIT_EVENTS.PERMISSION_CHANGED)
  async handlePermissionChanged(
    @Payload() data: {
      userId: number;
      username: string;
      targetUserId: number;
      targetUsername: string;
      oldRoles?: string[];
      newRoles?: string[];
    },
  ) {
    await this.auditService.create({
      userId: data.userId,
      username: data.username,
      action: AuditAction.PERMISSION_CHANGE,
      entityType: AuditEntityType.USER,
      entityId: data.targetUserId.toString(),
      entityName: data.targetUsername,
      description: `Changed permissions for user ${data.targetUsername}`,
      oldValue: { roles: data.oldRoles },
      newValue: { roles: data.newRoles },
      severity: AuditSeverity.CRITICAL,
    });
  }

  @EventPattern(AUDIT_EVENTS.CALL_STARTED)
  async handleCallStarted(
    @Payload() data: {
      userId: number;
      username: string;
      callId: string;
      phoneNumber: string;
      direction: string;
    },
  ) {
    await this.auditService.create({
      userId: data.userId,
      username: data.username,
      action: AuditAction.CALL_START,
      entityType: AuditEntityType.CALL,
      entityId: data.callId,
      description: `${data.direction} call to ${data.phoneNumber}`,
      metadata: { phoneNumber: data.phoneNumber, direction: data.direction },
    });
  }

  @EventPattern(AUDIT_EVENTS.CALL_ENDED)
  async handleCallEnded(
    @Payload() data: {
      userId: number;
      username: string;
      callId: string;
      duration: number;
      status: string;
    },
  ) {
    await this.auditService.create({
      userId: data.userId,
      username: data.username,
      action: AuditAction.CALL_END,
      entityType: AuditEntityType.CALL,
      entityId: data.callId,
      description: `Call ended - ${data.status} (${data.duration}s)`,
      metadata: { duration: data.duration, status: data.status },
    });
  }
}
