import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../user/user.entity';
import { Assignment } from '../entities/assignment.entity';
import { NotificationService } from '../services/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../entities/notification.entity';
import { UserActivityService } from '../../user-activity/user-activity.service';
import { Lead } from '../../leads/lead.entity';

export interface CreateAssignmentRequest {
  entityType: 'lead' | 'deal' | 'task' | 'notification';
  entityId: string | number;
  assignedTo: number[];
  assignedBy: number;
  reason?: string;
  notifyAssignees?: boolean;
}

export interface RemoveAssignmentRequest {
  entityType: string;
  entityId: string | number;
  userIds: number[];
  reason?: string;
}

export interface UserAssignmentQuery {
  status?: string;
  entityType?: string;
  limit?: number;
}

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly userActivityService: UserActivityService,
  ) {}

  async createAssignment(request: CreateAssignmentRequest) {
    const { entityType, entityId, assignedTo, assignedBy, reason, notifyAssignees = true } = request;

    // Validate users exist
    const users = await this.userRepository.find({
      where: { id: In(assignedTo) }
    });

    if (users.length !== assignedTo.length) {
      throw new BadRequestException('One or more users not found');
    }

    const assignedByUser = await this.userRepository.findOne({
      where: { id: assignedBy }
    });

    if (!assignedByUser) {
      throw new NotFoundException('Assigning user not found');
    }

    // Check for existing assignments
    const existingAssignments = await this.assignmentRepository.find({
      where: {
        entityType,
        entityId: String(entityId),
        userId: In(assignedTo),
        status: 'active'
      }
    });

    // Create new assignments only for users not already assigned
    const alreadyAssignedIds = existingAssignments.map(a => a.userId);
    const newAssignments = assignedTo
      .filter(userId => !alreadyAssignedIds.includes(userId))
      .map(userId => this.assignmentRepository.create({
        entityType,
        entityId: String(entityId),
        userId,
        assignedBy,
        reason,
        status: 'active',
        assignedAt: new Date()
      }));

    const savedAssignments = await this.assignmentRepository.save(newAssignments);

    // Log user activity for lead assignments (if userActivity service available)
    if (this.userActivityService && assignedByUser && savedAssignments.length > 0) {
      try {
        // try to fetch entity title if repository available (lead, deal, task)
        let title: string | undefined;
        try {
          if (entityType === 'lead') {
            const lead = await this.assignmentRepository.manager.findOne(Lead as any, { where: { id: Number(entityId) } as any });
            title = (lead as any)?.name;
          } else if (entityType === 'deal') {
            // lazy load Deal entity to avoid direct import issues
            const Deal = require('../../deals/deal.entity').Deal;
            const deal = await this.assignmentRepository.manager.findOne(Deal as any, { where: { id: Number(entityId) } as any });
            title = (deal as any)?.title || (deal as any)?.name;
          } else if (entityType === 'task') {
            const Task = require('../../tasks/task.entity').Task;
            const task = await this.assignmentRepository.manager.findOne(Task as any, { where: { id: Number(entityId) } as any });
            title = (task as any)?.title || (task as any)?.name;
          }
        } catch (e) {
          title = undefined;
        }

        // Log an activity for the assigning user (one entry per created assignment)
        for (const a of savedAssignments) {
          if (entityType === 'lead') {
            await this.userActivityService.logLeadAssigned(
              assignedByUser.id.toString(),
              String(a.entityId),
              title || String(a.entityId),
            );
          } else if (entityType === 'deal') {
            // log deal assigned
            await this.userActivityService.logDealAssigned(
              assignedByUser.id.toString(),
              String(a.entityId),
              title || String(a.entityId),
            );
          } else if (entityType === 'task') {
            await this.userActivityService.logTaskAssigned(
              assignedByUser.id.toString(),
              String(a.entityId),
              title || String(a.entityId),
            );
          }
        }
      } catch (err) {
        // Don't block assignment flow if logging fails - just warn to logs
        // eslint-disable-next-line no-console
        console.warn('Failed to log user activity for assignment:', err);
      }
    }

    // Send notifications if enabled
    if (notifyAssignees && savedAssignments.length > 0) {
      await this.sendAssignmentNotifications(savedAssignments, assignedByUser);
    }

    return {
      success: true,
      newAssignments: savedAssignments.length,
      alreadyAssigned: alreadyAssignedIds.length,
      assignments: savedAssignments
    };
  }

  async createBulkAssignments(requests: CreateAssignmentRequest[]) {
    const results = [];
    
    for (const request of requests) {
      try {
        const result = await this.createAssignment(request);
        results.push({ ...result, entityType: request.entityType, entityId: request.entityId });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          entityType: request.entityType, 
          entityId: request.entityId 
        });
      }
    }

    return {
      success: true,
      results,
      totalProcessed: requests.length,
      successful: results.filter(r => r.success).length
    };
  }

  async removeAssignment(request: RemoveAssignmentRequest) {
    const { entityType, entityId, userIds, reason } = request;

    const assignments = await this.assignmentRepository.find({
      where: {
        entityType,
        entityId: String(entityId),
        userId: In(userIds),
        status: 'active'
      }
    });

    if (assignments.length === 0) {
      throw new NotFoundException('No active assignments found');
    }

    // Update assignments to removed status
    await this.assignmentRepository.update(
      { id: In(assignments.map(a => a.id)) },
      {
        status: 'removed',
        removedAt: new Date(),
        removalReason: reason
      }
    );

    // Log unassignment activities (non-blocking)
    if (this.userActivityService && assignments.length > 0) {
      try {
        let title: string | undefined;
        try {
          if (entityType === 'lead') {
            const lead = await this.assignmentRepository.manager.findOne(Lead as any, { where: { id: Number(entityId) } as any });
            title = (lead as any)?.name;
          } else if (entityType === 'deal') {
            const Deal = require('../../deals/deal.entity').Deal;
            const deal = await this.assignmentRepository.manager.findOne(Deal as any, { where: { id: Number(entityId) } as any });
            title = (deal as any)?.title || (deal as any)?.name;
          } else if (entityType === 'task') {
            const Task = require('../../tasks/task.entity').Task;
            const task = await this.assignmentRepository.manager.findOne(Task as any, { where: { id: Number(entityId) } as any });
            title = (task as any)?.title || (task as any)?.name;
          }
        } catch (e) {
          title = undefined;
        }

        for (const a of assignments) {
          if (entityType === 'lead') {
            await this.userActivityService.logLeadUnassigned(
              String(a.userId),
              String(a.entityId),
              title || String(a.entityId),
            );
          } else if (entityType === 'deal') {
            await this.userActivityService.logDealUnassigned(
              String(a.userId),
              String(a.entityId),
              title || String(a.entityId),
            );
          } else if (entityType === 'task') {
            await this.userActivityService.logTaskUnassigned(
              String(a.userId),
              String(a.entityId),
              title || String(a.entityId),
            );
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to log user activity for unassignment:', err);
      }
    }

    return {
      success: true,
      removedCount: assignments.length
    };
  }

  async getCurrentAssignments(entityType: string, entityId: string) {
    const assignments = await this.assignmentRepository.find({
      where: {
        entityType,
        entityId,
        status: 'active'
      },
      relations: ['user', 'assignedByUser'],
      order: { assignedAt: 'DESC' }
    });

    const result = [];
    for (const assignment of assignments) {
      // Resolve lazy relations if they're Promises
      const resolvedUser = assignment.user && typeof (assignment.user as any).then === 'function'
        ? await (assignment.user as any)
        : assignment.user;
      const resolvedAssignedBy = assignment.assignedByUser && typeof (assignment.assignedByUser as any).then === 'function'
        ? await (assignment.assignedByUser as any)
        : assignment.assignedByUser;

      result.push({
        id: assignment.id,
        userId: assignment.userId,
        userName: resolvedUser?.fullName || resolvedUser?.email,
        userEmail: resolvedUser?.email,
        user: resolvedUser ? {
          id: resolvedUser.id,
          firstName: resolvedUser.firstName,
          lastName: resolvedUser.lastName,
          fullName: (resolvedUser.firstName || resolvedUser.lastName) ? `${resolvedUser.firstName || ''} ${resolvedUser.lastName || ''}`.trim() : resolvedUser.username,
          email: resolvedUser.email,
          avatar: resolvedUser.avatar,
          roles: resolvedUser.roles
        } : null,
        assignedBy: assignment.assignedBy,
        assignedByUserName: resolvedAssignedBy?.fullName || resolvedAssignedBy?.email,
        assignedByUser: resolvedAssignedBy ? {
          id: resolvedAssignedBy.id,
          firstName: resolvedAssignedBy.firstName,
          lastName: resolvedAssignedBy.lastName,
          fullName: (resolvedAssignedBy.firstName || resolvedAssignedBy.lastName) ? `${resolvedAssignedBy.firstName || ''} ${resolvedAssignedBy.lastName || ''}`.trim() : resolvedAssignedBy.username,
          email: resolvedAssignedBy.email,
          avatar: resolvedAssignedBy.avatar,
          roles: resolvedAssignedBy.roles
        } : null,
        assignedAt: assignment.assignedAt,
        reason: assignment.reason
      });
    }

    return result;
  }

  async getAssignmentHistory(entityType: string, entityId: string, limit = 50) {
    const assignments = await this.assignmentRepository.find({
      where: {
        entityType,
        entityId
      },
      relations: ['user', 'assignedByUser'],
      order: { assignedAt: 'DESC' },
      take: limit
    });

    const result = [];
    for (const assignment of assignments) {
      const resolvedUser = assignment.user && typeof (assignment.user as any).then === 'function'
        ? await (assignment.user as any)
        : assignment.user;
      const resolvedAssignedBy = assignment.assignedByUser && typeof (assignment.assignedByUser as any).then === 'function'
        ? await (assignment.assignedByUser as any)
        : assignment.assignedByUser;

      result.push({
        id: assignment.id,
        userId: assignment.userId,
        userName: resolvedUser?.fullName || resolvedUser?.email,
        user: resolvedUser ? {
          id: resolvedUser.id,
          firstName: resolvedUser.firstName,
          lastName: resolvedUser.lastName,
          fullName: (resolvedUser.firstName || resolvedUser.lastName) ? `${resolvedUser.firstName || ''} ${resolvedUser.lastName || ''}`.trim() : resolvedUser.username,
          email: resolvedUser.email,
          avatar: resolvedUser.avatar,
          roles: resolvedUser.roles
        } : null,
        assignedBy: assignment.assignedBy,
        assignedByUser: resolvedAssignedBy ? {
          id: resolvedAssignedBy.id,
          firstName: resolvedAssignedBy.firstName,
          lastName: resolvedAssignedBy.lastName,
          fullName: (resolvedAssignedBy.firstName || resolvedAssignedBy.lastName) ? `${resolvedAssignedBy.firstName || ''} ${resolvedAssignedBy.lastName || ''}`.trim() : resolvedAssignedBy.username,
          email: resolvedAssignedBy.email,
          avatar: resolvedAssignedBy.avatar,
          roles: resolvedAssignedBy.roles
        } : null,
        assignedAt: assignment.assignedAt,
        removedAt: assignment.removedAt,
        status: assignment.status,
        reason: assignment.reason,
        removalReason: assignment.removalReason
      });
    }

    return result;
  }

  async getUserAssignments(userId: number, query: UserAssignmentQuery = {}) {
    const { status = 'active', entityType, limit = 100 } = query;

    const where: any = {
      userId,
      status
    };

    if (entityType) {
      where.entityType = entityType;
    }

    const assignments = await this.assignmentRepository.find({
      where,
      relations: ['assignedByUser'],
      order: { assignedAt: 'DESC' },
      take: limit
    });

      return assignments.map(assignment => ({
        id: assignment.id,
        entityType: assignment.entityType,
        entityId: assignment.entityId,
        assignedBy: assignment.assignedBy,
        assignedByName: assignment.assignedByUser?.fullName || assignment.assignedByUser?.email,
        user: assignment.user ? {
          id: assignment.user.id,
          firstName: assignment.user.firstName,
          lastName: assignment.user.lastName,
          fullName: (assignment.user.firstName || assignment.user.lastName) ? `${assignment.user.firstName || ''} ${assignment.user.lastName || ''}`.trim() : assignment.user.username,
          email: assignment.user.email,
          avatar: assignment.user.avatar,
          roles: assignment.user.roles
        } : null,
        assignedAt: assignment.assignedAt,
        reason: assignment.reason,
        status: assignment.status
      }));
  }

  async getAssignmentStatistics(period = '30d', groupBy = 'user') {
    // Calculate date range
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const queryBuilder = this.assignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.assignedAt >= :startDate', { startDate });

    if (groupBy === 'user') {
      queryBuilder
        .select('assignment.userId', 'userId')
        .addSelect('COUNT(*)', 'totalAssignments')
        .addSelect('COUNT(CASE WHEN assignment.status = \'active\' THEN 1 END)', 'activeAssignments')
        .addSelect('COUNT(CASE WHEN assignment.status = \'completed\' THEN 1 END)', 'completedAssignments')
        .groupBy('assignment.userId');
    } else if (groupBy === 'entityType') {
      queryBuilder
        .select('assignment.entityType', 'entityType')
        .addSelect('COUNT(*)', 'totalAssignments')
        .addSelect('COUNT(CASE WHEN assignment.status = \'active\' THEN 1 END)', 'activeAssignments')
        .groupBy('assignment.entityType');
    }

    return queryBuilder.getRawMany();
  }

  /**
   * Получить текущие назначения для нескольких сущностей за один запрос
   * Возвращает Map где ключ - entityId, значение - последний активный assignment
   */
  async getCurrentAssignmentsForEntities(entityType: string, entityIds: (string | number)[]) {
    if (!entityIds || entityIds.length === 0) {
      return new Map<string, any>();
    }

    const idsAsString = entityIds.map(String);

    // Use QueryBuilder with explicit joins to ensure lazy relations are loaded correctly
    const assignments = await this.assignmentRepository.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('assignment.assignedByUser', 'assignedByUser')
      .where('assignment.entityType = :entityType', { entityType })
      .andWhere('assignment.entityId IN (:...ids)', { ids: idsAsString })
      .andWhere('assignment.status = :status', { status: 'active' })
      .orderBy('assignment.assignedAt', 'DESC')
      .getMany();

    const map = new Map<string, any>();
    for (const assignment of assignments) {
      if (!map.has(assignment.entityId)) {
        const resolvedUser = assignment.user && typeof (assignment.user as any).then === 'function'
          ? await (assignment.user as any)
          : assignment.user;

        map.set(assignment.entityId, {
          id: assignment.id,
          userId: assignment.userId,
          userName: resolvedUser?.fullName || resolvedUser?.email,
          userEmail: resolvedUser?.email,
          assignedAt: assignment.assignedAt,
          reason: assignment.reason,
          user: resolvedUser ? {
            id: resolvedUser.id,
            firstName: resolvedUser.firstName,
            lastName: resolvedUser.lastName,
            fullName: (resolvedUser.firstName || resolvedUser.lastName) ? `${resolvedUser.firstName || ''} ${resolvedUser.lastName || ''}`.trim() : resolvedUser.username,
            email: resolvedUser.email,
            avatar: resolvedUser.avatar,
            roles: resolvedUser.roles
          } : null,
        });
      }
    }

    return map;
  }

  async transferAssignment(
    entityType: string,
    entityId: string | number,
    fromUserId: number,
    toUserId: number,
    reason?: string
  ) {
    // Remove old assignment
    await this.removeAssignment({
      entityType,
      entityId,
      userIds: [fromUserId],
      reason: `Transferred to another user: ${reason || 'No reason provided'}`
    });

    // Create new assignment
    const result = await this.createAssignment({
      entityType: entityType as any,
      entityId,
      assignedTo: [toUserId],
      assignedBy: fromUserId, // Transfer initiated by current assignee
      reason: `Transferred from ${fromUserId}: ${reason || 'No reason provided'}`,
      notifyAssignees: true
    });

    return {
      success: true,
      message: 'Assignment transferred successfully',
      ...result
    };
  }

  async autoAssign(
    entityType: string,
    entityIds: (string | number)[],
    rules: {
      byWorkload?: boolean;
      bySpecialization?: boolean;
      byLocation?: boolean;
    } = {}
  ) {
    // Get available users based on rules
    let availableUsers = await this.userRepository.find({
      where: { isActive: true }
    });

    if (rules.byWorkload) {
      // Get current workload for each user
      const workloadQuery = await this.assignmentRepository
        .createQueryBuilder('assignment')
        .select('assignment.userId', 'userId')
        .addSelect('COUNT(*)', 'workload')
        .where('assignment.status = :status', { status: 'active' })
        .groupBy('assignment.userId')
        .getRawMany();

      const workloadMap = new Map(workloadQuery.map(w => [w.userId, parseInt(w.workload)]));
      
      // Sort users by workload (ascending)
      availableUsers.sort((a, b) => {
        const workloadA = workloadMap.get(a.id) || 0;
        const workloadB = workloadMap.get(b.id) || 0;
        return workloadA - workloadB;
      });
    }

    // Assign entities to users using round-robin
    const assignments = [];
    for (let i = 0; i < entityIds.length; i++) {
      const user = availableUsers[i % availableUsers.length];
      assignments.push({
        entityType: entityType as any,
        entityId: entityIds[i],
        assignedTo: [user.id],
        assignedBy: 'system',
        reason: 'Auto-assigned based on workload balancing',
        notifyAssignees: true
      });
    }

    return this.createBulkAssignments(assignments);
  }

  private async sendAssignmentNotifications(assignments: Assignment[], assignedByUser: User) {
    for (const assignment of assignments) {
      // Choose a NotificationType appropriate for the entity type (use enum values)
      let notificationType: NotificationType;
      switch (assignment.entityType) {
        case 'lead':
          notificationType = NotificationType.LEAD_ASSIGNED;
          break;
        case 'deal':
          notificationType = NotificationType.DEAL_ASSIGNED;
          break;
        case 'task':
          notificationType = NotificationType.TASK_ASSIGNED;
          break;
        default:
          notificationType = NotificationType.SYSTEM_REMINDER;
      }

      await this.notificationService.create({
        type: notificationType,
        title: 'New Assignment',
        message: `You have been assigned to ${assignment.entityType} #${assignment.entityId} by ${assignedByUser.fullName || assignedByUser.email}`,
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.MEDIUM,
        recipientId: assignment.userId.toString(),
        data: {
          assignmentId: assignment.id,
          assignedBy: assignment.assignedBy,
          reason: assignment.reason,
          entityType: assignment.entityType,
          entityId: assignment.entityId
        }
      });
    }
  }
}