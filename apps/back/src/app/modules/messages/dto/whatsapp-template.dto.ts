import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWhatsAppTemplateDto {
  @ApiProperty({ description: 'Название шаблона', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Содержимое шаблона с переменными' })
  @IsString()
  content: string;

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

  @ApiProperty({ description: 'Активен ли шаблон', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
