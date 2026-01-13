import { 
  IsString, 
  IsOptional, 
  IsArray, 
  IsBoolean, 
  IsEnum, 
  ValidateNested,
  IsNotEmpty,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SegmentUsageType } from '../entities/contact-segment.entity';

/**
 * DTO для фильтра сегмента
 */
export class SegmentFilterDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsString()
  @IsIn([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'greater',
    'less',
    'between',
    'in',
    'not_in',
    'is_null',
    'is_not_null',
  ])
  operator: string;

  @IsOptional()
  value: any;
}

/**
 * DTO для создания сегмента
 */
export class CreateContactSegmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SegmentUsageType)
  @IsOptional()
  usageType?: SegmentUsageType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentFilterDto)
  filters: SegmentFilterDto[];

  @IsString()
  @IsIn(['AND', 'OR'])
  @IsOptional()
  filterLogic?: 'AND' | 'OR';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDynamic?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO для обновления сегмента
 */
export class UpdateContactSegmentDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SegmentUsageType)
  @IsOptional()
  usageType?: SegmentUsageType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentFilterDto)
  @IsOptional()
  filters?: SegmentFilterDto[];

  @IsString()
  @IsIn(['AND', 'OR'])
  @IsOptional()
  filterLogic?: 'AND' | 'OR';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDynamic?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO для фильтрации списка сегментов
 */
export class SegmentQueryDto {
  @IsOptional()
  @IsEnum(SegmentUsageType)
  usageType?: SegmentUsageType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDynamic?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
