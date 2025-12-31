import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, Min, Max } from 'class-validator';

export class TaskFilterRequestDto {
  @ApiPropertyOptional({ example: 'pending', description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'high', description: 'Filter by priority' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by assignee' })
  @IsOptional()
  @IsNumber()
  assigneeId?: number;

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

export class CreateTaskRequestDto {
  @ApiProperty({ example: 'Follow up call', description: 'Task title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Call to discuss proposal', description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'high', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: 'call', enum: ['call', 'meeting', 'email', 'other'], description: 'Task type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '2024-01-20T10:00:00.000Z', description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 1, description: 'Related lead ID' })
  @IsOptional()
  @IsNumber()
  leadId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Related deal ID' })
  @IsOptional()
  @IsNumber()
  dealId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Related contact ID' })
  @IsOptional()
  @IsNumber()
  contactId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Assignee user ID' })
  @IsOptional()
  @IsNumber()
  assigneeId?: number;
}

export class UpdateTaskRequestDto {
  @ApiPropertyOptional({ example: 'Updated task title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'completed', enum: ['pending', 'in_progress', 'completed', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'high', enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: '2024-01-25T14:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class TaskResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Follow up call' })
  title: string;

  @ApiPropertyOptional({ example: 'Call to discuss proposal' })
  description?: string;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: 'high' })
  priority: string;

  @ApiPropertyOptional({ example: 'call' })
  type?: string;

  @ApiPropertyOptional({ example: '2024-01-20T10:00:00.000Z' })
  dueDate?: string;

  @ApiPropertyOptional({ example: 1 })
  leadId?: number;

  @ApiPropertyOptional({ example: 1 })
  dealId?: number;

  @ApiPropertyOptional({ example: 1 })
  contactId?: number;

  @ApiPropertyOptional({ example: 1 })
  assigneeId?: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-16T14:20:00.000Z' })
  updatedAt: string;
}
