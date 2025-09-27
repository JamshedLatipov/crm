// === ЛИДЫ (Leads) ===
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATING = 'negotiating',
  CONVERTED = 'converted',
  REJECTED = 'rejected',
  LOST = 'lost'
}

export enum LeadSource {
  WEBSITE = 'website',
  FACEBOOK = 'facebook',
  GOOGLE_ADS = 'google_ads',
  LINKEDIN = 'linkedin',
  EMAIL = 'email',
  PHONE = 'phone',
  REFERRAL = 'referral',
  TRADE_SHOW = 'trade_show',
  WEBINAR = 'webinar',
  CONTENT_MARKETING = 'content_marketing',
  COLD_OUTREACH = 'cold_outreach',
  PARTNER = 'partner',
  OTHER = 'other'
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface ActivityLogEntry {
  timestamp: Date;
  action: string;
  details: string;
  userId?: string;
}

export interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  website?: string;
  industry?: string;
  country?: string;
  city?: string;
  address?: string;
  status: LeadStatus;
  score: number;
  source?: LeadSource;
  sourceDetails?: string;
  campaign?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  assignedTo?: string;
  priority: LeadPriority;
  estimatedValue?: number;
  budget?: number;
  decisionTimeframe?: string;
  conversionProbability: number;
  notes?: string;
  customFields?: Record<string, string | number | boolean>;
  tags?: string[];
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  contactAttempts: number;
  activityLog?: ActivityLogEntry[];
  isQualified: boolean;
  isUnsubscribed: boolean;
  isDoNotCall: boolean;
  createdAt: Date;
  updatedAt: Date;
  deals?: Deal[];
}

export interface CreateLeadDto {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  website?: string;
  industry?: string;
  country?: string;
  city?: string;
  source?: LeadSource;
  priority?: LeadPriority;
  estimatedValue?: number;
  budget?: number;
  decisionTimeframe?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  customFields?: Record<string, string | number | boolean>;
  notes?: string;
  tags?: string[];
  assignedTo?: string;
}

export interface UpdateLeadDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  website?: string;
  industry?: string;
  country?: string;
  city?: string;
  status?: LeadStatus;
  score?: number;
  priority?: LeadPriority;
  estimatedValue?: number;
  budget?: number;
  decisionTimeframe?: string;
  customFields?: Record<string, string | number | boolean>;
  notes?: string;
  tags?: string[];
  assignedTo?: string;
}

// === СДЕЛКИ (Deals) ===
export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost'
}

export interface Deal {
  id: string;
  title: string;
  
  // Связи с другими сущностями через TypeORM отношения
  contact?: Contact;
  company?: Company;
  lead?: Lead;
  
  amount: number;
  currency: string;
  probability: number; // 0-100
  expectedCloseDate: Date;
  actualCloseDate?: Date;
  stageId: string;
  stage?: Stage;
  status: DealStatus;
  assignedTo: string;
  notes?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDealDto {
  title: string;
  
  // Связи с другими сущностями (опциональные)
  contactId?: string; // ID контакта
  companyId?: string; // ID компании  
  leadId?: number;    // ID лида
  
  amount: number;
  currency?: string;
  probability?: number;
  expectedCloseDate: string; // ISO string format
  stageId: string;
  assignedTo: string;
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface UpdateDealDto {
  title?: string;
  
  // Связи с другими сущностями
  contactId?: string;
  companyId?: string;
  leadId?: number;
  
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string; // ISO string format
  actualCloseDate?: string;   // ISO string format
  stageId?: string;
  status?: DealStatus;
  assignedTo?: string;
  notes?: string;
  meta?: Record<string, unknown>;
}

// === ЭТАПЫ ВОРОНКИ (Pipeline Stages) ===
export enum StageType {
  LEAD_QUALIFICATION = 'lead_qualification', // Для лидов
  DEAL_PROGRESSION = 'deal_progression'      // Для сделок
}

export interface Stage {
  id: string;
  name: string;
  type: StageType;
  position: number; // Порядок в воронке
  probability: number; // Вероятность закрытия для сделок на этом этапе
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStageDto {
  name: string;
  type: StageType;
  position?: number;
  probability?: number;
}

export interface UpdateStageDto {
  name?: string;
  position?: number;
  probability?: number;
  isActive?: boolean;
}

// === АНАЛИТИКА ===
export interface StageAnalytics {
  stageId: string;
  name: string;
  count: number;
  totalAmount?: number; // Для сделок
  averageAmount?: number; // Для сделок
  conversion: number; // Процент конверсии в следующий этап
  averageTimeInStage?: number; // Среднее время в этапе (дни)
}

export interface PipelineAnalytics {
  byStage: StageAnalytics[];
  totalLeads: number;
  totalDeals: number;
  totalAmount: number;
  averageDealSize: number;
  overallConversion: number;
  averageSalesCycle: number; // дни
}

// === КОМПАНИИ (Companies) ===
export enum CompanyType {
  CLIENT = 'client',
  PROSPECT = 'prospect',
  PARTNER = 'partner',
  COMPETITOR = 'competitor',
  VENDOR = 'vendor'
}

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',       // 1-50 сотрудников
  MEDIUM = 'medium',     // 51-250 сотрудников
  LARGE = 'large',       // 251-1000 сотрудников
  ENTERPRISE = 'enterprise' // 1000+ сотрудников
}

export enum Industry {
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  REAL_ESTATE = 'real_estate',
  CONSULTING = 'consulting',
  MEDIA = 'media',
  GOVERNMENT = 'government',
  OTHER = 'other'
}

export interface Company {
  id: string;
  name: string;
  legalName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  type: CompanyType;
  industry?: Industry;
  size?: CompanySize;
  employeeCount?: number;
  annualRevenue?: number;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  socialMedia?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
    vk?: string;
    telegram?: string;
  };
  description?: string;
  notes?: string;
  tags?: string[];
  isActive: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string;
  foundedDate?: Date;
  firstContactDate?: Date;
  lastContactDate?: Date;
  lastActivityDate?: Date;
  rating: number;
  source?: string;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyDto {
  name: string;
  legalName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  type?: CompanyType;
  industry?: Industry;
  size?: CompanySize;
  employeeCount?: number;
  annualRevenue?: number;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  socialMedia?: Company['socialMedia'];
  description?: string;
  notes?: string;
  tags?: string[];
  foundedDate?: Date;
  source?: string;
  ownerId?: string;
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {
  isActive?: boolean;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  rating?: number;
  lastContactDate?: Date;
  lastActivityDate?: Date;
}

// === КОНТАКТЫ (Contacts) ===
export enum ContactType {
  PERSON = 'person',
  COMPANY = 'company'
}

export enum ContactSource {
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  IMPORT = 'import',
  OTHER = 'other'
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
  companyName?: string; // Для обратной совместимости
  email?: string;
  phone?: string;
  mobilePhone?: string;
  workPhone?: string;
  website?: string;
  address?: {
    country?: string;
    region?: string;
    city?: string;
    street?: string;
    building?: string;
    apartment?: string;
    postalCode?: string;
  };
  socialMedia?: {
    telegram?: string;
    whatsapp?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    vk?: string;
  };
  source: ContactSource;
  assignedTo?: string;
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
  address?: Contact['address'];
  socialMedia?: Contact['socialMedia'];
  source?: ContactSource;
  assignedTo?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {
  isActive?: boolean;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  lastContactDate?: Date;
}
