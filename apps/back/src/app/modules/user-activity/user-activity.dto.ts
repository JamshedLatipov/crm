import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ActivityType } from './user-activity.entity';

export class CreateUserActivityDto {
  @IsUUID()
  userId: string;

  @IsEnum(ActivityType)
  type: ActivityType;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class GetUserActivitiesDto {
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  limit?: number = 50;

  @IsOptional()
  offset?: number = 0;
}

export class UserActivityResponseDto {
  id: string;
  userId: string;
  type: ActivityType;
  metadata?: Record<string, any>;
  description?: string;
  ipAddress?: string;
  createdAt: Date;
}