import { Company, Deal } from '../../pipeline/dtos';

export * from './enums';

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

export enum ActivityType {
  FORM_SUBMITTED = 'form_submitted',
  EMAIL_OPENED = 'email_opened',
  EMAIL_CLICKED = 'email_clicked',
  EMAIL_REPLIED = 'email_replied',
  WEBSITE_VISITED = 'website_visited',
  PHONE_CALL_MADE = 'phone_call_made',
  PHONE_CALL_RECEIVED = 'phone_call_received',
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_ATTENDED = 'meeting_attended',
  DEMO_REQUESTED = 'demo_requested',
  DEMO_ATTENDED = 'demo_attended',
  PROPOSAL_SENT = 'proposal_sent',
  PROPOSAL_VIEWED = 'proposal_viewed',
  CONTRACT_SENT = 'contract_sent',
  CONTRACT_SIGNED = 'contract_signed',
  PAYMENT_RECEIVED = 'payment_received',
  SUPPORT_TICKET_CREATED = 'support_ticket_created',
  SOCIAL_MEDIA_ENGAGEMENT = 'social_media_engagement',
  WEBINAR_ATTENDED = 'webinar_attended',
  DOWNLOAD_COMPLETED = 'download_completed',
  NOTE_ADDED = 'note_added',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned'
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: Company;
  position?: string;
  website?: string;
  industry?: string;
  country?: string;
  city?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  deals?: Deal[];
  
  // Lead management
  status: LeadStatus;
  source: LeadSource;
  priority: LeadPriority;
  assignedTo?: string;
  
  // Scoring
  score: number;
  conversionProbability: number;
  
  // Business info
  estimatedValue?: number;
  budget?: number;
  decisionTimeframe?: string;
  
  // Tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  
  // Flags
  qualified: boolean;
  unsubscribed: boolean;
  doNotCall: boolean;
  
  // Custom fields
  customFields: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
  qualifiedAt?: Date;
  convertedAt?: Date;
  followUpAt?: Date;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  scoreChange?: number;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface LeadStatistics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageScore: number;
  totalValue: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<LeadSource, number>;
  byPriority: Record<LeadPriority, number>;
}

export interface LeadFilters {
  status?: LeadStatus[];
  source?: LeadSource[];
  priority?: LeadPriority[];
  assignedTo?: string[];
  tags?: string[];
  scoreMin?: number;
  scoreMax?: number;
  valueMin?: number;
  valueMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  lastContactedAfter?: Date;
  lastContactedBefore?: Date;
  search?: string;
}

export interface CreateLeadRequest {
  contactId?: string; // ID связанного контакта
  name: string;
  email?: string;
  phone?: string;
  company?: string; // Название компании
  companyId?: string; // ID компании
  position?: string;
  website?: string;
  industry?: string;
  country?: string;
  city?: string;
  source: LeadSource;
  priority?: LeadPriority;
  estimatedValue?: number;
  budget?: number;
  decisionTimeframe?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  customFields?: Record<string, unknown>;
  notes?: string;
  tags?: string[];
}

export interface UpdateLeadRequest {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  website?: string;
  industry?: string;
  country?: string;
  city?: string;
  priority?: LeadPriority;
  estimatedValue?: number;
  budget?: number;
  decisionTimeframe?: string;
  customFields?: Record<string, unknown>;
  notes?: string;
  tags?: string[];
}

export interface AssignLeadRequest {
  managerId: string;
}

export interface QualifyLeadRequest {
  qualified: boolean;
  notes?: string;
}

export interface UpdateStatusRequest {
  status: LeadStatus;
  notes?: string;
}

export interface AddNoteRequest {
  content: string;
}

export interface AddTagsRequest {
  tags: string[];
}

export interface ScheduleFollowUpRequest {
  followUpAt: Date;
  notes?: string;
}
