import { ContactType, ContactSource } from '../contact.entity';
import { IsEnum, IsString, IsNotEmpty, IsOptional, IsEmail, IsUUID, IsArray, ValidateNested, IsObject, IsUrl, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ContactAddressDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class ContactSocialMediaDto {
  @IsOptional()
  @IsString()
  telegram?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  vk?: string;
}

export class CompanyRefDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateContactDto {
  @IsEnum(ContactType)
  @IsOptional()
  type?: ContactType;

  @IsString()
  @IsNotEmpty()
  name: string;
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
  companyId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyRefDto)
  company?: CompanyRefDto;

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
  @IsUrl({ require_tld: false })
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

}
