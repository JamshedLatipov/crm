import { IsEmail, IsString, IsBoolean, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsArray()
  @IsString({ each: true })
  roles: string[];

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  territories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLeadsCapacity?: number;

  @IsOptional()
  @IsBoolean()
  isAvailableForAssignment?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  territories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxLeadsCapacity?: number;

  @IsOptional()
  @IsBoolean()
  isAvailableForAssignment?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AutoAssignCriteriaDto {
  @IsArray()
  @IsString({ each: true })
  criteria: string[];

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  territory?: string;
}

export class ManagerStatsResponseDto {
  totalManagers: number;
  availableManagers: number;
  overloadedManagers: number;
  averageWorkload: number;
  topPerformers: Array<{
    id: number;
    name: string;
    conversionRate: number;
    totalLeads: number;
  }>;
}

export class UserResponseDto {
  id: number;
  username: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  skills?: string[];
  territories?: string[];
  currentLeadsCount: number;
  maxLeadsCapacity: number;
  conversionRate: number;
  totalRevenue: number;
  totalLeadsHandled: number;
  isAvailableForAssignment: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  
  // Helper getters
  fullName: string;
  workloadPercentage: number;
  isOverloaded: boolean;
}