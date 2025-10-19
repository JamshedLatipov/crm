export enum ContactType {
  PERSON = 'person',
  COMPANY = 'company',
}

export enum ContactSource {
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  IMPORT = 'import',
  OTHER = 'other',
}

export interface ContactAddress {
  country?: string;
  region?: string;
  city?: string;
  street?: string;
  building?: string;
  apartment?: string;
  postalCode?: string;
}

export interface ContactSocialMedia {
  telegram?: string;
  whatsapp?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  vk?: string;
}

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  position?: string;
  companyId?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  workPhone?: string;
  website?: string;
  address?: ContactAddress;
  socialMedia?: ContactSocialMedia;
  source: ContactSource;
  assignedTo?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
  isActive: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string;
  createdAt: string;
  updatedAt: string;
  lastContactDate?: string;
  company?: {
    id: string;
    name: string;
  };
  deals?: Array<{
    id: string;
    title: string;
    amount: number;
    currency: string;
  }>;
}

export interface CreateContactDto {
  type?: ContactType;
  name: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  position?: string;
  companyId?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  workPhone?: string;
  website?: string;
  address?: ContactAddress;
  socialMedia?: ContactSocialMedia;
  source?: ContactSource;
  assignedTo?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
}

export type UpdateContactDto = Partial<CreateContactDto>;

export interface ContactsStats {
  total: number;
  active: number;
  blacklisted: number;
  bySource: Record<ContactSource, number>;
  byType: Record<ContactType, number>;
  recentlyCreated: number;
  withoutActivity: number;
}

export interface ContactFilters {
  type?: ContactType;
  source?: ContactSource;
  assignedTo?: string;
  companyId?: string;
  tag?: string;
  search?: string;
  isActive?: boolean;
  isBlacklisted?: boolean;
  // Pagination
  page?: number;
  pageSize?: number;
}

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  DEAL = 'deal',
  SYSTEM = 'system'
}

export interface ContactActivity {
  id: string;
  contactId: string;
  type: ActivityType;
  title: string;
  description?: string;
  date: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}

export interface Deal {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  stage?: string;
  probability?: number;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  contactId?: string;
  companyId?: string;
}

export interface CreateDealDto {
  title: string;
  amount: number;
  currency?: string;
  description?: string;
  status?: string;
  probability?: number;
  expectedCloseDate?: string;
  contactId?: string;
  companyId?: string;
  assignedTo?: string;
}
