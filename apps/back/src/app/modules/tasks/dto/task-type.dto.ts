import { IsString, IsOptional, IsBoolean, IsNumber, ValidateNested, IsArray, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkingHoursDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  start: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  end: string;
}

export class TimeFrameSettingsDto {
  @ApiPropertyOptional({ description: 'Временные рамки по умолчанию (в минутах)', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDuration?: number;

  @ApiPropertyOptional({ description: 'Минимальная длительность (в минутах)', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDuration?: number;

  @ApiPropertyOptional({ description: 'Максимальная длительность (в минутах)', example: 480 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDuration?: number;

  @ApiPropertyOptional({ description: 'Время до дедлайна для предупреждения (в минутах)', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  warningBeforeDeadline?: number;

  @ApiPropertyOptional({ description: 'Автоматическое напоминание за N минут до дедлайна', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reminderBeforeDeadline?: number;

  @ApiPropertyOptional({ description: 'Разрешить задачи без дедлайна', example: true })
  @IsOptional()
  @IsBoolean()
  allowNoDueDate?: boolean;

  @ApiPropertyOptional({ 
    description: 'Рабочие дни (1-7, где 1 - понедельник)', 
    example: [1, 2, 3, 4, 5],
    type: [Number]
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  workingDays?: number[];

  @ApiPropertyOptional({ description: 'Рабочие часы', type: WorkingHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;

  @ApiPropertyOptional({ description: 'Автоматически сдвигать дедлайн на следующий рабочий день', example: true })
  @IsOptional()
  @IsBoolean()
  skipWeekends?: boolean;

  @ApiPropertyOptional({ description: 'SLA - максимальное время ответа в минутах', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  slaResponseTime?: number;

  @ApiPropertyOptional({ description: 'SLA - максимальное время решения в минутах', example: 1440 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  slaResolutionTime?: number;
}

export class CreateTaskTypeDto {
  @ApiProperty({ example: 'Звонок клиенту' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Задача для звонка потенциальному клиенту' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'phone' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ type: TimeFrameSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeFrameSettingsDto)
  timeFrameSettings?: TimeFrameSettingsDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateTaskTypeDto {
  @ApiPropertyOptional({ example: 'Звонок клиенту' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Задача для звонка потенциальному клиенту' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'phone' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ type: TimeFrameSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeFrameSettingsDto)
  timeFrameSettings?: TimeFrameSettingsDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
