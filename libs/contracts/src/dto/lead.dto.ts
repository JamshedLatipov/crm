// Lead DTOs for inter-service communication

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATING = 'negotiating',
  CONVERTED = 'converted',
  REJECTED = 'rejected',
  LOST = 'lost',
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
  OTHER = 'other',
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface CreateLeadDto {
  name: string;
  email?: string;
  phone?: string;
  companyId?: string;
  position?: string;
  website?: string;
  industry?: string;
  country?: string;
  city?: string;
  address?: string;
  source?: LeadSource;
  sourceDetails?: string;
  campaign?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  priority?: LeadPriority;
  budget?: number;
  estimatedValue?: number;
  decisionTimeframe?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
  promoCompanyId?: number;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  status?: LeadStatus;
  score?: number;
  isQualified?: boolean;
  isUnsubscribed?: boolean;
  isDoNotCall?: boolean;
  nextFollowUpDate?: Date;
}

export interface LeadResponseDto {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  companyId?: string;
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
  priority: LeadPriority;
  budget?: number;
  estimatedValue?: number;
  decisionTimeframe?: string;
  conversionProbability: number;
  notes?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  contactAttempts: number;
  isQualified: boolean;
  isUnsubscribed: boolean;
  isDoNotCall: boolean;
  promoCompanyId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadFilterDto {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  source?: LeadSource;
  priority?: LeadPriority;
  assigneeId?: number;
  isQualified?: boolean;
  isConverted?: boolean;
  search?: string;
  minScore?: number;
  maxScore?: number;
  fromDate?: Date;
  toDate?: Date;
}

export interface LeadListResponseDto {
  items: LeadResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LeadStatsDto {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<LeadSource, number>;
  byPriority: Record<LeadPriority, number>;
  qualifiedCount: number;
  convertedCount: number;
  averageScore: number;
  totalEstimatedValue: number;
}

export interface AssignLeadDto {
  assigneeId: number;
}

export interface BulkAssignLeadsDto {
  leadIds: number[];
  assigneeId: number;
}

export interface ChangeLeadStatusDto {
  status: LeadStatus;
  autoConvert?: boolean;
}

export interface UpdateLeadScoreDto {
  score: number;
}

export interface AddLeadTagsDto {
  tags: string[];
}

export interface ScheduleFollowUpDto {
  followUpDate: Date;
}

export interface ConvertLeadDto {
  dealTitle?: string;
  dealValue?: number;
  pipelineStageId?: string;
}

export interface LeadActivityDto {
  id: number;
  leadId: number;
  type: string;
  title: string;
  description?: string;
  performedById?: number;
  performedByName?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Message patterns payload types
export interface GetLeadByIdPayload {
  id: number;
}

export interface SearchLeadsPayload {
  query: string;
  page?: number;
  limit?: number;
}

export interface GetLeadsByManagerPayload {
  managerId: number;
  page?: number;
  limit?: number;
}
