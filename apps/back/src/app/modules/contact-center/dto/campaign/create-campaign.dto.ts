import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignType } from '../../entities/outbound-campaign.entity';

export class CampaignSettingsDto {
  @IsNumber()
  @Min(1)
  @Max(10)
  maxAttempts: number;

  @IsNumber()
  @Min(5)
  @Max(1440)
  retryInterval: number;

  @IsNumber()
  @Min(30)
  @Max(3600)
  maxCallDuration: number;

  @IsNumber()
  @Min(1)
  @Max(50)
  simultaneousCalls: number;

  @IsOptional()
  @IsString()
  callerIdNumber?: string;

  @IsOptional()
  @IsString()
  callerIdName?: string;

  @IsOptional()
  @IsObject()
  dtmfOptions?: Record<string, string>;
}

export class CampaignScheduleDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CampaignType)
  type: CampaignType;

  @IsOptional()
  @IsString()
  audioFileId?: string;

  @IsOptional()
  @IsString()
  audioFilePath?: string;

  @IsOptional()
  @IsNumber()
  queueId?: number;

  @ValidateNested()
  @Type(() => CampaignSettingsDto)
  settings: CampaignSettingsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignScheduleDto)
  schedules?: CampaignScheduleDto[];
}
