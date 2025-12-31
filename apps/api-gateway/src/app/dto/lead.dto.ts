import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsNumber, IsArray, IsBoolean, Min, Max } from 'class-validator';

export class LeadFilterRequestDto {
  @ApiPropertyOptional({ example: 'new', description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'website', description: 'Filter by source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by assignee ID' })
  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'], description: 'Sort order' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

export class CreateLeadRequestDto {
  @ApiProperty({ example: 'John', description: 'Lead first name' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Lead last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Lead email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Lead phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Corp', description: 'Company name' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'website', description: 'Lead source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 10000, description: 'Estimated value' })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiPropertyOptional({ example: 1, description: 'Assignee user ID' })
  @IsOptional()
  @IsNumber()
  assigneeId?: number;
}

export class UpdateLeadRequestDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contacted', enum: ['new', 'contacted', 'qualified', 'converted', 'lost'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;
}

export class LeadResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiProperty({ example: 'new' })
  status: string;

  @ApiPropertyOptional({ example: 'website' })
  source?: string;

  @ApiPropertyOptional({ example: 10000 })
  estimatedValue?: number;

  @ApiPropertyOptional({ example: 50 })
  score?: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-16T14:20:00.000Z' })
  updatedAt: string;
}

export class BulkAssignRequestDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Array of lead IDs to assign' })
  @IsArray()
  leadIds: number[];

  @ApiProperty({ example: 5, description: 'User ID to assign leads to' })
  @IsNumber()
  assigneeId: number;
}
