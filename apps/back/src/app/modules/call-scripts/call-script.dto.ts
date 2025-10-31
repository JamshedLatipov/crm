import { IsString, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { CallScriptCategory } from './entities/call-script.entity';

export class CreateCallScriptDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CallScriptCategory)
  category?: CallScriptCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  steps?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tips?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCallScriptDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CallScriptCategory)
  category?: CallScriptCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  steps?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tips?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}