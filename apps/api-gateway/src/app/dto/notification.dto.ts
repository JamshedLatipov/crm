import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class NotificationFilterRequestDto {
  @ApiPropertyOptional({ example: false, description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ example: 'task', description: 'Filter by type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateNotificationRequestDto {
  @ApiProperty({ example: 1, description: 'User ID to notify' })
  @IsNumber()
  userId: number;

  @ApiProperty({ example: 'task', description: 'Notification type' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'New Task Assigned', description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'You have been assigned a new task: Follow up call', description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: { taskId: 1, leadId: 2 },
    description: 'Additional data/metadata',
  })
  @IsOptional()
  data?: Record<string, unknown>;
}

export class NotificationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 'task' })
  type: string;

  @ApiProperty({ example: 'New Task Assigned' })
  title: string;

  @ApiProperty({ example: 'You have been assigned a new task: Follow up call' })
  message: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiPropertyOptional({
    example: { taskId: 1, leadId: 2 },
  })
  data?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:35:00.000Z' })
  readAt?: string;
}

export class NotificationCountResponseDto {
  @ApiProperty({ example: 5, description: 'Total unread notifications' })
  unread: number;

  @ApiProperty({ example: 25, description: 'Total notifications' })
  total: number;
}

export class MarkReadRequestDto {
  @ApiPropertyOptional({
    example: [1, 2, 3],
    description: 'Notification IDs to mark as read. If empty, marks all as read.',
    isArray: true,
  })
  @IsOptional()
  ids?: number[];
}
