export enum CampaignType {
  IVR = 'ivr',
  AGENT = 'agent',
  HYBRID = 'hybrid',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
}

export enum ContactStatus {
  PENDING = 'pending',
  CALLING = 'calling',
  ANSWERED = 'answered',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  FAILED = 'failed',
  COMPLETED = 'completed',
  EXCLUDED = 'excluded',
}

export enum CallOutcome {
  ANSWERED = 'answered',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  FAILED = 'failed',
  REJECTED = 'rejected',
  TRANSFERRED = 'transferred',
  CANCELLED = 'cancelled',
}

export interface CampaignSettings {
  maxAttempts: number;
  retryInterval: number;
  maxCallDuration: number;
  simultaneousCalls: number;
  callerIdNumber?: string;
  callerIdName?: string;
  dtmfOptions?: Record<string, string>;
}

export interface CampaignSchedule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone?: string;
  enabled?: boolean;
}

export interface OutboundCampaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  audioFileId?: string;
  audioFilePath?: string;
  queueId?: number;
  queue?: {
    id: number;
    name: string;
  };
  createdBy: number;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  settings: CampaignSettings;
  schedules?: CampaignSchedule[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
}

export interface OutboundCampaignContact {
  id: string;
  campaignId: string;
  phone: string;
  name?: string;
  customData?: Record<string, any>;
  status: ContactStatus;
  attempts: number;
  lastCallAt?: string;
  nextAttemptAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundCampaignCall {
  id: string;
  campaignId: string;
  contactId: string;
  callId?: string;
  outcome: CallOutcome;
  duration: number;
  waitTime: number;
  answeredAt?: string;
  endedAt?: string;
  notes?: string;
  agentId?: number;
  agent?: {
    id: number;
    name: string;
  };
  recordingUrl?: string;
  createdAt: string;
}

export interface CampaignStatistics {
  campaign: OutboundCampaign;
  totalContacts: number;
  totalCalls: number;
  answeredCalls: number;
  failedCalls: number;
  avgDuration: number;
  answerRate: string;
  contactsByStatus: Array<{
    status: ContactStatus;
    count: number;
  }>;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  type: CampaignType;
  audioFileId?: string;
  audioFilePath?: string;
  queueId?: number;
  settings: CampaignSettings;
  schedules?: Omit<CampaignSchedule, 'id'>[];
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> {
  status?: CampaignStatus;
}

export interface CampaignFilters {
  status?: CampaignStatus;
  type?: CampaignType;
  startDate?: string;
  endDate?: string;
  search?: string;
  queueId?: number;
}

export interface UploadContactDto {
  phone: string;
  name?: string;
  customData?: Record<string, any>;
}

export interface UploadContactsResult {
  added: number;
  skipped: number;
}
