import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Query, 
  Param, 
  Body, 
  ParseIntPipe, 
  NotFoundException,
  HttpStatus,
  HttpCode,
  ParseBoolPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, AutoAssignCriteriaDto, ManagerStatsResponseDto } from './dto/user.dto';
import { User } from './user.entity';

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
  fullName: string;
  roles: string[];
}

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async getAllUsers(): Promise<User[]> {
    return await this.userService.getAllUsers();
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.userService.createUser(createUserDto);
  }

  @Get('managers')
  @ApiOperation({ summary: 'Get managers list' })
  @ApiQuery({ name: 'available', required: false, description: 'Filter available managers only' })
  @ApiQuery({ name: 'availableOnly', required: false, description: 'Filter available managers only (alternative param)' })
  @ApiResponse({ status: 200, description: 'List of managers' })
  async getManagers(
    @Query('available') available?: string,
    @Query('availableOnly') availableOnly?: string
  ): Promise<ManagerDto[]> {
    try {
      const useAvailable = (availableOnly === 'true') || (available === 'true');
      const users = await this.userService.getManagers(useAvailable);
      
      return users.map(user => this.mapUserToManagerDto(user));
    } catch (error) {
      console.error('Error in getManagers:', error);
      throw error;
    }
  }

  @Get('managers/stats')
  @ApiOperation({ summary: 'Get managers statistics' })
  @ApiResponse({ status: 200, description: 'Managers statistics', type: ManagerStatsResponseDto })
  async getManagersStats(): Promise<ManagerStatsResponseDto> {
    return await this.userService.getManagersStatistics();
  }

  @Post('managers/auto-assign')
  @ApiOperation({ summary: 'Get auto-assignment recommendation' })
  @ApiResponse({ status: 200, description: 'Recommended manager' })
  @ApiResponse({ status: 404, description: 'No suitable manager found' })
  async getAutoAssignRecommendation(
    @Body() criteria: AutoAssignCriteriaDto
  ): Promise<ManagerDto> {
    const user = await this.userService.getOptimalManagerForAssignment(criteria);

    if (!user) {
      throw new NotFoundException('No suitable manager found for auto-assignment');
    }

    return this.mapUserToManagerDto(user);
  }

  @Get('managers/:id')
  @ApiOperation({ summary: 'Get manager by ID' })
  @ApiParam({ name: 'id', description: 'Manager ID' })
  @ApiResponse({ status: 200, description: 'Manager found' })
  @ApiResponse({ status: 404, description: 'Manager not found' })
  async getManagerById(@Param('id') id: string): Promise<ManagerDto> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new NotFoundException(`Invalid manager ID: ${id}`);
    }
    
    const user = await this.userService.findById(numericId);
    
    if (!user) {
      throw new NotFoundException(`Manager with ID ${id} not found`);
    }

    return this.mapUserToManagerDto(user);
  }

  @Put('managers/:id/lead-count')
  @ApiOperation({ summary: 'Update manager lead count' })
  @ApiParam({ name: 'id', description: 'Manager ID' })
  @ApiResponse({ status: 200, description: 'Lead count updated successfully' })
  @ApiResponse({ status: 404, description: 'Manager not found' })
  async updateLeadCount(
    @Param('id') id: string,
    @Body('increment') increment: number
  ): Promise<{ message: string }> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new NotFoundException(`Invalid manager ID: ${id}`);
    }
    
    await this.userService.updateLeadCount(numericId, increment);
    return { message: 'Lead count updated successfully' };
  }

  @Post('seed-managers')
  @ApiOperation({ summary: 'Seed test managers' })
  @ApiResponse({ status: 201, description: 'Test managers created successfully' })
  async seedTestManagers(): Promise<{ message: string }> {
    await this.userService.seedTestManagers();
    return { message: 'Test managers seeded successfully' };
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(
    @Param('id') id: string
  ): Promise<{ temporaryPassword: string }> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new NotFoundException(`Invalid user ID: ${id}`);
    }
    
    const temporaryPassword = await this.userService.resetPassword(numericId);
    return { temporaryPassword };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<User> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new NotFoundException(`Invalid user ID: ${id}`);
    }
    
    return await this.userService.updateUser(numericId, updateUserDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<User> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new NotFoundException(`Invalid user ID: ${id}`);
    }
    
    const user = await this.userService.findById(numericId);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Get('export')
  @ApiOperation({ summary: 'Export users' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'excel'], description: 'Export format' })
  @ApiResponse({ status: 200, description: 'Users exported successfully' })
  async exportUsers(
    @Query('format') format: 'csv' | 'excel' = 'csv'
  ): Promise<any> {
    return await this.userService.exportUsers(format);
  }

  private mapUserToManagerDto(user: User): ManagerDto {
    return {
      id: user.id.toString(),
      name: user.fullName,
      fullName: user.fullName,
      email: user.email || '',
      department: user.department || 'Sales',
      avatar: user.avatar,
      workload: user.currentLeadsCount,
      maxCapacity: user.maxLeadsCapacity,
      workloadPercentage: user.workloadPercentage,
      role: this.getUserPrimaryRole(user.roles),
      roles: user.roles,
      conversionRate: Number(user.conversionRate) || 0,
      isAvailable: user.isAvailableForAssignment && user.isActive && !user.isOverloaded,
      skills: user.skills || [],
      territories: user.territories || []
    };
  }

  private getUserPrimaryRole(roles: string[]): string {
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
}
