import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FieldType,
  EntityType,
  ValidationRule,
  SelectOption,
  DisplayConfig,
} from '../entities/custom-field-definition.entity';

export class CreateCustomFieldDefinitionDto {
  @IsEnum(['contact', 'lead', 'deal', 'company'])
  @IsNotEmpty()
  entityType: EntityType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsEnum([
    'text',
    'number',
    'date',
    'boolean',
    'select',
    'multiselect',
    'email',
    'phone',
    'url',
    'textarea',
  ])
  @IsNotEmpty()
  fieldType: FieldType;

  @IsOptional()
  @IsArray()
  validationRules?: ValidationRule[];

  @IsOptional()
  @IsArray()
  selectOptions?: SelectOption[];

  @IsObject()
  @IsNotEmpty()
  displayConfig: DisplayConfig;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  defaultValue?: string;
}
