// === ЛИДЫ (Leads) ===
export enum LeadStatus {
  NEW = 'new',
  QUALIFIED = 'qualified',
  UNQUALIFIED = 'unqualified',
  CONVERTED = 'converted',
  LOST = 'lost'
}

export enum LeadSource {
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  OTHER = 'other'
}

export interface Lead {
  id: string;
  title: string; // Например: "Заинтересован в CRM системе"
  contact: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  source: LeadSource;
  status: LeadStatus;
  score: number; // 0-100, оценка качества лида
  assignedTo?: string; // ID менеджера
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface CreateLeadDto {
  title: string;
  contact: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  source: LeadSource;
  assignedTo?: string;
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface UpdateLeadDto {
  title?: string;
  contact?: Partial<Lead['contact']>;
  status?: LeadStatus;
  score?: number;
  assignedTo?: string;
  notes?: string;
  meta?: Record<string, unknown>;
}

// === СДЕЛКИ (Deals) ===
export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost'
}

export interface Deal {
  id: string;
  title: string; // "Продажа CRM системы для ООО Рога и Копыта"
  leadId?: string; // Связь с лидом (если сделка создана из лида)
  contact: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  amount: number; // Сумма сделки
  currency: string; // RUB, USD, EUR
  probability: number; // 0-100, вероятность закрытия
  expectedCloseDate: Date;
  actualCloseDate?: Date;
  stageId: string; // Этап воронки
  status: DealStatus;
  assignedTo: string; // ID менеджера
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface CreateDealDto {
  title: string;
  leadId?: string;
  contact: Deal['contact'];
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date;
  stageId: string;
  assignedTo: string;
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface UpdateDealDto {
  title?: string;
  contact?: Partial<Deal['contact']>;
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
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
