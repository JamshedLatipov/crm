import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsUUID, IsBoolean } from 'class-validator';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  leadId?: number;

  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsNumber()
  taskTypeId?: number;

  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsNumber()
  taskTypeId?: number;

  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class TaskFilterDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @IsOptional()
  @IsNumber()
  leadId?: number;

  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsOptional()
  @IsNumber()
  taskTypeId?: number;

  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @IsOptional()
  @IsDateString()
  dueAfter?: string;

  @IsOptional()
  @IsBoolean()
  overdue?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class AssignTaskDto {
  @IsNumber()
  assigneeId!: number;
}

export class CompleteTaskDto {
  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export interface TaskResponseDto {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  leadId?: number;
  dealId?: string;
  contactId?: string;
  taskTypeId?: number;
  taskTypeName?: string;
  assigneeId?: number;
  assigneeName?: string;
  dueDate?: string;
  completedAt?: string;
  completedBy?: number;
  callLogId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResponseDto {
  items: TaskResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TaskStatsDto {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
}

export interface TaskTypeResponseDto {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
}
