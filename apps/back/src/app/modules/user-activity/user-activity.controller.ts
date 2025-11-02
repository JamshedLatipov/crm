import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { RolesGuard } from '../user/roles.guard';
import { Roles } from '../user/roles.decorator';
import { UserRole } from '../user/user.entity';
import { UserActivityService } from './user-activity.service';
import { CreateUserActivityDto, GetUserActivitiesDto, UserActivityResponseDto } from './user-activity.dto';

@ApiTags('User Activities')
@Controller('user-activities')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserActivityController {
  constructor(private readonly userActivityService: UserActivityService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER)
  @ApiOperation({ summary: 'Создать запись активности пользователя' })
  @ApiResponse({ status: 201, description: 'Активность создана', type: UserActivityResponseDto })
  async createActivity(@Body() dto: CreateUserActivityDto): Promise<UserActivityResponseDto> {
    const activity = await this.userActivityService.createActivity(dto);
    return {
      id: activity.id,
      userId: activity.userId,
      type: activity.type,
      metadata: activity.metadata,
      description: activity.description,
      ipAddress: activity.ipAddress,
      createdAt: activity.createdAt,
    };
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER)
  @ApiOperation({ summary: 'Получить активности пользователя' })
  @ApiResponse({ status: 200, description: 'Список активностей', type: [UserActivityResponseDto] })
  async getUserActivities(
    @Param('userId') userId: string,
    @Query() query: GetUserActivitiesDto,
  ): Promise<UserActivityResponseDto[]> {
    const activities = await this.userActivityService.getUserActivities(userId, query);
    return activities.map(activity => ({
      id: activity.id,
      userId: activity.userId,
      type: activity.type,
      metadata: activity.metadata,
      description: activity.description,
      ipAddress: activity.ipAddress,
      createdAt: activity.createdAt,
    }));
  }

  @Get('user/:userId/recent')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER)
  @ApiOperation({ summary: 'Получить последние активности пользователя' })
  @ApiResponse({ status: 200, description: 'Последние активности', type: [UserActivityResponseDto] })
  async getRecentActivities(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ): Promise<UserActivityResponseDto[]> {
    const activities = await this.userActivityService.getRecentActivities(userId, limit);
    return activities.map(activity => ({
      id: activity.id,
      userId: activity.userId,
      type: activity.type,
      metadata: activity.metadata,
      description: activity.description,
      ipAddress: activity.ipAddress,
      createdAt: activity.createdAt,
    }));
  }
}