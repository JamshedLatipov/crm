// Deal DTOs for inter-service communication

export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
}

export enum DealPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface CreateDealDto {
  title: string;
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate: string;
  stageId: string;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface UpdateDealDto {
  title?: string;
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  stageId?: string;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  notes?: string;
  meta?: Record<string, unknown>;
  status?: DealStatus;
}

export interface DealResponseDto {
  id: string;
  title: string;
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  stageId: string;
  status: DealStatus;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealFilterDto {
  page?: number;
  limit?: number;
  status?: DealStatus;
  stageId?: string;
  contactId?: string;
  companyId?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  fromDate?: Date;
  toDate?: Date;
}

export interface DealListResponseDto {
  items: DealResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DealStatsDto {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalValue: number;
  wonValue: number;
  avgDealSize: number;
  winRate: number;
}

export interface MoveDealStageDto {
  stageId: string;
}

export interface MarkDealWonDto {
  closedDate?: Date;
  notes?: string;
}

export interface MarkDealLostDto {
  reason?: string;
  closedDate?: Date;
}

export interface ForecastDto {
  period: { start: Date; end: Date };
  dealsCount: number;
  totalValue: number;
  weightedValue: number;
  avgProbability: number;
}
