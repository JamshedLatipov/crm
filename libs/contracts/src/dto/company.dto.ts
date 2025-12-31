// Company DTOs for inter-service communication

export enum CompanySize {
  SMALL = 'small',       // 1-10 employees
  MEDIUM = 'medium',     // 11-50 employees
  LARGE = 'large',       // 51-200 employees
  ENTERPRISE = 'enterprise', // 200+ employees
}

export enum CompanyIndustry {
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  EDUCATION = 'education',
  REAL_ESTATE = 'real_estate',
  CONSULTING = 'consulting',
  LOGISTICS = 'logistics',
  OTHER = 'other',
}

export interface CreateCompanyDto {
  name: string;
  legalName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  industry?: CompanyIndustry;
  size?: CompanySize;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  description?: string;
  managerId?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {
  isActive?: boolean;
}

export interface CompanyResponseDto {
  id: string;
  name: string;
  legalName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  industry?: CompanyIndustry;
  size?: CompanySize;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  description?: string;
  managerId?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  isActive: boolean;
  employeeCount?: number;
  revenue?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyFilterDto {
  page?: number;
  limit?: number;
  industry?: CompanyIndustry;
  size?: CompanySize;
  managerId?: string;
  city?: string;
  country?: string;
  tag?: string;
  isActive?: boolean;
  search?: string;
}

export interface CompanyListResponseDto {
  items: CompanyResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CompanyStatsDto {
  total: number;
  byIndustry: Record<CompanyIndustry, number>;
  bySize: Record<CompanySize, number>;
  activeCount: number;
}
