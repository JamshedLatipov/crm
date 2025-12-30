import { IsString, IsOptional, IsEnum, IsDate, IsNumber, IsObject, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ForecastType, ForecastMethod, ForecastPeriodType, ForecastStatus } from '../entities';

export class CreateForecastDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ForecastType)
  type: ForecastType;

  @IsEnum(ForecastMethod)
  method: ForecastMethod;

  @IsEnum(ForecastPeriodType)
  periodType: ForecastPeriodType;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetValue?: number;

  @IsOptional()
  @IsObject()
  algorithmParams?: Record<string, any>;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateForecastDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ForecastStatus)
  status?: ForecastStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualValue?: number;

  @IsOptional()
  @IsObject()
  algorithmParams?: Record<string, any>;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ForecastCalculationDto {
  @IsString()
  forecastId: string;

  @IsOptional()
  @IsBoolean()
  includeHistorical?: boolean;

  @IsOptional()
  @IsObject()
  overrideParams?: Record<string, any>;
}

export class ForecastQueryDto {
  @IsOptional()
  @IsEnum(ForecastType)
  type?: ForecastType;

  @IsOptional()
  @IsEnum(ForecastStatus)
  status?: ForecastStatus;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdatePeriodActualDto {
  @IsNumber()
  @Min(0)
  actualValue: number;

  @IsOptional()
  @IsObject()
  metrics?: {
    dealsCount?: number;
    leadsCount?: number;
    conversionRate?: number;
    averageDealSize?: number;
    winRate?: number;
  };

  @IsOptional()
  @IsString()
  notes?: string;
}
