import { IsString, IsBoolean, IsOptional, MaxLength, IsArray, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWhatsAppTemplateDto {
  @ApiProperty({ description: 'Название шаблона', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Содержимое шаблона с переменными' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Категория шаблона', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'URL медиафайла', required: false })
  @IsOptional()
  @IsString()
  @IsUrl()
  mediaUrl?: string;

  @ApiProperty({ description: 'Текст кнопки', required: false })
  @IsOptional()
  @IsString()
  buttonText?: string;

  @ApiProperty({ description: 'Переменные в шаблоне', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiProperty({ description: 'Активен ли шаблон', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWhatsAppTemplateDto {
  @ApiProperty({ description: 'Название шаблона', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Содержимое шаблона', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: 'Категория шаблона', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'URL медиафайла', required: false })
  @IsOptional()
  @IsString()
  @IsUrl()
  mediaUrl?: string;

  @ApiProperty({ description: 'Текст кнопки', required: false })
  @IsOptional()
  @IsString()
  buttonText?: string;

  @ApiProperty({ description: 'Переменные в шаблоне', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiProperty({ description: 'Активен ли шаблон', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
