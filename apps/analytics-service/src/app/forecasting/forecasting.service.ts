import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Forecast, ForecastStatus, ForecastPeriodType, ForecastMethod, ForecastType } from './entities/forecast.entity';
import { ForecastPeriod } from './entities/forecast-period.entity';

export interface CreateForecastDto {
  name: string;
  description?: string;
  type?: ForecastType;
  method?: ForecastMethod;
  periodType?: ForecastPeriodType;
  startDate: Date;
  endDate: Date;
  targetValue?: number;
  ownerId?: number;
  team?: string;
  algorithmParams?: Record<string, any>;
}

export type UpdateForecastDto = Partial<CreateForecastDto> & { status?: ForecastStatus };

export interface ForecastQueryDto {
  page?: number;
  limit?: number;
  type?: ForecastType;
  status?: ForecastStatus;
  ownerId?: number;
  team?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class ForecastingService {
  constructor(
    @InjectRepository(Forecast)
    private forecastRepo: Repository<Forecast>,
    @InjectRepository(ForecastPeriod)
    private periodRepo: Repository<ForecastPeriod>,
  ) {}

  async create(dto: CreateForecastDto): Promise<Forecast> {
    const forecast = this.forecastRepo.create(dto);
    const saved = await this.forecastRepo.save(forecast);
    await this.generatePeriods(saved);
    return this.findOne(saved.id);
  }

  async findAll(query: ForecastQueryDto): Promise<{ data: Forecast[]; total: number }> {
    const { page = 1, limit = 20, type, status, ownerId, team, startDate, endDate } = query;

    const qb = this.forecastRepo.createQueryBuilder('forecast');

    if (type) qb.andWhere('forecast.type = :type', { type });
    if (status) qb.andWhere('forecast.status = :status', { status });
    if (ownerId) qb.andWhere('forecast.ownerId = :ownerId', { ownerId });
    if (team) qb.andWhere('forecast.team = :team', { team });
    if (startDate) qb.andWhere('forecast.startDate >= :startDate', { startDate });
    if (endDate) qb.andWhere('forecast.endDate <= :endDate', { endDate });

    qb.orderBy('forecast.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Forecast> {
    const forecast = await this.forecastRepo.findOne({ where: { id } });
    if (!forecast) throw new NotFoundException(`Forecast ${id} not found`);
    return forecast;
  }

  async update(id: string, dto: UpdateForecastDto): Promise<Forecast> {
    const forecast = await this.findOne(id);
    Object.assign(forecast, dto);
    await this.forecastRepo.save(forecast);
    return this.findOne(id);
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const result = await this.forecastRepo.delete(id);
    return { deleted: (result.affected ?? 0) > 0 };
  }

  async getPeriods(forecastId: string): Promise<ForecastPeriod[]> {
    return this.periodRepo.find({
      where: { forecastId },
      order: { periodStart: 'ASC' },
    });
  }

  async updatePeriodActual(periodId: string, actualValue: number, notes?: string): Promise<ForecastPeriod> {
    const period = await this.periodRepo.findOne({ where: { id: periodId } });
    if (!period) throw new NotFoundException(`Period ${periodId} not found`);
    
    period.actualValue = actualValue;
    if (notes) period.notes = notes;
    period.variance = period.predictedValue > 0 
      ? ((actualValue - period.predictedValue) / period.predictedValue) * 100 
      : 0;
    
    return this.periodRepo.save(period);
  }

  async calculate(forecastId: string): Promise<Forecast> {
    const forecast = await this.findOne(forecastId);
    const periods = await this.getPeriods(forecastId);

    // Simple calculation based on method
    switch (forecast.method) {
      case ForecastMethod.LINEAR_TREND:
        await this.calculateLinearTrend(forecast, periods);
        break;
      case ForecastMethod.MOVING_AVERAGE:
        await this.calculateMovingAverage(forecast, periods);
        break;
      case ForecastMethod.WEIGHTED_AVERAGE:
        await this.calculateWeightedAverage(forecast, periods);
        break;
      default:
        await this.calculateHistoricalAverage(forecast, periods);
    }

    // Update forecast totals
    const updatedPeriods = await this.getPeriods(forecastId);
    forecast.predictedValue = updatedPeriods.reduce((sum, p) => sum + Number(p.predictedValue), 0);
    forecast.actualValue = updatedPeriods.reduce((sum, p) => sum + Number(p.actualValue), 0);
    forecast.confidence = this.calculateConfidence(updatedPeriods);

    return this.forecastRepo.save(forecast);
  }

  async activate(id: string): Promise<Forecast> {
    return this.update(id, { status: ForecastStatus.ACTIVE });
  }

  async complete(id: string): Promise<Forecast> {
    return this.update(id, { status: ForecastStatus.COMPLETED });
  }

  async archive(id: string): Promise<Forecast> {
    return this.update(id, { status: ForecastStatus.ARCHIVED });
  }

  async duplicate(id: string): Promise<Forecast> {
    const original = await this.findOne(id);
    const { id: _id, createdAt, updatedAt, ...data } = original as any;
    
    const newForecast = this.forecastRepo.create({
      ...data,
      name: `${original.name} (copy)`,
      status: ForecastStatus.DRAFT,
    } as Forecast);
    
    const savedResult = await this.forecastRepo.save(newForecast);
    const saved = Array.isArray(savedResult) ? savedResult[0] : savedResult;
    if (!saved) throw new Error('Failed to save forecast');
    await this.generatePeriods(saved);
    return this.findOne(saved.id);
  }

  async getStats(): Promise<any> {
    const [total, active, completed] = await Promise.all([
      this.forecastRepo.count(),
      this.forecastRepo.count({ where: { status: ForecastStatus.ACTIVE } }),
      this.forecastRepo.count({ where: { status: ForecastStatus.COMPLETED } }),
    ]);

    return { total, active, completed, draft: total - active - completed };
  }

  private async generatePeriods(forecast: Forecast): Promise<void> {
    const periods: Partial<ForecastPeriod>[] = [];
    const start = new Date(forecast.startDate);
    const end = new Date(forecast.endDate);
    let current = new Date(start);

    while (current <= end) {
      const periodEnd = this.getNextPeriodEnd(current, forecast.periodType);
      
      periods.push({
        forecastId: forecast.id,
        periodStart: new Date(current),
        periodEnd: periodEnd > end ? end : periodEnd,
        periodLabel: this.getPeriodLabel(current, forecast.periodType),
        targetValue: forecast.targetValue / this.estimatePeriodCount(start, end, forecast.periodType),
      });

      current = this.getNextPeriodStart(current, forecast.periodType);
    }

    await this.periodRepo.save(periods as ForecastPeriod[]);
  }

  private getNextPeriodEnd(date: Date, periodType: ForecastPeriodType): Date {
    const d = new Date(date);
    switch (periodType) {
      case ForecastPeriodType.DAILY:
        d.setDate(d.getDate() + 1);
        break;
      case ForecastPeriodType.WEEKLY:
        d.setDate(d.getDate() + 7);
        break;
      case ForecastPeriodType.MONTHLY:
        d.setMonth(d.getMonth() + 1);
        break;
      case ForecastPeriodType.QUARTERLY:
        d.setMonth(d.getMonth() + 3);
        break;
      case ForecastPeriodType.YEARLY:
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    d.setDate(d.getDate() - 1);
    return d;
  }

  private getNextPeriodStart(date: Date, periodType: ForecastPeriodType): Date {
    const d = new Date(date);
    switch (periodType) {
      case ForecastPeriodType.DAILY:
        d.setDate(d.getDate() + 1);
        break;
      case ForecastPeriodType.WEEKLY:
        d.setDate(d.getDate() + 7);
        break;
      case ForecastPeriodType.MONTHLY:
        d.setMonth(d.getMonth() + 1);
        break;
      case ForecastPeriodType.QUARTERLY:
        d.setMonth(d.getMonth() + 3);
        break;
      case ForecastPeriodType.YEARLY:
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d;
  }

  private getPeriodLabel(date: Date, periodType: ForecastPeriodType): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear();
    const month = date.getMonth();

    switch (periodType) {
      case ForecastPeriodType.DAILY:
        return date.toISOString().split('T')[0] || '';
      case ForecastPeriodType.WEEKLY:
        return `Week ${this.getWeekNumber(date)}, ${year}`;
      case ForecastPeriodType.MONTHLY:
        return `${months[month]} ${year}`;
      case ForecastPeriodType.QUARTERLY:
        return `Q${Math.floor(month / 3) + 1} ${year}`;
      case ForecastPeriodType.YEARLY:
        return `${year}`;
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private estimatePeriodCount(start: Date, end: Date, periodType: ForecastPeriodType): number {
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    switch (periodType) {
      case ForecastPeriodType.DAILY:
        return Math.ceil(diffDays);
      case ForecastPeriodType.WEEKLY:
        return Math.ceil(diffDays / 7);
      case ForecastPeriodType.MONTHLY:
        return Math.ceil(diffDays / 30);
      case ForecastPeriodType.QUARTERLY:
        return Math.ceil(diffDays / 90);
      case ForecastPeriodType.YEARLY:
        return Math.ceil(diffDays / 365);
    }
  }

  private async calculateLinearTrend(forecast: Forecast, periods: ForecastPeriod[]): Promise<void> {
    // Simple linear trend based on target distribution
    const totalTarget = Number(forecast.targetValue);
    const increment = totalTarget / periods.length;
    
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      if (period) {
        period.predictedValue = increment * (1 + i * 0.05);
        period.minValue = period.predictedValue * 0.8;
        period.maxValue = period.predictedValue * 1.2;
        period.confidence = 80 - i * 2;
        await this.periodRepo.save(period);
      }
    }
  }

  private async calculateMovingAverage(forecast: Forecast, periods: ForecastPeriod[]): Promise<void> {
    const windowSize = 3;
    
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      if (!period) continue;
      
      if (i < windowSize) {
        period.predictedValue = Number(forecast.targetValue) / periods.length;
      } else {
        const windowPeriods = periods.slice(i - windowSize, i);
        const avgActual = windowPeriods.reduce((sum, p) => sum + Number(p.actualValue || p.predictedValue), 0) / windowSize;
        period.predictedValue = avgActual;
      }
      
      period.minValue = period.predictedValue * 0.85;
      period.maxValue = period.predictedValue * 1.15;
      period.confidence = 75;
      await this.periodRepo.save(period);
    }
  }

  private async calculateWeightedAverage(forecast: Forecast, periods: ForecastPeriod[]): Promise<void> {
    const weights = [0.5, 0.3, 0.2];
    
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      if (!period) continue;
      
      let predicted = Number(forecast.targetValue) / periods.length;
      
      if (i >= 3) {
        const recent = periods.slice(i - 3, i);
        predicted = recent.reduce((sum, p, idx) => {
          const w = weights[idx] ?? 0;
          return sum + Number(p.actualValue || p.predictedValue) * w;
        }, 0);
      }
      
      period.predictedValue = predicted;
      period.minValue = predicted * 0.8;
      period.maxValue = predicted * 1.2;
      period.confidence = 70;
      await this.periodRepo.save(period);
    }
  }

  private async calculateHistoricalAverage(forecast: Forecast, periods: ForecastPeriod[]): Promise<void> {
    const avgPerPeriod = Number(forecast.targetValue) / periods.length;
    
    for (const period of periods) {
      period.predictedValue = avgPerPeriod;
      period.minValue = avgPerPeriod * 0.75;
      period.maxValue = avgPerPeriod * 1.25;
      period.confidence = 65;
      await this.periodRepo.save(period);
    }
  }

  private calculateConfidence(periods: ForecastPeriod[]): number {
    if (periods.length === 0) return 0;
    const avgConfidence = periods.reduce((sum, p) => sum + Number(p.confidence), 0) / periods.length;
    return Math.round(avgConfidence);
  }
}
