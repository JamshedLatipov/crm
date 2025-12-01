import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { AssignmentService } from '../services/assignment.service';

export class CreateAssignmentDto {
  entityType: 'lead' | 'deal' | 'task' | 'notification';
  entityId: string | number;
  assignedTo: number[];
  assignedBy: number;
  reason?: string;
  notifyAssignees?: boolean;
}

export class RemoveAssignmentDto {
  entityType: string;
  entityId: string | number;
  userIds: number[];
  reason?: string;
}

export class BulkAssignmentDto {
  assignments: CreateAssignmentDto[];
}

@Controller('assignments')
export class AssignmentController {
  constructor(
    private readonly assignmentService: AssignmentService,
    private readonly userService: UserService
  ) {}

  @Get('users/search')
  async searchUsers(
    @Query('q') query?: string,
    @Query('role') role?: string,
    @Query('department') department?: string,
    @Query('available') available?: boolean,
    @Query('limit', ParseIntPipe) limit = 20
  ) {
    const users = await this.userService.searchUsersForAssignment({
      query,
      role,
      department,
      available,
      limit
    });

    return users.map(user => ({
      id: user.id,
      name: user.fullName,
      email: user.email,
      department: user.department,
      roles: user.roles,
      avatar: user.avatar,
      workload: user.currentLeadsCount,
      maxCapacity: user.maxLeadsCapacity,
      workloadPercentage: user.workloadPercentage,
      isAvailable: user.isAvailableForAssignment && user.isActive
    }));
  }

  @Get('users/by-role/:role')
  async getUsersByRole(
    @Param('role') role: string,
    @Query('available') available = true
  ) {
    const users = await this.userService.getUsersByRole(role, available);
    
    return users.map(user => ({
      id: user.id,
      name: user.fullName,
      email: user.email,
      department: user.department,
      roles: user.roles,
      workload: user.currentLeadsCount,
      maxCapacity: user.maxLeadsCapacity,
      isAvailable: user.isAvailableForAssignment && user.isActive
    }));
  }

  @Post()
  async createAssignment(@Body() dto: CreateAssignmentDto) {
    return this.assignmentService.createAssignment(dto);
  }

  @Post('bulk')
  async createBulkAssignments(@Body() dto: BulkAssignmentDto) {
    return this.assignmentService.createBulkAssignments(dto.assignments);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async removeAssignment(@Body() dto: RemoveAssignmentDto) {
    return this.assignmentService.removeAssignment(dto);
  }

  @Get('current/:entityType/:entityId')
  async getCurrentAssignments(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    return this.assignmentService.getCurrentAssignments(entityType, entityId);
  }

  @Get('history/:entityType/:entityId')
  async getAssignmentHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit', ParseIntPipe) limit = 50
  ) {
    return this.assignmentService.getAssignmentHistory(entityType, entityId, limit);
  }

  @Post('current/batch')
  async getCurrentAssignmentsForEntities(@Body() body: { entityType: string; entityIds: (string | number)[] }) {
    const map = await this.assignmentService.getCurrentAssignmentsForEntities(body.entityType, body.entityIds || []);
    // Convert Map to plain object for JSON serialization
    const obj: Record<string, any> = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  @Get('user/:userId')
  async getUserAssignments(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('limit', ParseIntPipe) limit = 100
  ) {
    return this.assignmentService.getUserAssignments(userId, { status, entityType, limit });
  }

  @Get('statistics')
  async getAssignmentStatistics(
    @Query('period') period = '30d',
    @Query('groupBy') groupBy = 'user'
  ) {
    return this.assignmentService.getAssignmentStatistics(period, groupBy);
  }

  @Post('transfer')
  async transferAssignment(@Body() body: {
    entityType: string;
    entityId: string | number;
    fromUserId: number;
    toUserId: number;
    reason?: string;
  }) {
    return this.assignmentService.transferAssignment(
      body.entityType,
      body.entityId,
      body.fromUserId,
      body.toUserId,
      body.reason
    );
  }

  @Post('auto-assign')
  async autoAssign(@Body() body: {
    entityType: string;
    entityIds: (string | number)[];
    rules?: {
      byWorkload?: boolean;
      bySpecialization?: boolean;
      byLocation?: boolean;
    };
  }) {
    return this.assignmentService.autoAssign(body.entityType, body.entityIds, body.rules);
  }
}