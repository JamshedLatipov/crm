import { IsString, IsEnum, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommentEntityType } from '../entities/comment.entity';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Текст комментария',
    example: 'Обсудили детали сделки с клиентом, готов к следующему этапу',
    minLength: 1,
    maxLength: 2000
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @ApiProperty({
    description: 'Тип сущности',
    enum: CommentEntityType,
    example: CommentEntityType.DEAL
  })
  @IsEnum(CommentEntityType)
  entityType: CommentEntityType;

  @ApiProperty({
    description: 'ID сущности',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Новый текст комментария',
    example: 'Обновленный текст комментария',
    minLength: 1,
    maxLength: 2000,
    required: false
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(2000)
  text?: string;
}

export class CommentQueryDto {
  @ApiProperty({
    description: 'Тип сущности для фильтрации',
    enum: CommentEntityType,
    required: false
  })
  @IsEnum(CommentEntityType)
  @IsOptional()
  entityType?: CommentEntityType;

  @ApiProperty({
    description: 'ID сущности для фильтрации',
    required: false
  })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiProperty({
    description: 'ID пользователя для фильтрации',
    required: false
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Номер страницы',
    example: 1,
    required: false
  })
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: 'Количество элементов на странице',
    example: 20,
    required: false
  })
  @IsOptional()
  limit?: number;
}