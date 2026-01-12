import { IsOptional, IsString, IsBoolean, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a single filter condition
 * Can be used for any entity with static and custom fields
 */
export class UniversalFilterDto {
  @IsIn(['static', 'custom'])
  fieldType: 'static' | 'custom';

  @IsString()
  fieldName: string;

  @IsString()
  fieldLabel: string;

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
    'exists',
  ])
  operator: string;

  @IsOptional()
  value?: string | number | boolean | string[] | number[];
}

/**
 * Base DTO for advanced search with filters
 * Can be extended by specific entity DTOs
 */
export class BaseAdvancedSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UniversalFilterDto)
  filters?: UniversalFilterDto[];

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
