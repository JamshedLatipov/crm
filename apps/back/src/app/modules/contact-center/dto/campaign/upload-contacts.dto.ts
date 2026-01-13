import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsPhoneNumber,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContactDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  customData?: Record<string, any>;
}

export class UploadContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts: ContactDto[];
}
