import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ActivityType } from '../contact-activity.entity';

export class CreateActivityDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}