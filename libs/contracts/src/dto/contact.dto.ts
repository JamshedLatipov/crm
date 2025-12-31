// Contact DTOs for inter-service communication

export enum ContactType {
  PERSON = 'person',
  COMPANY = 'company',
}

export enum ContactSource {
  WEBSITE = 'website',
  CALL = 'call',
  EMAIL = 'email',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  IMPORT = 'import',
  OTHER = 'other',
}

export enum ContactActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  STATUS_CHANGE = 'status_change',
  SYSTEM = 'system',
}

export interface CreateContactDto {
  type?: ContactType;
  name: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  position?: string;
  companyId?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  workPhone?: string;
  website?: string;
  address?: string;
  city?: string;
  source?: ContactSource;
  managerId?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {
  isActive?: boolean;
}

export interface ContactResponseDto {
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
  address?: string;
  city?: string;
  source?: ContactSource;
  managerId?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
  isActive: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactDate?: Date;
}

export interface ContactFilterDto {
  page?: number;
  limit?: number;
  type?: ContactType;
  source?: ContactSource;
  managerId?: string;
  companyId?: string;
  tag?: string;
  isActive?: boolean;
  isBlacklisted?: boolean;
  search?: string;
}

export interface ContactListResponseDto {
  items: ContactResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BlacklistContactDto {
  reason: string;
}

export interface AssignContactDto {
  managerId: string;
}

export interface ContactStatsDto {
  total: number;
  byType: Record<ContactType, number>;
  bySource: Record<ContactSource, number>;
  activeCount: number;
  blacklistedCount: number;
  recentCount: number;
}

export interface CreateContactActivityDto {
  type: ContactActivityType;
  title: string;
  description?: string;
  performedById?: string;
  performedByName?: string;
  metadata?: Record<string, unknown>;
}

export interface ContactActivityResponseDto {
  id: string;
  contactId: string;
  type: ContactActivityType;
  title: string;
  description?: string;
  performedById?: string;
  performedByName?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ContactActivityListDto {
  items: ContactActivityResponseDto[];
  total: number;
  page: number;
  limit: number;
}

// Message patterns payload types
export interface GetContactByIdPayload {
  id: string;
}

export interface GetContactByPhonePayload {
  phone: string;
}

export interface GetContactsByManagerPayload {
  managerId: string;
  page?: number;
  limit?: number;
}

export interface SearchContactsPayload {
  query: string;
  page?: number;
  limit?: number;
}

export interface GetDuplicateContactsPayload {
  email?: string;
  phone?: string;
}
