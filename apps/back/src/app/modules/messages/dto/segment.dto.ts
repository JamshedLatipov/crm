import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SegmentFilterDto {
  @ApiProperty({ description: 'Поле для фильтрации', example: 'leadStatus' })
  @IsString()
  field: string;

  @ApiProperty({
    description: 'Оператор сравнения',
    enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater', 'less', 'between', 'in', 'not_in'],
  })
  @IsEnum(['equals', 'not_equals', 'contains', 'not_contains', 'greater', 'less', 'between', 'in', 'not_in'])
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'between' | 'in' | 'not_in';

  @ApiProperty({ description: 'Значение для сравнения' })
  value: any;
}

export class CreateSegmentDto {
  @ApiProperty({ description: 'Название сегмента' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ description: 'Описание сегмента', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Фильтры для выборки контактов',
    type: [SegmentFilterDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentFilterDto)
  filters: SegmentFilterDto[];

  @ApiProperty({
    description: 'Логика объединения фильтров',
    enum: ['AND', 'OR'],
    default: 'AND',
    required: false,
  })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  filterLogic?: 'AND' | 'OR';

  @ApiProperty({ description: 'Динамически пересчитывать сегмент', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDynamic?: boolean;

  @ApiProperty({ description: 'Активен ли сегмент', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSegmentDto {
  @ApiProperty({ description: 'Название сегмента', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiProperty({ description: 'Описание сегмента', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Фильтры для выборки контактов',
    type: [SegmentFilterDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentFilterDto)
  filters?: SegmentFilterDto[];

  @ApiProperty({
    description: 'Логика объединения фильтров',
    enum: ['AND', 'OR'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  filterLogic?: 'AND' | 'OR';

  @ApiProperty({ description: 'Динамически пересчитывать сегмент', required: false })
  @IsOptional()
  @IsBoolean()
  isDynamic?: boolean;

  @ApiProperty({ description: 'Активен ли сегмент', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
