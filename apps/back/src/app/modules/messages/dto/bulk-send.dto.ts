import { IsArray, IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { MessagePriority } from '../services/message-queue.service';

/**
 * DTO для массовой отправки уведомлений
 */
export class BulkSendDto {
  @IsArray()
  @IsString({ each: true })
  contactIds: string[];

  @IsOptional()
  @IsArray()
  leadIds?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dealIds?: string[];

  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority = MessagePriority.NORMAL;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
