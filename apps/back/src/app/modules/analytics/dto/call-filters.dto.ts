import { IsOptional, IsArray, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DateRangeDto } from './date-range.dto';

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  INTERNAL = 'internal',
}

export class CallFiltersDto extends DateRangeDto {
  @ApiPropertyOptional({
    description: 'Filter by agent identifiers',
    type: [String],
    example: ['agent1', 'agent2'],
  })
  @IsOptional()
  @IsArray()
  agents?: string[];

  @ApiPropertyOptional({
    description: 'Filter by queue names',
    type: [String],
    example: ['support', 'sales'],
  })
  @IsOptional()
  @IsArray()
  queues?: string[];

  @ApiPropertyOptional({
    description: 'Filter by call directions',
    enum: CallDirection,
    isArray: true,
    example: [CallDirection.INBOUND, CallDirection.OUTBOUND],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(CallDirection, { each: true })
  directions?: CallDirection[];

  @ApiPropertyOptional({
    description: 'Filter by call statuses',
    type: [String],
    example: ['ANSWERED', 'NO ANSWER'],
  })
  @IsOptional()
  @IsArray()
  statuses?: string[];

  @ApiPropertyOptional({
    description: 'Minimum call duration in seconds',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minDuration?: number;

  @ApiPropertyOptional({
    description: 'Maximum call duration in seconds',
    example: 3600,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDuration?: number;
}
