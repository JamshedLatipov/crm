import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsOptional, IsBoolean, IsNumber, IsDateString, IsString } from 'class-validator';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;

  @IsOptional()
  @IsString()
  blacklistReason?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsDateString()
  lastContactDate?: Date | string;

  @IsOptional()
  @IsDateString()
  lastActivityDate?: Date | string;
}
