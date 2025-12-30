import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Forecast, ForecastPeriod, ForecastMethod, ForecastPeriodType, ForecastStatus } from './entities';
import { CreateForecastDto, UpdateForecastDto, ForecastQueryDto, UpdatePeriodActualDto } from './dto/forecasting.dto';

@Injectable()
export class ForecastingService {
  constructor(
    @InjectRepository(Forecast)
    private forecastRepository: Repository<Forecast>,
    @InjectRepository(ForecastPeriod)
    private periodRepository: Repository<ForecastPeriod>,
  ) {}

  async create(createDto: CreateForecastDto): Promise<Forecast> {
    const forecast = this.forecastRepository.create(createDto);
    const saved = await this.forecastRepository.save(forecast);

    // Создаем периоды для прогноза
    await this.generatePeriods(saved);

    return this.findOne(saved.id);
  }

  async findAll(query: ForecastQueryDto): Promise<{ data: Forecast[]; total: number }> {
    const { page = 1, limit = 20, type, status, ownerId, team, startDate, endDate } = query;

    const qb = this.forecastRepository.createQueryBuilder('forecast')
      .leftJoinAndSelect('forecast.owner', 'owner');

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
    const forecast = await this.forecastRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!forecast) {
      throw new NotFoundException(`Forecast with ID ${id} not found`);
    }

    return forecast;
  }

  async update(id: string, updateDto: UpdateForecastDto): Promise<Forecast> {
    const forecast = await this.findOne(id);
    Object.assign(forecast, updateDto);
    await this.forecastRepository.save(forecast);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const result = await this.forecastRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Forecast with ID ${id} not found`);
    }
  }

  async calculate(forecastId: string, includeHistorical = true): Promise<Forecast> {
    const forecast = await this.findOne(forecastId);

    // Получаем периоды
    const periods = await this.periodRepository.find({
      where: { forecastId },
      order: { periodStart: 'ASC' },
    });

    if (periods.length === 0) {
      throw new BadRequestException('No periods found for forecast');
    }

    // Выбираем метод прогнозирования
    let calculationResults: any;
    switch (forecast.method) {
      case ForecastMethod.LINEAR_TREND:
        calculationResults = await this.calculateLinearTrend(forecast, periods);
        break;
      case ForecastMethod.WEIGHTED_AVERAGE:
        calculationResults = await this.calculateWeightedAverage(forecast, periods);
        break;
      case ForecastMethod.PIPELINE_CONVERSION:
        calculationResults = await this.calculatePipelineConversion(forecast, periods);
        break;
      case ForecastMethod.MOVING_AVERAGE:
        calculationResults = await this.calculateMovingAverage(forecast, periods);
        break;
      case ForecastMethod.EXPONENTIAL_SMOOTHING:
        calculationResults = await this.calculateExponentialSmoothing(forecast, periods);
        break;
      case ForecastMethod.HISTORICAL_AVERAGE:
        calculationResults = await this.calculateHistoricalAverage(forecast, periods);
        break;
      default:
        throw new BadRequestException(`Unknown forecast method: ${forecast.method}`);
    }

    // Обновляем прогноз с результатами
    forecast.calculationResults = calculationResults;
    forecast.predictedValue = calculationResults.totalPredicted;
    forecast.confidence = calculationResults.confidence;

    await this.forecastRepository.save(forecast);

    return this.findOne(forecastId);
  }

  private async generatePeriods(forecast: Forecast): Promise<void> {
    const periods: Partial<ForecastPeriod>[] = [];
    const start = new Date(forecast.startDate);
    const end = new Date(forecast.endDate);

    let current = new Date(start);
    let periodIndex = 1;

    while (current <= end) {
      const periodEnd = this.getPeriodEnd(current, forecast.periodType);
      const label = this.getPeriodLabel(current, periodIndex, forecast.periodType);

      periods.push({
        forecastId: forecast.id,
        periodStart: new Date(current),
        periodEnd: periodEnd <= end ? periodEnd : end,
        periodLabel: label,
        targetValue: 0,
        actualValue: 0,
        predictedValue: 0,
        minValue: 0,
        maxValue: 0,
        confidence: 0,
        variance: 0,
      });

      current = new Date(periodEnd.getTime() + 86400000); // +1 day
      periodIndex++;
    }

    await this.periodRepository.save(periods);
  }

  private getPeriodEnd(start: Date, type: ForecastPeriodType): Date {
    const end = new Date(start);
    switch (type) {
      case ForecastPeriodType.DAILY:
        end.setDate(end.getDate());
        break;
      case ForecastPeriodType.WEEKLY:
        end.setDate(end.getDate() + 6);
        break;
      case ForecastPeriodType.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case ForecastPeriodType.QUARTERLY:
        end.setMonth(end.getMonth() + 3);
        end.setDate(0);
        break;
      case ForecastPeriodType.YEARLY:
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(0);
        break;
    }
    return end;
  }

  private getPeriodLabel(date: Date, index: number, type: ForecastPeriodType): string {
    const year = date.getFullYear();
    const month = date.toLocaleString('default', { month: 'long' });
    const quarter = Math.floor(date.getMonth() / 3) + 1;

    switch (type) {
      case ForecastPeriodType.DAILY:
        return date.toISOString().split('T')[0];
      case ForecastPeriodType.WEEKLY:
        return `Week ${index}, ${year}`;
      case ForecastPeriodType.MONTHLY:
        return `${month} ${year}`;
      case ForecastPeriodType.QUARTERLY:
        return `Q${quarter} ${year}`;
      case ForecastPeriodType.YEARLY:
        return `${year}`;
      default:
        return `Period ${index}`;
    }
  }

  // ==================== АЛГОРИТМЫ ПРОГНОЗИРОВАНИЯ ====================

  private async calculateLinearTrend(forecast: Forecast, periods: ForecastPeriod[]): Promise<any> {
    // Простая линейная регрессия на исторических данных
    const historicalPeriods = periods.filter(p => p.actualValue > 0);
    
    if (historicalPeriods.length < 2) {
      // Недостаточно данных, используем целевое значение
      const avgTarget = forecast.targetValue / periods.length;
      // Уверенность зависит от количества периодов (меньше периодов = выше уверенность)
      const confidence = Math.max(20, Math.min(40, 50 - periods.length * 2));
      return {
        totalPredicted: forecast.targetValue,
        confidence,
        method: 'linear_trend',
        note: 'Insufficient historical data',
        periods: periods.map(p => ({
          periodId: p.id,
          predicted: avgTarget,
        })),
      };
    }

    // Расчет линейного тренда
    const n = historicalPeriods.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    historicalPeriods.forEach((period, index) => {
      const x = index + 1;
      const y = Number(period.actualValue);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Прогнозируем для всех периодов
    const predictions = periods.map((period, index) => {
      const predicted = intercept + slope * (index + 1);
      return {
        periodId: period.id,
        predicted: Math.max(0, predicted),
      };
    });

    const totalPredicted = predictions.reduce((sum, p) => sum + p.predicted, 0);
    const confidence = Math.min(95, 50 + n * 5); // Чем больше данных, тем выше уверенность

    return {
      totalPredicted,
      confidence,
      method: 'linear_trend',
      slope,
      intercept,
      periods: predictions,
    };
  }

  private async calculateWeightedAverage(forecast: Forecast, periods: ForecastPeriod[]): Promise<any> {
    // Взвешенное среднее с большим весом для недавних периодов
    const historicalPeriods = periods.filter(p => p.actualValue > 0);
    
    if (historicalPeriods.length === 0) {
      const avgTarget = forecast.targetValue / periods.length;
      const confidence = Math.max(15, Math.min(35, 45 - periods.length * 2));
      return {
        totalPredicted: forecast.targetValue,
        confidence,
        method: 'weighted_average',
        note: 'No historical data available',
        periods: periods.map(p => ({ periodId: p.id, predicted: avgTarget })),
      };
    }

    // Присваиваем веса (более свежие данные - больший вес)
    let weightedSum = 0;
    let totalWeight = 0;

    historicalPeriods.forEach((period, index) => {
      const weight = index + 1; // Линейное увеличение веса
      weightedSum += Number(period.actualValue) * weight;
      totalWeight += weight;
    });

    const weightedAvg = weightedSum / totalWeight;

    const predictions = periods.map(period => ({
      periodId: period.id,
      predicted: weightedAvg,
    }));

    const totalPredicted = weightedAvg * periods.length;
    const confidence = Math.min(90, 40 + historicalPeriods.length * 5);

    return {
      totalPredicted,
      confidence,
      method: 'weighted_average',
      weightedAverage: weightedAvg,
      periods: predictions,
    };
  }

  private async calculatePipelineConversion(forecast: Forecast, periods: ForecastPeriod[]): Promise<any> {
    // Прогноз на основе конверсии воронки продаж
    // Это требует данных из модуля Deals и Pipeline
    // Упрощенная версия - используем исторические метрики
    
    const historicalPeriods = periods.filter(p => p.metrics && p.metrics.conversionRate);
    
    if (historicalPeriods.length === 0) {
      // Используем стандартную конверсию 20%
      const avgConversion = 0.20;
      const avgTarget = forecast.targetValue / periods.length;
      const confidence = Math.max(25, Math.min(45, 55 - periods.length * 2));
      
      return {
        totalPredicted: forecast.targetValue,
        confidence,
        method: 'pipeline_conversion',
        avgConversionRate: avgConversion,
        note: 'Using default conversion rate',
        periods: periods.map(p => ({ periodId: p.id, predicted: avgTarget })),
      };
    }

    // Рассчитываем среднюю конверсию
    const avgConversion = historicalPeriods.reduce((sum, p) => 
      sum + (p.metrics.conversionRate || 0), 0) / historicalPeriods.length;

    const avgDealSize = historicalPeriods.reduce((sum, p) => 
      sum + (p.metrics.averageDealSize || 0), 0) / historicalPeriods.length;

    // Прогнозируем на основе средних значений
    const predictions = periods.map(period => {
      const predicted = avgDealSize * avgConversion * 10; // Предполагаем 10 лидов
      return {
        periodId: period.id,
        predicted: Math.max(0, predicted),
      };
    });

    const totalPredicted = predictions.reduce((sum, p) => sum + p.predicted, 0);
    const confidence = Math.min(85, 45 + historicalPeriods.length * 5);

    return {
      totalPredicted,
      confidence,
      method: 'pipeline_conversion',
      avgConversionRate: avgConversion,
      avgDealSize,
      periods: predictions,
    };
  }

  private async calculateMovingAverage(forecast: Forecast, periods: ForecastPeriod[]): Promise<any> {
    // Скользящее среднее
    const windowSize = 3;
    const historicalPeriods = periods.filter(p => p.actualValue > 0);
    
    if (historicalPeriods.length < windowSize) {
      const avgTarget = forecast.targetValue / periods.length;
      const confidence = Math.max(20, Math.min(40, 50 - periods.length * 2));
      return {
        totalPredicted: forecast.targetValue,
        confidence,
        method: 'moving_average',
        windowSize,
        note: 'Insufficient data for moving average',
        periods: periods.map(p => ({ periodId: p.id, predicted: avgTarget })),
      };
    }

    // Берем последние windowSize периодов
    const recentPeriods = historicalPeriods.slice(-windowSize);
    const movingAvg = recentPeriods.reduce((sum, p) => 
      sum + Number(p.actualValue), 0) / windowSize;

    const predictions = periods.map(period => ({
      periodId: period.id,
      predicted: movingAvg,
    }));

    const totalPredicted = movingAvg * periods.length;
    const confidence = Math.min(80, 35 + historicalPeriods.length * 3);

    return {
      totalPredicted,
      confidence,
      method: 'moving_average',
      windowSize,
      movingAverage: movingAvg,
      periods: predictions,
    };
  }

  private async calculateExponentialSmoothing(forecast: Forecast, periods: ForecastPeriod[]): Promise<any> {
    // Экспоненциальное сглаживание
    const alpha = 0.3; // Параметр сглаживания
    const historicalPeriods = periods.filter(p => p.actualValue > 0);
    
    if (historicalPeriods.length === 0) {
      const avgTarget = forecast.targetValue / periods.length;
      const confidence = Math.max(15, Math.min(35, 45 - periods.length * 2));
      return {
        totalPredicted: forecast.targetValue,
        confidence,
        method: 'exponential_smoothing',
        alpha,
        note: 'No historical data for smoothing',
        periods: periods.map(p => ({ periodId: p.id, predicted: avgTarget })),
      };
    }

    let smoothed = Number(historicalPeriods[0].actualValue);
    
    // Применяем экспоненциальное сглаживание к историческим данным
    for (let i = 1; i < historicalPeriods.length; i++) {
      const actual = Number(historicalPeriods[i].actualValue);
      smoothed = alpha * actual + (1 - alpha) * smoothed;
    }

    // Используем последнее сглаженное значение для прогноза
    const predictions = periods.map(period => ({
      periodId: period.id,
      predicted: smoothed,
    }));

    const totalPredicted = smoothed * periods.length;
    const confidence = Math.min(85, 40 + historicalPeriods.length * 4);

    return {
      totalPredicted,
      confidence,
      method: 'exponential_smoothing',
      alpha,
      smoothedValue: smoothed,
      periods: predictions,
    };
  }

  private async calculateHistoricalAverage(forecast: Forecast, periods: ForecastPeriod[]): Promise<any> {
    // Простое среднее по историческим данным
    const historicalPeriods = periods.filter(p => p.actualValue > 0);
    
    if (historicalPeriods.length === 0) {
      const avgTarget = forecast.targetValue / periods.length;
      const confidence = Math.max(20, Math.min(40, 50 - periods.length * 2));
      return {
        totalPredicted: forecast.targetValue,
        confidence,
        method: 'historical_average',
        note: 'Using target value as baseline',
        periods: periods.map(p => ({ periodId: p.id, predicted: avgTarget })),
      };
    }

    const avg = historicalPeriods.reduce((sum, p) => 
      sum + Number(p.actualValue), 0) / historicalPeriods.length;

    const predictions = periods.map(period => ({
      periodId: period.id,
      predicted: avg,
    }));

    const totalPredicted = avg * periods.length;
    const confidence = Math.min(75, 30 + historicalPeriods.length * 3);

    return {
      totalPredicted,
      confidence,
      method: 'historical_average',
      historicalAverage: avg,
      periodsUsed: historicalPeriods.length,
      periods: predictions,
    };
  }

  // ==================== УПРАВЛЕНИЕ ПЕРИОДАМИ ====================

  async getPeriods(forecastId: string): Promise<ForecastPeriod[]> {
    return this.periodRepository.find({
      where: { forecastId },
      order: { periodStart: 'ASC' },
    });
  }

  async updatePeriodActual(periodId: string, updateDto: UpdatePeriodActualDto): Promise<ForecastPeriod> {
    const period = await this.periodRepository.findOne({ where: { id: periodId } });
    if (!period) {
      throw new NotFoundException(`Period with ID ${periodId} not found`);
    }

    Object.assign(period, updateDto);
    
    // Рассчитываем отклонение
    if (period.predictedValue > 0) {
      period.variance = ((period.actualValue - period.predictedValue) / period.predictedValue) * 100;
    }

    await this.periodRepository.save(period);

    // Пересчитываем точность прогноза
    await this.updateForecastAccuracy(period.forecastId);

    return period;
  }

  private async updateForecastAccuracy(forecastId: string): Promise<void> {
    const forecast = await this.findOne(forecastId);
    const periods = await this.getPeriods(forecastId);

    const periodsWithActuals = periods.filter(p => p.actualValue > 0 && p.predictedValue > 0);
    
    if (periodsWithActuals.length === 0) return;

    // Рассчитываем среднюю точность (MAPE - Mean Absolute Percentage Error)
    const totalError = periodsWithActuals.reduce((sum, p) => {
      const error = Math.abs((p.actualValue - p.predictedValue) / p.actualValue) * 100;
      return sum + error;
    }, 0);

    const mape = totalError / periodsWithActuals.length;
    const accuracy = Math.max(0, 100 - mape);

    // Обновляем фактические значения
    const totalActual = periods.reduce((sum, p) => sum + Number(p.actualValue), 0);

    forecast.actualValue = totalActual;
    forecast.accuracy = Math.round(accuracy * 100) / 100;

    await this.forecastRepository.save(forecast);
  }

  async getComparison(forecastId: string): Promise<any> {
    const forecast = await this.findOne(forecastId);
    const periods = await this.getPeriods(forecastId);

    const periodsWithData = periods.map(period => ({
      periodLabel: period.periodLabel,
      target: period.targetValue,
      predicted: period.predictedValue,
      actual: period.actualValue,
      variance: period.variance,
      confidence: period.confidence,
    }));

    return {
      forecast: {
        id: forecast.id,
        name: forecast.name,
        method: forecast.method,
        status: forecast.status,
      },
      summary: {
        targetValue: forecast.targetValue,
        predictedValue: forecast.predictedValue,
        actualValue: forecast.actualValue,
        confidence: forecast.confidence,
        accuracy: forecast.accuracy,
      },
      periods: periodsWithData,
    };
  }
}
