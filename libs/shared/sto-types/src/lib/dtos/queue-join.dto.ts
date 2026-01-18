import { IsString, IsInt, IsOptional } from 'class-validator';

export class QueueJoinDto {
  @IsString()
  token: string; // QR token

  @IsString()
  phone: string; // +992...

  @IsOptional()
  @IsString()
  vehicleMake?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsInt()
  vehicleYear?: number;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsString()
  workType?: string;

  @IsOptional()
  @IsString()
  workDescription?: string;

  @IsOptional()
  @IsString()
  captchaToken?: string; // Google reCAPTCHA v3 (optional)
}
