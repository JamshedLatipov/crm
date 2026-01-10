import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SettingCategory } from '../entities/setting.entity';

export class CreateSettingDto {
  @ApiProperty({ description: 'Ключ настройки' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Значение настройки' })
  @IsString()
  value: string;

  @ApiProperty({ description: 'Категория настройки', enum: SettingCategory })
  @IsEnum(SettingCategory)
  category: SettingCategory;

  @ApiProperty({ description: 'Описание настройки', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Секретное значение (скрыть в UI)', default: false })
  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;
}

export class UpdateSettingDto {
  @ApiProperty({ description: 'Значение настройки', required: false })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({ description: 'Описание настройки', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkUpdateSettingDto {
  @ApiProperty({ description: 'Ключ настройки' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Значение настройки' })
  @IsString()
  value: string;
}

export class TestSettingDto {
  @ApiProperty({ description: 'Категория для тестирования', enum: SettingCategory })
  @IsEnum(SettingCategory)
  category: SettingCategory;

  @ApiProperty({ description: 'Тестовый получатель (телефон/email)', required: false })
  @IsOptional()
  @IsString()
  recipient?: string;
}
