import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../user/user.entity';
import { Assignment } from '../entities/assignment.entity';
import { NotificationService } from '../services/notification.service';

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
    private readonly notificationService: NotificationService
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
      relations: ['user'],
      order: { assignedAt: 'DESC' }
    });

    return assignments.map(assignment => ({
      id: assignment.id,
      userId: assignment.userId,
      userName: assignment.user?.fullName || assignment.user?.email,
      userEmail: assignment.user?.email,
      assignedBy: assignment.assignedBy,
      assignedAt: assignment.assignedAt,
      reason: assignment.reason
    }));
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

    return assignments.map(assignment => ({
      id: assignment.id,
      userId: assignment.userId,
      userName: assignment.user?.fullName || assignment.user?.email,
      assignedBy: assignment.assignedBy,
      assignedByName: assignment.assignedByUser?.fullName || assignment.assignedByUser?.email,
      assignedAt: assignment.assignedAt,
      removedAt: assignment.removedAt,
      status: assignment.status,
      reason: assignment.reason,
      removalReason: assignment.removalReason
    }));
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
      await this.notificationService.create({
        type: 'assignment' as any,
        title: 'New Assignment',
        message: `You have been assigned to ${assignment.entityType} #${assignment.entityId} by ${assignedByUser.fullName || assignedByUser.email}`,
        channel: 'in_app' as any,
        priority: 'medium' as any,
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