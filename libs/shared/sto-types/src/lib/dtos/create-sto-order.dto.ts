import { IsString, IsEnum, IsInt, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';
import { StoOrderZone, StoOrderPriority } from '../enums';

export class CreateStoOrderDto {
  @IsEnum(StoOrderZone)
  zone: StoOrderZone;

  @IsString()
  vehicleMake: string;

  @IsString()
  vehicleModel: string;

  @IsInt()
  vehicleYear: number;

  @IsString()
  licensePlate: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsString()
  workDescription: string;

  @IsString()
  workType: string;

  @IsInt()
  estimatedDurationMinutes: number;

  @IsEnum(StoOrderPriority)
  @IsOptional()
  priority?: StoOrderPriority;

  @IsOptional()
  @IsArray()
  requiredParts?: Array<{ itemId: string; name: string; quantity: number }>;

  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isSelfService?: boolean;

  @IsOptional()
  @IsString()
  qrCodeId?: string;
}
