import { ContactType, ContactSource } from '../contact.entity';
import { ContactAddressDto, ContactSocialMediaDto } from './create-contact.dto';

export class UpdateContactDto {
  type?: ContactType;
  name?: string;
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
  source?: ContactSource;
  assignedTo?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
  isActive?: boolean;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  lastContactDate?: string;
}
