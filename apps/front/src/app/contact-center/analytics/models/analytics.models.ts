export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  INTERNAL = 'internal',
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export interface CallFilters extends DateRange {
  agents?: string[];
  queues?: string[];
  directions?: CallDirection[];
  statuses?: string[];
  minDuration?: number;
  maxDuration?: number;
}

export interface AgentPerformance {
  agent: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgTalkTime: number;
  avgWaitTime: number;
  totalTalkTime: number;
  conversionRate?: number;
}

export interface AgentPerformanceResponse {
  data: AgentPerformance[];
  total: number;
}

export interface CallsByTime {
  period: number | string;
  count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface CallsOverview {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  internalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  abandonedCalls: number;
  avgDuration: number;
  avgWaitTime: number;
  callsByHour: CallsByTime[];
  callsByDay: CallsByTime[];
  statusDistribution: StatusDistribution[];
}

export interface SlaTrend {
  date: string;
  complianceRate: number;
  totalCalls: number;
  violatedCalls: number;
}

export interface QueueSla {
  queue: string;
  totalCalls: number;
  compliantCalls: number;
  violatedCalls: number;
  complianceRate: number;
  avgWaitTime: number;
}

export interface SlaMetrics {
  totalCalls: number;
  slaCompliantCalls: number;
  slaViolatedCalls: number;
  slaComplianceRate: number;
  avgFirstResponseTime: number;
  abandonedCallsCount: number;
  abandonRate: number;
  avgAbandonTime: number;
  trend: SlaTrend[];
  byQueue: QueueSla[];
}

export interface AbandonedCallsByQueue {
  queue: string;
  abandonedCount: number;
  totalCalls: number;
  abandonRate: number;
  avgAbandonTime: number;
}

export interface AbandonedCallsByTime {
  period: number | string;
  count: number;
}

export interface AbandonReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface AbandonedCalls {
  totalAbandoned: number;
  totalCalls: number;
  abandonRate: number;
  avgAbandonTime: number;
  medianAbandonTime: number;
  byQueue: AbandonedCallsByQueue[];
  byHour: AbandonedCallsByTime[];
  byDay: AbandonedCallsByTime[];
  reasons: AbandonReason[];
}

export interface QueueStats {
  queue: string;
  totalCalls: number;
  answeredCalls: number;
  abandonedCalls: number;
  answerRate: number;
  avgWaitTime: number;
  maxWaitTime: number;
  avgTalkTime: number;
  serviceLevelCompliance: number;
}

export interface QueueAgent {
  queue: string;
  agent: string;
  callsHandled: number;
  avgHandleTime: number;
}

export interface QueueHourlyStats {
  hour: number;
  totalCalls: number;
  answeredCalls: number;
  avgWaitTime: number;
}

export interface QueuePerformance {
  queueStats: QueueStats[];
  topAgents: QueueAgent[];
  hourlyStats: QueueHourlyStats[];
  totalCalls: number;
  overallAnswerRate: number;
  overallAvgWaitTime: number;
}

export interface IvrPath {
  path: string;
  callCount: number;
  percentage: number;
  avgTimeInIvr: number;
  completionRate: number;
}

export interface IvrNode {
  nodeName: string;
  visits: number;
  avgTimeSpent: number;
  exitCount: number;
  exitRate: number;
}

export interface IvrDtmf {
  digit: string;
  count: number;
  percentage: number;
  nodeName: string;
}

export interface IvrEventStats {
  event: string;
  count: number;
}

export interface IvrAnalysis {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  avgIvrDuration: number;
  paths: IvrPath[];
  nodes: IvrNode[];
  dtmfSelections: IvrDtmf[];
  eventStats: IvrEventStats[];
}

export interface ConversionByAgent {
  agent: string;
  totalCalls: number;
  callsWithLeads: number;
  callsWithDeals: number;
  leadConversionRate: number;
  dealConversionRate: number;
  totalRevenue: number;
  avgRevenue: number;
}

export interface ConversionTrend {
  date: string;
  totalCalls: number;
  callsWithLeads: number;
  callsWithDeals: number;
  leadConversionRate: number;
  dealConversionRate: number;
}

export interface DealStage {
  status: string;
  count: number;
  totalValue: number;
}

export interface CallConversion {
  totalCalls: number;
  callsWithLeads: number;
  callsWithDeals: number;
  leadConversionRate: number;
  dealConversionRate: number;
  totalRevenue: number;
  avgRevenue: number;
  revenuePerCall: number;
  byAgent: ConversionByAgent[];
  trend: ConversionTrend[];
  dealStages: DealStage[];
}
