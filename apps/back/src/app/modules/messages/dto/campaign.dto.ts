import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
  MinLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignType } from '../entities/message-campaign.entity';
import { MessageChannelType } from '../entities/message-campaign.entity';

export class CampaignSettingsDto {
  @ApiProperty({ description: 'Скорость отправки (сообщений в минуту)', required: false, default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  sendingSpeed?: number;

  @ApiProperty({ description: 'Повторять неудачные отправки', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  retryFailedMessages?: boolean;

  @ApiProperty({ description: 'Максимальное количество повторов', required: false, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRetries?: number;

  @ApiProperty({ description: 'Время отправки (HH:MM)', required: false })
  @IsOptional()
  @IsString()
  scheduleTime?: string;

  @ApiProperty({ description: 'Часовой пояс', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Название кампании' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ description: 'Описание кампании', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Канал отправки', 
    enum: MessageChannelType,
    default: MessageChannelType.SMS 
  })
  @IsOptional()
  @IsEnum(MessageChannelType)
  channel?: MessageChannelType;

  @ApiProperty({ description: 'ID шаблона' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'ID сегмента получателей', required: false })
  @IsOptional()
  @IsString()
  segmentId?: string;

  @ApiProperty({
    description: 'Тип кампании',
    enum: CampaignType,
    default: CampaignType.IMMEDIATE,
    required: false,
  })
  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @ApiProperty({ description: 'Дата и время запланированной отправки', required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ description: 'Настройки кампании', type: CampaignSettingsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignSettingsDto)
  settings?: CampaignSettingsDto;
}

export class UpdateCampaignDto {
  @ApiProperty({ description: 'Название кампании', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiProperty({ description: 'Описание кампании', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Канал отправки', 
    enum: MessageChannelType,
    required: false 
  })
  @IsOptional()
  @IsEnum(MessageChannelType)
  channel?: MessageChannelType;

  @ApiProperty({ description: 'ID шаблона', required: false })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ description: 'ID сегмента получателей', required: false })
  @IsOptional()
  @IsString()
  segmentId?: string;

  @ApiProperty({
    description: 'Тип кампании',
    enum: CampaignType,
    required: false,
  })
  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @ApiProperty({ description: 'Дата и время запланированной отправки', required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ description: 'Настройки кампании', type: CampaignSettingsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignSettingsDto)
  settings?: CampaignSettingsDto;
}

export class StartCampaignDto {
  @ApiProperty({ description: 'ID кампании' })
  @IsString()
  campaignId: string;
}

export class PauseCampaignDto {
  @ApiProperty({ description: 'ID кампании' })
  @IsString()
  campaignId: string;
}

export class ResumeCampaignDto {
  @ApiProperty({ description: 'ID кампании' })
  @IsString()
  campaignId: string;
}

export class CancelCampaignDto {
  @ApiProperty({ description: 'ID кампании' })
  @IsString()
  campaignId: string;
}
