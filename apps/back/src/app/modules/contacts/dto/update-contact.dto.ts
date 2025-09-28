import { ContactType, ContactSource } from '../contact.entity';
import { ContactAddressDto, ContactSocialMediaDto } from './create-contact.dto';
import { IsOptional, IsEnum, IsString, IsEmail, IsUUID, ValidateNested, IsArray, IsObject, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateContactDto {
  @IsEnum(ContactType)
  @IsOptional()
  type?: ContactType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string; // Ссылка на компанию по ID

  @IsOptional()
  @IsString()
  companyName?: string; // Поле для обратной совместимости

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @IsOptional()
  @IsString()
  workPhone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactAddressDto)
  address?: ContactAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactSocialMediaDto)
  socialMedia?: ContactSocialMediaDto;

  @IsEnum(ContactSource)
  @IsOptional()
  source?: ContactSource;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;

  @IsOptional()
  @IsString()
  blacklistReason?: string;

  @IsOptional()
  @IsString()
  lastContactDate?: string;
}
