import { IsString, IsEnum, IsArray, IsInt, IsBoolean, IsOptional } from 'class-validator';
import { StoNotificationTrigger } from '../enums';

export class CreateNotificationRuleDto {
  @IsString()
  name: string;

  @IsEnum(StoNotificationTrigger)
  triggerStatus: StoNotificationTrigger;

  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @IsString()
  templateId: string;

  @IsOptional()
  @IsInt()
  delayMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
