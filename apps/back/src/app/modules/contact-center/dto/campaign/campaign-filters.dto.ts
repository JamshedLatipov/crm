import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { CampaignStatus, CampaignType } from '../../entities/outbound-campaign.entity';

export class CampaignFiltersDto {
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  queueId?: string;
}
