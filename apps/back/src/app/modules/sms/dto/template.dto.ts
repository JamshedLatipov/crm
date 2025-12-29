import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TemplateCategory } from '../entities/sms-template.entity';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Название шаблона' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Описание шаблона', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Текст сообщения с переменными (например: Здравствуйте, {{firstName}}!)' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @ApiProperty({
    description: 'Категория шаблона',
    enum: TemplateCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiProperty({
    description: 'Переменные в шаблоне',
    example: ['firstName', 'company', 'amount'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiProperty({ description: 'Активен ли шаблон', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTemplateDto {
  @ApiProperty({ description: 'Название шаблона', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'Описание шаблона', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Текст сообщения', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content?: string;

  @ApiProperty({
    description: 'Категория шаблона',
    enum: TemplateCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiProperty({ description: 'Переменные в шаблоне', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiProperty({ description: 'Активен ли шаблон', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TestTemplateDto {
  @ApiProperty({ description: 'ID шаблона' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'Номер телефона для тестовой отправки' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: 'Значения переменных для подстановки',
    example: { firstName: 'Иван', company: 'ООО Компания' },
    required: false,
  })
  @IsOptional()
  variables?: Record<string, any>;
}
