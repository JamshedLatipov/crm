import { ContactType, ContactSource } from '../contact.entity';

export class ContactAddressDto {
  country?: string;
  region?: string;
  city?: string;
  street?: string;
  building?: string;
  apartment?: string;
  postalCode?: string;
}

export class ContactSocialMediaDto {
  telegram?: string;
  whatsapp?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  vk?: string;
}

export class CreateContactDto {
  type: ContactType;
  name: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  position?: string;
  company?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  workPhone?: string;
  website?: string;
  address?: ContactAddressDto;
  socialMedia?: ContactSocialMediaDto;
  source: ContactSource;
  assignedTo?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
}
