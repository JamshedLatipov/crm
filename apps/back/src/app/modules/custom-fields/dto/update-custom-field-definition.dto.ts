import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomFieldDefinitionDto } from './create-custom-field-definition.dto';

export class UpdateCustomFieldDefinitionDto extends PartialType(
  CreateCustomFieldDefinitionDto
) {}
