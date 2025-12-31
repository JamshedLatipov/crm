import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AuditLog,
  AuditAction,
  AuditEntityType,
  AuditSeverity,
} from './entities/audit-log.entity';
import { AuditRetention, RetentionPolicy } from './entities/audit-settings.entity';

export interface CreateAuditLogDto {
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

export interface AuditStatsDto {
  period: 'day' | 'week' | 'month';
  entityType?: AuditEntityType;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(AuditRetention)
    private readonly retentionRepository: Repository<AuditRetention>,
  ) {}

  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    const changes = this.calculateChanges(dto.oldValue, dto.newValue);
    
    const auditLog = this.auditLogRepository.create({
      ...dto,
      changes: changes ?? undefined,
    });

    const saved = await this.auditLogRepository.save(auditLog);
    
    this.logger.debug(
      `Audit log created: ${dto.action} on ${dto.entityType}${dto.entityId ? ` #${dto.entityId}` : ''} by user ${dto.userId || 'system'}`
    );

    return saved;
  }

  async findAll(filter: AuditFilterDto) {
    const {
      userId,
      action,
      entityType,
      entityId,
      severity,
      startDate,
      endDate,
      isError,
      serviceName,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filter;

    const query = this.auditLogRepository.createQueryBuilder('log');

    if (userId) {
      query.andWhere('log.userId = :userId', { userId });
    }

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (entityType) {
      query.andWhere('log.entityType = :entityType', { entityType });
    }

    if (entityId) {
      query.andWhere('log.entityId = :entityId', { entityId });
    }

    if (severity) {
      query.andWhere('log.severity = :severity', { severity });
    }

    if (startDate && endDate) {
      query.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate });
    }

    if (isError !== undefined) {
      query.andWhere('log.isError = :isError', { isError });
    }

    if (serviceName) {
      query.andWhere('log.serviceName = :serviceName', { serviceName });
    }

    const [data, total] = await query
      .orderBy(`log.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  async findByEntity(entityType: AuditEntityType, entityId: string) {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findByUser(userId: number, limit = 100) {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getStats(dto: AuditStatsDto) {
    const { period, entityType } = dto;
    
    let dateFilter: Date;
    const now = new Date();
    
    switch (period) {
      case 'day':
        dateFilter = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt >= :dateFilter', { dateFilter });

    if (entityType) {
      query.andWhere('log.entityType = :entityType', { entityType });
    }

    const actionStats = await query
      .groupBy('log.action')
      .getRawMany();

    const entityStats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.entityType', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt >= :dateFilter', { dateFilter })
      .groupBy('log.entityType')
      .getRawMany();

    const userStats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.userId', 'userId')
      .addSelect('log.username', 'username')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt >= :dateFilter', { dateFilter })
      .andWhere('log.userId IS NOT NULL')
      .groupBy('log.userId')
      .addGroupBy('log.username')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const errorCount = await this.auditLogRepository.count({
      where: {
        isError: true,
        createdAt: MoreThan(dateFilter),
      },
    });

    const totalCount = await this.auditLogRepository.count({
      where: {
        createdAt: MoreThan(dateFilter),
      },
    });

    return {
      period,
      totalLogs: totalCount,
      errorCount,
      byAction: actionStats,
      byEntity: entityStats,
      topUsers: userStats,
    };
  }

  async getTimeline(
    entityType: AuditEntityType,
    entityId: string,
    limit = 50,
  ) {
    const logs = await this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return logs.map(log => ({
      id: log.id,
      action: log.action,
      description: log.description,
      user: log.username || `User #${log.userId}` || 'System',
      changes: log.changes,
      timestamp: log.createdAt,
      severity: log.severity,
    }));
  }

  async searchLogs(searchTerm: string, limit = 50) {
    return this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.description ILIKE :search', { search: `%${searchTerm}%` })
      .orWhere('log.entityName ILIKE :search', { search: `%${searchTerm}%` })
      .orWhere('log.username ILIKE :search', { search: `%${searchTerm}%` })
      .orderBy('log.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getSecurityEvents(page = 1, limit = 50) {
    const securityActions = [
      AuditAction.LOGIN,
      AuditAction.LOGOUT,
      AuditAction.PERMISSION_CHANGE,
    ];

    return this.auditLogRepository.findAndCount({
      where: securityActions.map(action => ({ action })),
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getErrorLogs(page = 1, limit = 50) {
    const [data, total] = await this.auditLogRepository.findAndCount({
      where: { isError: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // Cleanup old logs based on retention policy
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldLogs() {
    this.logger.log('Starting audit log cleanup...');

    const retentionPolicies = await this.retentionRepository.find({
      where: { isActive: true },
    });

    // Default retention: 90 days
    const defaultRetentionDays = 90;

    for (const policy of retentionPolicies) {
      if (policy.policy === RetentionPolicy.FOREVER) {
        continue;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      const query = this.auditLogRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate });

      if (policy.entityType) {
        query.andWhere('entityType = :entityType', {
          entityType: policy.entityType,
        });
      }

      if (policy.action) {
        query.andWhere('action = :action', { action: policy.action });
      }

      const result = await query.execute();
      
      this.logger.log(
        `Deleted ${result.affected} audit logs for policy: ${policy.entityType || 'all'}/${policy.action || 'all'}`
      );
    }

    // Cleanup logs without specific policy (default retention)
    const defaultCutoff = new Date();
    defaultCutoff.setDate(defaultCutoff.getDate() - defaultRetentionDays);

    const defaultResult = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate: defaultCutoff })
      .andWhere('severity != :critical', { critical: AuditSeverity.CRITICAL })
      .execute();

    this.logger.log(`Default cleanup deleted ${defaultResult.affected} audit logs`);
  }

  private calculateChanges(
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
  ): Record<string, { old: unknown; new: unknown }> | null {
    if (!oldValue || !newValue) {
      return null;
    }

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

    for (const key of allKeys) {
      const oldVal = oldValue[key];
      const newVal = newValue[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}
