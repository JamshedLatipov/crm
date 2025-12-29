import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';

export class SendSingleSmsDto {
  @ApiProperty({ description: 'Номер телефона получателя' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ description: 'Текст сообщения' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ description: 'ID контакта', required: false })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiProperty({ description: 'ID лида', required: false })
  @IsOptional()
  @IsString()
  leadId?: string;
}

export class SendBulkSmsDto {
  @ApiProperty({ description: 'ID шаблона для использования' })
  @IsString()
  templateId: string;

  @ApiProperty({
    description: 'Список получателей с номерами и переменными',
    example: [
      {
        phoneNumber: '+79991234567',
        variables: { firstName: 'Иван', company: 'ООО Компания' },
        contactId: 'uuid',
      },
    ],
  })
  @IsArray()
  recipients: Array<{
    phoneNumber: string;
    variables?: Record<string, any>;
    contactId?: string;
    leadId?: string;
  }>;
}

export class SendTemplatedSmsDto {
  @ApiProperty({ description: 'ID шаблона' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'Номер телефона получателя' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: 'Переменные для подстановки в шаблон',
    required: false,
    example: { firstName: 'Иван', company: 'ООО Компания' },
  })
  @IsOptional()
  variables?: Record<string, any>;

  @ApiProperty({ description: 'ID контакта', required: false })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiProperty({ description: 'ID лида', required: false })
  @IsOptional()
  @IsString()
  leadId?: string;
}
