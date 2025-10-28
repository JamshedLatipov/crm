import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsObject } from 'class-validator';
import { PromoCompanyStatus, PromoCompanyType } from '../entities/promo-company.entity';

export class CreatePromoCompanyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PromoCompanyType)
  type?: PromoCompanyType;

  @IsOptional()
  @IsEnum(PromoCompanyStatus)
  status?: PromoCompanyStatus;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  targetCriteria?: {
    industries?: string[];
    countries?: string[];
    leadSources?: string[];
    scoreMin?: number;
    scoreMax?: number;
  };

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePromoCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PromoCompanyType)
  type?: PromoCompanyType;

  @IsOptional()
  @IsEnum(PromoCompanyStatus)
  status?: PromoCompanyStatus;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsNumber()
  spent?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  targetCriteria?: {
    industries?: string[];
    countries?: string[];
    leadSources?: string[];
    scoreMin?: number;
    scoreMax?: number;
  };

  @IsOptional()
  @IsNumber()
  leadsReached?: number;

  @IsOptional()
  @IsNumber()
  leadsConverted?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddLeadsToPromoCompanyDto {
  @IsNumber({}, { each: true })
  leadIds: number[];
}

export class RemoveLeadsFromPromoCompanyDto {
  @IsNumber({}, { each: true })
  leadIds: number[];
}