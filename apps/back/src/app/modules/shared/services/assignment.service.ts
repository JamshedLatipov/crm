import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../user/user.entity';
import { Assignment } from '../entities/assignment.entity';
import { NotificationService } from '../services/notification.service';
import { NotificationChannel, NotificationPriority } from '../entities/notification.entity';
import { UserActivityService } from '../../user-activity/user-activity.service';
import { getEntityHandler } from '../factory/assignment-entity.factory';
import { buildEntityWhere, getEntityIdFromAssignment, mapUser, mapNotificationType, buildAssignmentPayload } from '../factory/assignment-mappers';

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
    const entityWhere = buildEntityWhere(entityType, entityId);

    // If there are existing assignments for other users (not in assignedTo), remove them first
    const allActiveForEntity = await this.assignmentRepository.find({
      where: {
        entityType,
        ...entityWhere,
        status: 'active'
      }
    });

    const activeUserIds = allActiveForEntity.map(a => a.userId);
    const toRemove = activeUserIds.filter(id => !assignedTo.includes(id));
    if (toRemove.length > 0) {
      // mark old assignments removed before creating new ones
      // use provided reason if present, otherwise indicate reassignment
      const removalReason = reason ? `Reassigned: ${reason}` : 'Reassigned';
      await this.changeAssignmentStatus(entityType, entityId, toRemove, 'removed', removalReason);
    }

    // Re-query existing assignments for the target assignedTo users after removals
    const existingAssignmentsAfter = await this.assignmentRepository.find({
      where: {
        entityType,
        ...entityWhere,
        userId: In(assignedTo),
        status: 'active'
      }
    });

  // Create new assignments only for users not already assigned
  const alreadyAssignedIds = existingAssignmentsAfter.map(a => a.userId);
    const newPayloads = assignedTo
      .filter(userId => !alreadyAssignedIds.includes(userId))
      .map(userId => buildAssignmentPayload(entityType, entityId, userId, assignedBy, reason));

    const newEntities = this.assignmentRepository.create(newPayloads);
    const savedAssignments = await this.assignmentRepository.save(newEntities as any[]);

    // Update user workload counters per-entity
    try {
      if (savedAssignments.length > 0) {
        const countsByUser = new Map<number, number>();
        for (const a of savedAssignments) {
          countsByUser.set(a.userId, (countsByUser.get(a.userId) || 0) + 1);
        }

        for (const [userId, cnt] of countsByUser) {
          const handler = getEntityHandler(entityType);
          if (handler.counterField) {
            await this.userRepository.increment({ id: userId }, handler.counterField, cnt);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to update user workload counters after createAssignment:', err?.message || err);
    }

    // Log user activity for lead assignments (if userActivity service available)
    if (this.userActivityService && assignedByUser && savedAssignments.length > 0) {
      try {
        const handler = getEntityHandler(entityType);
        const title = await handler.fetchTitle(this.assignmentRepository.manager, entityId).catch(() => undefined);

        // Log an activity for the assigning user (one entry per created assignment)
        for (const a of savedAssignments) {
          const assignedEntityId = getEntityIdFromAssignment(a);
          await handler.logAssigned?.(this.userActivityService, String(a.userId), String(assignedEntityId), title);
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
    // Use centralized helper
    const res = await this.changeAssignmentStatus(entityType, entityId, userIds, 'removed', reason);

    if (res.changedCount === 0) {
      throw new NotFoundException('No active assignments found');
    }

    return { success: true, removedCount: res.changedCount };
  }

  /**
   * Mark active assignments for an entity as completed (e.g. when deal/task is closed)
   * Decrements user workload counters similarly to removeAssignment.
   */
  async completeAssignment(entityType: string, entityId: string | number, reason?: string) {
    const assignments = await this.assignmentRepository.find({
      where: {
        entityType,
        ...buildEntityWhere(entityType, entityId),
        status: 'active'
      }
    });

    if (assignments.length === 0) {
      return { success: true, completedCount: 0 };
    }

    // Update assignments to completed status
    await this.assignmentRepository.update(
      { id: In(assignments.map(a => a.id)) },
      {
        status: 'completed',
        completedAt: new Date(),
        removalReason: reason || null
      }
    );

    // Decrement user workload counters for completed assignments
    try {
      const countsByUser = new Map<number, number>();
      for (const a of assignments) {
        countsByUser.set(a.userId, (countsByUser.get(a.userId) || 0) + 1);
      }

      for (const [userId, cnt] of countsByUser) {
        const handler = getEntityHandler(entityType);
        const counterField = handler.counterField;
        if (counterField) {
          await this.userRepository.decrement({ id: userId }, counterField, cnt);
        } else {
          if (entityType === 'deal') {
            await this.userRepository.decrement({ id: userId }, 'currentDealsCount', cnt);
          } else if (entityType === 'task') {
            await this.userRepository.decrement({ id: userId }, 'currentTasksCount', cnt);
          } else if (entityType === 'lead') {
            await this.userRepository.decrement({ id: userId }, 'currentLeadsCount', cnt);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to update user workload counters after completeAssignment:', err?.message || err);
    }

    return { success: true, completedCount: assignments.length };
  }

  // Central helper to change status of active assignments for an entity (optionally filtered by userIds)
  // Returns { changedCount, assignments }
  private async changeAssignmentStatus(
    entityType: string,
    entityId: string | number,
    userIds: number[] | undefined,
    newStatus: 'removed' | 'completed',
    reason?: string
  ) {
    const where: any = {
      entityType,
      ...buildEntityWhere(entityType, entityId),
      status: 'active'
    };

    if (userIds && userIds.length > 0) {
      where.userId = In(userIds);
    }

    const assignments = await this.assignmentRepository.find({ where });

    if (assignments.length === 0) {
      return { changedCount: 0, assignments: [] as Assignment[] };
    }

    const updatePayload: any = {
      status: newStatus,
      removalReason: reason || null
    };
    if (newStatus === 'removed') updatePayload.removedAt = new Date();
    if (newStatus === 'completed') updatePayload.completedAt = new Date();

    await this.assignmentRepository.update(
      { id: In(assignments.map(a => a.id)) },
      updatePayload
    );

    // Decrement user workload counters
    try {
      if (assignments.length > 0) {
        const countsByUser = new Map<number, number>();
        for (const a of assignments) {
          countsByUser.set(a.userId, (countsByUser.get(a.userId) || 0) + 1);
        }

        for (const [userId, cnt] of countsByUser) {
          const handler = getEntityHandler(entityType);
          handler.counterField ? await this.userRepository.decrement({ id: userId }, handler.counterField, cnt) : null;
        }
      }
    } catch (err) {
      console.warn('Failed to update user workload counters after changeAssignmentStatus:', err?.message || err);
    }

    // Log unassignment activities (non-blocking)
    if (this.userActivityService && assignments.length > 0) {
      try {
        const handler = getEntityHandler(entityType);
        const title = await handler.fetchTitle(this.assignmentRepository.manager, entityId).catch(() => undefined);

        for (const a of assignments) {
          await handler.logUnassigned?.(
            this.userActivityService,
            String(a.userId),
            String(getEntityIdFromAssignment(a)),
            title
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to log user activity for unassignment:', err);
      }
    }

    return { changedCount: assignments.length, assignments };
  }

  async getCurrentAssignments(entityType: string, entityId: string) {
    const assignments = await this.assignmentRepository.find({
      where: {
        entityType,
        ...buildEntityWhere(entityType, entityId),
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

      const mappedUser = mapUser(resolvedUser);
      const mappedAssignedBy = mapUser(resolvedAssignedBy);

      result.push({
        id: assignment.id,
        userId: assignment.userId,
        userName: mappedUser?.fullName || mappedUser?.email,
        userEmail: mappedUser?.email,
        user: mappedUser,
        assignedBy: assignment.assignedBy,
        assignedByUserName: mappedAssignedBy?.fullName || mappedAssignedBy?.email,
        assignedByUser: mappedAssignedBy,
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
        ...buildEntityWhere(entityType, entityId)
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

      const mappedUser = mapUser(resolvedUser);
      const mappedAssignedBy = mapUser(resolvedAssignedBy);

      result.push({
        id: assignment.id,
        userId: assignment.userId,
        userName: mappedUser?.fullName || mappedUser?.email,
        user: mappedUser,
        assignedBy: assignment.assignedBy,
        assignedByUser: mappedAssignedBy,
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
    return assignments.map(assignment => {
      const mappedUser = mapUser((assignment.user as any) || null);
      const mappedAssignedBy = mapUser((assignment.assignedByUser as any) || null);

      return {
        id: assignment.id,
        entityType: assignment.entityType,
        entityId: getEntityIdFromAssignment(assignment),
        assignedBy: assignment.assignedBy,
        assignedByName: mappedAssignedBy?.fullName || mappedAssignedBy?.email,
        user: mappedUser,
        assignedAt: assignment.assignedAt,
        reason: assignment.reason,
        status: assignment.status
      };
    });
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
    const column = entityType === 'task' ? 'assignment.taskId' : entityType === 'lead' ? 'assignment.leadId' : 'assignment.dealId';
    const assignments = await this.assignmentRepository.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('assignment.assignedByUser', 'assignedByUser')
      .where('assignment.entityType = :entityType', { entityType })
      .andWhere(`${column} IN (:...ids)`, { ids: idsAsString })
      .andWhere('assignment.status = :status', { status: 'active' })
      .orderBy('assignment.assignedAt', 'DESC')
      .getMany();

    const map = new Map<string, any>();
    for (const assignment of assignments) {
      const key = getEntityIdFromAssignment(assignment);
      if (!map.has(key)) {
        const resolvedUser = assignment.user && typeof (assignment.user as any).then === 'function'
          ? await (assignment.user as any)
          : assignment.user;

        const mappedUser = mapUser(resolvedUser);

        map.set(key, {
          id: assignment.id,
          userId: assignment.userId,
          userName: mappedUser?.fullName || mappedUser?.email,
          userEmail: mappedUser?.email,
          assignedAt: assignment.assignedAt,
          reason: assignment.reason,
          user: mappedUser,
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
      // Get current workload for each user for this entityType
      const workloadQuery = await this.assignmentRepository
        .createQueryBuilder('assignment')
        .select('assignment.userId', 'userId')
        .addSelect('COUNT(*)', 'workload')
        .where('assignment.status = :status', { status: 'active' })
        .andWhere('assignment.entityType = :entityType', { entityType })
        .groupBy('assignment.userId')
        .getRawMany();

      const workloadMap = new Map(workloadQuery.map(w => [w.userId, parseInt(w.workload)]));

      // Sort users by workload ratio (workload / capacity) ascending
      availableUsers.sort((a, b) => {
        const workloadA = workloadMap.get(a.id) || 0;
        const workloadB = workloadMap.get(b.id) || 0;

        const capField = entityType === 'deal' ? 'maxDealsCapacity' : entityType === 'task' ? 'maxTasksCapacity' : 'maxLeadsCapacity';
        const capA = (a as any)[capField] || 1;
        const capB = (b as any)[capField] || 1;

        const ratioA = workloadA / Math.max(1, capA);
        const ratioB = workloadB / Math.max(1, capB);
        if (ratioA === ratioB) return workloadA - workloadB; // tie-breaker by absolute workload
        return ratioA - ratioB;
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
      // Choose a NotificationType via mapper
      const notificationType = mapNotificationType(assignment.entityType);

      await this.notificationService.create({
        type: notificationType,
        title: 'New Assignment',
        message: `You have been assigned to ${assignment.entityType} #${getEntityIdFromAssignment(assignment)} by ${assignedByUser.fullName || assignedByUser.email}`,
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.MEDIUM,
        recipientId: assignment.userId.toString(),
        data: {
          assignmentId: assignment.id,
          assignedBy: assignment.assignedBy,
          reason: assignment.reason,
          entityType: assignment.entityType,
          entityId: getEntityIdFromAssignment(assignment)
        }
      });
    }
  }
}