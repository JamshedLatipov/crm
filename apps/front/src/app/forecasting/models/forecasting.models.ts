export enum ForecastType {
  REVENUE = 'revenue',
  DEALS = 'deals',
  CONVERSIONS = 'conversions',
  CUSTOM = 'custom'
}

export enum ForecastMethod {
  LINEAR_TREND = 'linear_trend',
  WEIGHTED_AVERAGE = 'weighted_average',
  PIPELINE_CONVERSION = 'pipeline_conversion',
  MOVING_AVERAGE = 'moving_average',
  EXPONENTIAL_SMOOTHING = 'exponential_smoothing',
  HISTORICAL_AVERAGE = 'historical_average'
}

export enum ForecastPeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export enum ForecastStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export interface Forecast {
  id: string;
  name: string;
  description?: string;
  type: ForecastType;
  method: ForecastMethod;
  periodType: ForecastPeriodType;
  status: ForecastStatus;
  startDate: Date;
  endDate: Date;
  targetValue: number;
  actualValue: number;
  predictedValue: number;
  confidence: number;
  accuracy: number;
  algorithmParams?: Record<string, any>;
  historicalData?: Record<string, any>;
  calculationResults?: Record<string, any>;
  ownerId?: string;
  team?: string;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ForecastPeriod {
  id: string;
  forecastId: string;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  targetValue: number;
  actualValue: number;
  predictedValue: number;
  minValue: number;
  maxValue: number;
  confidence: number;
  variance: number;
  breakdown?: Record<string, any>;
  metrics?: {
    dealsCount?: number;
    leadsCount?: number;
    conversionRate?: number;
    averageDealSize?: number;
    winRate?: number;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateForecastDto {
  name: string;
  description?: string;
  type: ForecastType;
  method: ForecastMethod;
  periodType: ForecastPeriodType;
  startDate: Date;
  endDate: Date;
  targetValue?: number;
  algorithmParams?: Record<string, any>;
  ownerId?: string;
  team?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateForecastDto {
  name?: string;
  description?: string;
  status?: ForecastStatus;
  targetValue?: number;
  actualValue?: number;
  algorithmParams?: Record<string, any>;
  team?: string;
  tags?: string[];
  notes?: string;
}

export interface ForecastComparison {
  forecast: {
    id: string;
    name: string;
    method: ForecastMethod;
    status: ForecastStatus;
  };
  summary: {
    targetValue: number;
    predictedValue: number;
    actualValue: number;
    confidence: number;
    accuracy: number;
  };
  periods: Array<{
    periodLabel: string;
    target: number;
    predicted: number;
    actual: number;
    variance: number;
    confidence: number;
  }>;
}

export const FORECAST_TYPE_LABELS: Record<ForecastType, string> = {
  [ForecastType.REVENUE]: 'Выручка',
  [ForecastType.DEALS]: 'Сделки',
  [ForecastType.CONVERSIONS]: 'Конверсии',
  [ForecastType.CUSTOM]: 'Кастомная'
};

export const FORECAST_METHOD_LABELS: Record<ForecastMethod, string> = {
  [ForecastMethod.LINEAR_TREND]: 'Линейный тренд',
  [ForecastMethod.WEIGHTED_AVERAGE]: 'Взвешенное среднее',
  [ForecastMethod.PIPELINE_CONVERSION]: 'Конверсия воронки',
  [ForecastMethod.MOVING_AVERAGE]: 'Скользящее среднее',
  [ForecastMethod.EXPONENTIAL_SMOOTHING]: 'Экспоненциальное сглаживание',
  [ForecastMethod.HISTORICAL_AVERAGE]: 'Историческое среднее'
};

export const FORECAST_PERIOD_TYPE_LABELS: Record<ForecastPeriodType, string> = {
  [ForecastPeriodType.DAILY]: 'Ежедневно',
  [ForecastPeriodType.WEEKLY]: 'Еженедельно',
  [ForecastPeriodType.MONTHLY]: 'Ежемесячно',
  [ForecastPeriodType.QUARTERLY]: 'Ежеквартально',
  [ForecastPeriodType.YEARLY]: 'Ежегодно'
};

export const FORECAST_STATUS_LABELS: Record<ForecastStatus, string> = {
  [ForecastStatus.DRAFT]: 'Черновик',
  [ForecastStatus.ACTIVE]: 'Активный',
  [ForecastStatus.COMPLETED]: 'Завершен',
  [ForecastStatus.ARCHIVED]: 'Архивный'
};
