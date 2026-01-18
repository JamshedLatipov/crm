import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { StoOrderStatus, StoOrderPriority } from '../enums';

export class UpdateStoOrderDto {
  @IsOptional()
  @IsEnum(StoOrderStatus)
  status?: StoOrderStatus;

  @IsOptional()
  @IsString()
  bayNumber?: string;

  @IsOptional()
  @IsString()
  mechanicId?: string;

  @IsOptional()
  @IsString()
  mechanicName?: string;

  @IsOptional()
  @IsString()
  blockedReason?: string;

  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @IsOptional()
  @IsEnum(StoOrderPriority)
  priority?: StoOrderPriority;
}
