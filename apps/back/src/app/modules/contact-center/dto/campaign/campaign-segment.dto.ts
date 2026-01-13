import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsEnum,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CampaignSegmentFilterDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsEnum([
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

export class CreateCampaignSegmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignSegmentFilterDto)
  filters: CampaignSegmentFilterDto[];

  @IsOptional()
  @IsEnum(['AND', 'OR'])
  filterLogic?: 'AND' | 'OR';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDynamic?: boolean;
}

export class UpdateCampaignSegmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignSegmentFilterDto)
  filters?: CampaignSegmentFilterDto[];

  @IsOptional()
  @IsEnum(['AND', 'OR'])
  filterLogic?: 'AND' | 'OR';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDynamic?: boolean;
}

export class CampaignSegmentFiltersDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDynamic?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
