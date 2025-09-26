import { Controller, Get, Query, Param, Post } from '@nestjs/common';
import { UserService } from './user.service';

export interface ManagerDto {
  id: string;
  name: string;
  email: string;
  department: string;
  avatar?: string;
  workload: number;
  maxCapacity: number;
  workloadPercentage: number;
  role: string;
  conversionRate: number;
  isAvailable: boolean;
  skills: string[];
  territories: string[];
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('managers')
  async getManagers(
    @Query('available') available?: string,
    @Query('availableOnly') availableOnly?: string
  ): Promise<ManagerDto[]> {
    // Support both `available` and `availableOnly` query params for backward compatibility.
    const useAvailable = (availableOnly ?? available) === 'true';
    const users = await this.userService.getManagers(useAvailable);
    
    return users.map(user => ({
      id: user.id.toString(),
      name: user.fullName,
      email: user.email || '',
      department: user.department || 'Sales',
      avatar: user.avatar,
      workload: user.currentLeadsCount,
      maxCapacity: user.maxLeadsCapacity,
      workloadPercentage: user.workloadPercentage,
      role: this.getUserPrimaryRole(user.roles),
      conversionRate: Number(user.conversionRate) || 0,
      isAvailable: user.isAvailableForAssignment && user.isActive && !user.isOverloaded,
      skills: user.skills || [],
      territories: user.territories || []
    }));
  }

  @Get('managers/stats')
  async getManagersStats() {
    return await this.userService.getManagersStatistics();
  }

  @Get('managers/:id')
  async getManagerById(@Param('id') id: string): Promise<ManagerDto> {
    const user = await this.userService.findById(Number(id));
    
    if (!user) {
      throw new Error('Manager not found');
    }

    return {
      id: user.id.toString(),
      name: user.fullName,
      email: user.email || '',
      department: user.department || 'Sales',
      avatar: user.avatar,
      workload: user.currentLeadsCount,
      maxCapacity: user.maxLeadsCapacity,
      workloadPercentage: user.workloadPercentage,
      role: this.getUserPrimaryRole(user.roles),
      conversionRate: Number(user.conversionRate) || 0,
      isAvailable: user.isAvailableForAssignment && user.isActive && !user.isOverloaded,
      skills: user.skills || [],
      territories: user.territories || []
    };
  }

  @Get('managers/auto-assign')
  async getAutoAssignRecommendation(
    @Query('criteria') criteria?: string,
    @Query('industry') industry?: string,
    @Query('territory') territory?: string
  ): Promise<ManagerDto> {
    const user = await this.userService.getOptimalManagerForAssignment({
      criteria: criteria?.split(',') || ['workload'],
      industry,
      territory
    });

    if (!user) {
      throw new Error('No suitable manager found');
    }

    return {
      id: user.id.toString(),
      name: user.fullName,
      email: user.email || '',
      department: user.department || 'Sales',
      avatar: user.avatar,
      workload: user.currentLeadsCount,
      maxCapacity: user.maxLeadsCapacity,
      workloadPercentage: user.workloadPercentage,
      role: this.getUserPrimaryRole(user.roles),
      conversionRate: Number(user.conversionRate) || 0,
      isAvailable: user.isAvailableForAssignment && user.isActive && !user.isOverloaded,
      skills: user.skills || [],
      territories: user.territories || []
    };
  }

  private getUserPrimaryRole(roles: string[]): string {
    // Определяем основную роль пользователя для отображения
    const roleHierarchy = [
      'team_lead',
      'senior_manager', 
      'account_manager',
      'sales_manager',
      'admin'
    ];

    for (const role of roleHierarchy) {
      if (roles.includes(role)) {
        return role;
      }
    }

    return roles[0] || 'sales_manager';
  }

  @Post('seed-managers')
  async seedTestManagers(): Promise<{ message: string }> {
    await this.userService.seedTestManagers();
    return { message: 'Test managers seeded successfully' };
  }
}
