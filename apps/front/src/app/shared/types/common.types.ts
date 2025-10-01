// Базовые типы для всего приложения

export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

// Типы пользователей
export interface User extends BaseEntity {
  username: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  isActive: boolean;
  fullName: string;
}

export interface Manager extends User {
  skills?: string[];
  territories?: string[];
  currentLeadsCount: number;
  maxLeadsCapacity: number;
  conversionRate: number;
  totalRevenue: number;
  totalLeadsHandled: number;
  isAvailableForAssignment: boolean;
  workloadPercentage: number;
  isOverloaded: boolean;
}

// Типы компаний
export interface Company extends BaseEntity {
  name: string;
  legalName?: string;
  inn?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

// Типы контактов
export interface Contact extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: Company;
  isPrimary?: boolean;
  notes?: string;
}

// Типы лидов
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
  OTHER = 'other'
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Lead extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  company?: Company;
  position?: string;
  status: LeadStatus;
  source?: LeadSource;
  priority: LeadPriority;
  score: number;
  assignedTo?: string;
  estimatedValue?: number;
  notes?: string;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  isQualified: boolean;
}

// Типы сделок
export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost'
}

export interface Deal extends BaseEntity {
  title: string;
  amount: number;
  currency: string;
  probability: number;
  status: DealStatus;
  expectedCloseDate: Date;
  contact?: Contact;
  company?: Company;
  stage?: DealStage;
  assignedTo?: string;
  notes?: string;
  lead?: Lead;
}

export interface DealStage extends BaseEntity {
  name: string;
  description?: string;
  probability: number;
  order: number;
  isActive: boolean;
}

// Типы комментариев
export interface Comment extends BaseEntity {
  content: string;
  authorId: number;
  authorName: string;
  entityType: 'lead' | 'deal' | 'contact' | 'company';
  entityId: number;
  isPrivate: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form Types
export interface CreateLeadForm {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: LeadSource;
  priority: LeadPriority;
  notes?: string;
  estimatedValue?: number;
}

export interface CreateDealForm {
  title: string;
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date;
  contactId?: number;
  companyId?: number;
  stageId?: number;
  notes?: string;
}

// Utility Types
export type EntityType = 'lead' | 'deal' | 'contact' | 'company' | 'user';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface AutocompleteOption<T = unknown> {
  value: T;
  label: string;
  description?: string;
}

// Event Types
export interface EntityUpdateEvent<T> {
  entity: T;
  action: 'create' | 'update' | 'delete';
  timestamp: Date;
}

// Filter Types
export interface FilterOptions {
  search?: string;
  status?: string;
  assignedTo?: string;
  source?: string;
  priority?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// Sort Types
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Table Types
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'custom';
  width?: string;
}

export interface TableAction<T = unknown> {
  icon: string;
  label: string;
  color?: 'primary' | 'accent' | 'warn';
  disabled?: (item: T) => boolean;
  action: (item: T) => void;
}