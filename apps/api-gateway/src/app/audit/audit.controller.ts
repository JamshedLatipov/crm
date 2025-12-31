import {
  Controller,
  Get,
  Query,
  Param,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { SERVICES, AUDIT_PATTERNS } from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('audit')
@ApiBearerAuth('JWT-auth')
@Controller('audit')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(
    @Inject(SERVICES.AUDIT) private readonly auditClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs', description: 'Retrieve audit logs with filtering' })
  @ApiQuery({ name: 'userId', description: 'Filter by user ID', required: false })
  @ApiQuery({ name: 'action', description: 'Filter by action type', required: false })
  @ApiQuery({ name: 'entityType', description: 'Filter by entity type', required: false })
  @ApiQuery({ name: 'entityId', description: 'Filter by entity ID', required: false })
  @ApiQuery({ name: 'from', description: 'Start date', required: false })
  @ApiQuery({ name: 'to', description: 'End date', required: false })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  async findAll(@Query() filter: Record<string, unknown>) {
    return firstValueFrom(
      this.auditClient.send(AUDIT_PATTERNS.FIND_ALL, filter).pipe(timeout(5000)),
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit statistics', description: 'Get aggregated audit statistics' })
  @ApiQuery({ name: 'period', description: 'Time period (day, week, month)', required: false })
  @ApiQuery({ name: 'entityType', description: 'Filter by entity type', required: false })
  @ApiResponse({ status: 200, description: 'Audit statistics' })
  async getStats(
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
    @Query('entityType') entityType?: string,
  ) {
    return firstValueFrom(
      this.auditClient.send(AUDIT_PATTERNS.GET_STATS, { period, entityType }).pipe(timeout(5000)),
    );
  }

  @Get('security')
  @ApiOperation({ summary: 'Get security events', description: 'Get login/logout and permission change events' })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  @ApiResponse({ status: 200, description: 'Security events' })
  async getSecurityEvents(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return firstValueFrom(
      this.auditClient.send(AUDIT_PATTERNS.GET_SECURITY_EVENTS, { page, limit }).pipe(timeout(5000)),
    );
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get error logs', description: 'Get audit logs with errors' })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  @ApiResponse({ status: 200, description: 'Error logs' })
  async getErrors(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return firstValueFrom(
      this.auditClient.send(AUDIT_PATTERNS.GET_ERRORS, { page, limit }).pipe(timeout(5000)),
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search audit logs', description: 'Full-text search in audit logs' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query: string,
    @Query('limit') limit = 50,
  ) {
    return firstValueFrom(
      this.auditClient.send(AUDIT_PATTERNS.SEARCH, { query, limit }).pipe(timeout(5000)),
    );
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get entity history', description: 'Get audit history for a specific entity' })
  @ApiParam({ name: 'entityType', description: 'Entity type (lead, deal, contact, etc.)' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiResponse({ status: 200, description: 'Entity audit history' })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return firstValueFrom(
      this.auditClient.send(AUDIT_PATTERNS.FIND_BY_ENTITY, { entityType, entityId }).pipe(timeout(5000)),
    );
  }

  @Get('entity/:entityType/:entityId/timeline')
  @ApiOperation({ summary: 'Get entity timeline', description: 'Get formatted timeline of entity changes' })
  @ApiParam({ name: 'entityType', description: 'Entity type' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiQuery({ name: 'limit', description: 'Max items', required: false })
  @ApiResponse({ status: 200, description: 'Entity timeline' })
  async getTimeline(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit = 50,
  ) {
    return firstValueFrom(
      this.auditClient.send(AUDIT_PATTERNS.GET_TIMELINE, { entityType, entityId, limit }).pipe(timeout(5000)),
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user activity', description: 'Get all audit logs for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', description: 'Max items', required: false })
  @ApiResponse({ status: 200, description: 'User activity logs' })
  async findByUser(
    @Param('userId') userId: string,
    @Query('limit') limit = 100,
  ) {
    return firstValueFrom(
      this.auditClient.send(AUDIT_PATTERNS.FIND_BY_USER, { userId: parseInt(userId, 10), limit }).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiParam({ name: 'id', description: 'Audit log ID' })
  @ApiResponse({ status: 200, description: 'Audit log details' })
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.auditClient.send(AUDIT_PATTERNS.FIND_ONE, { id }).pipe(timeout(5000)),
    );
  }
}
