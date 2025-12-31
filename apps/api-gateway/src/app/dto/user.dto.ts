import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsNumber, IsBoolean, IsArray, Min, Max } from 'class-validator';

export class UserFilterRequestDto {
  @ApiPropertyOptional({ example: 'manager', description: 'Filter by role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateUserRequestDto {
  @ApiProperty({ example: 'jane.doe', description: 'Unique username' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123', description: 'Password (min 6 chars)' })
  @IsString()
  password: string;

  @ApiProperty({ example: ['operator'], description: 'User roles', isArray: true })
  @IsArray()
  roles: string[];

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Sales' })
  @IsOptional()
  @IsString()
  department?: string;
}

export class UpdateUserRequestDto {
  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: ['manager'], isArray: true })
  @IsOptional()
  @IsArray()
  roles?: string[];

  @ApiPropertyOptional({ example: '1001', description: 'SIP endpoint ID' })
  @IsOptional()
  @IsString()
  sipEndpointId?: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'jane.doe' })
  username: string;

  @ApiPropertyOptional({ example: 'Jane' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiProperty({ example: ['operator'] })
  roles: string[];

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '1001' })
  sipEndpointId?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-16T14:20:00.000Z' })
  updatedAt: string;
}
