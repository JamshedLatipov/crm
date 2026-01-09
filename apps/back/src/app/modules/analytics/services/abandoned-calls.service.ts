import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSummary } from '../../calls/entities/call-summary.entity';
import { CallFiltersDto } from '../dto';
import {
  AbandonedCallsDto,
  AbandonedCallsByQueueDto,
  AbandonedCallsByTimeDto,
  AbandonReasonDto,
} from '../dto/abandoned-calls.dto';

@Injectable()
export class AbandonedCallsService {
  constructor(
    @InjectRepository(CallSummary)
    private readonly callSummaryRepo: Repository<CallSummary>,
  ) {}

  async getAbandonedCalls(filters: CallFiltersDto): Promise<AbandonedCallsDto> {
    try {
      const baseQuery = this.callSummaryRepo.createQueryBuilder('cs');
      this.applyFilters(baseQuery, filters);

    // Get main statistics
    const statsQuery = baseQuery.clone()
      .select('COUNT(*)', 'totalCalls')
      .addSelect(
        "COUNT(CASE WHEN cs.status = 'ABANDON' THEN 1 END)",
        'totalAbandoned'
      )
      .addSelect('COALESCE(AVG(CASE WHEN cs.abandonTime > 0 THEN cs.abandonTime END), 0)', 'avgAbandonTime');

    const stats = await statsQuery.getRawOne();

    const totalCalls = parseInt(stats.totalCalls, 10);
    const totalAbandoned = parseInt(stats.totalAbandoned, 10);
    const abandonRate = totalCalls > 0
      ? Math.round((totalAbandoned / totalCalls) * 10000) / 100
      : 0;

    // Get median abandon time
    const medianQuery = this.callSummaryRepo.createQueryBuilder('cs')
      .select('cs.abandonTime')
      .where("cs.status = 'ABANDON'")
      .andWhere('cs.abandonTime > 0')
      .orderBy('cs.abandonTime', 'ASC');
    
    this.applyFilters(medianQuery, filters);
    const abandonTimes = await medianQuery.getRawMany();
    const medianAbandonTime = this.calculateMedian(
      abandonTimes.map(r => parseInt(r.abandonTime, 10))
    );

    // Get by queue
    const queueQuery = this.callSummaryRepo.createQueryBuilder('cs')
      .select('cs.queue', 'queue')
      .addSelect('COUNT(*)', 'totalCalls')
      .addSelect(
        "COUNT(CASE WHEN cs.status = 'ABANDON' THEN 1 END)",
        'abandonedCount'
      )
      .addSelect('COALESCE(AVG(CASE WHEN cs.abandonTime > 0 THEN cs.abandonTime END), 0)', 'avgAbandonTime')
      .where('cs.queue IS NOT NULL')
      .groupBy('cs.queue')
      .orderBy('"abandonedCount"', 'DESC');

    this.applyFilters(queueQuery, filters);
    const queueData = await queueQuery.getRawMany();

    const byQueue: AbandonedCallsByQueueDto[] = queueData.map((row) => {
      const total = parseInt(row.totalCalls, 10);
      const abandoned = parseInt(row.abandonedCount, 10);
      return {
        queue: row.queue || 'Unknown',
        abandonedCount: abandoned,
        totalCalls: total,
        abandonRate: total > 0 ? Math.round((abandoned / total) * 10000) / 100 : 0,
        avgAbandonTime: Math.round(parseFloat(row.avgAbandonTime)),
      };
    });

    // Get by hour
    const hourlyQuery = this.callSummaryRepo.createQueryBuilder('cs')
      .select("EXTRACT(HOUR FROM cs.startedAt)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where("cs.status = 'ABANDON'")
      .groupBy('hour')
      .orderBy('hour', 'ASC');

    this.applyFilters(hourlyQuery, filters);
    const hourlyData = await hourlyQuery.getRawMany();

    const byHour: AbandonedCallsByTimeDto[] = hourlyData.map((row) => ({
      period: parseInt(row.hour, 10),
      count: parseInt(row.count, 10),
    }));

    // Get by day
    const dailyQuery = this.callSummaryRepo.createQueryBuilder('cs')
      .select("DATE(cs.startedAt)", 'day')
      .addSelect('COUNT(*)', 'count')
      .where("cs.status = 'ABANDON'")
      .groupBy('day')
      .orderBy('day', 'ASC');

    this.applyFilters(dailyQuery, filters);
    const dailyData = await dailyQuery.getRawMany();

    const byDay: AbandonedCallsByTimeDto[] = dailyData.map((row) => ({
      period: row.day,
      count: parseInt(row.count, 10),
    }));

    // Get reasons (categorize by abandon time)
    const reasons: AbandonReasonDto[] = [
      {
        reason: 'Очень долгое ожидание (>60с)',
        count: await this.countByAbandonTimeRange(filters, 60, null),
        percentage: 0,
      },
      {
        reason: 'Долгое ожидание (30-60с)',
        count: await this.countByAbandonTimeRange(filters, 30, 60),
        percentage: 0,
      },
      {
        reason: 'Среднее ожидание (15-30с)',
        count: await this.countByAbandonTimeRange(filters, 15, 30),
        percentage: 0,
      },
      {
        reason: 'Короткое ожидание (<15с)',
        count: await this.countByAbandonTimeRange(filters, 0, 15),
        percentage: 0,
      },
    ];

    // Calculate percentages
    reasons.forEach((reason) => {
      reason.percentage = totalAbandoned > 0
        ? Math.round((reason.count / totalAbandoned) * 10000) / 100
        : 0;
    });

    return {
      totalAbandoned,
      totalCalls,
      abandonRate,
      avgAbandonTime: Math.round(parseFloat(stats.avgAbandonTime)),
      medianAbandonTime,
      byQueue,
      byHour,
      byDay,
      reasons,
    };
    } catch (error) {
      console.error('Error fetching abandoned calls:', error);
      return {
        totalAbandoned: 0,
        totalCalls: 0,
        abandonRate: 0,
        avgAbandonTime: 0,
        medianAbandonTime: 0,
        byQueue: [],
        byHour: [],
        byDay: [],
        reasons: [],
      };
    }
  }

  private async countByAbandonTimeRange(
    filters: CallFiltersDto,
    minTime: number,
    maxTime: number | null
  ): Promise<number> {
    const query = this.callSummaryRepo.createQueryBuilder('cs')
      .select('COUNT(*)', 'count')
      .where("cs.status = 'ABANDON'")
      .andWhere('cs.abandonTime >= :minTime', { minTime });

    if (maxTime !== null) {
      query.andWhere('cs.abandonTime < :maxTime', { maxTime });
    }

    this.applyFilters(query, filters);
    const result = await query.getRawOne();
    return parseInt(result.count, 10);
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }

  private applyFilters(query: any, filters: CallFiltersDto): void {
    if (filters.startDate) {
      query.andWhere('cs.startedAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters.endDate) {
      query.andWhere('cs.startedAt <= :endDate', {
        endDate: new Date(filters.endDate),
      });
    }

    if (filters.agents && filters.agents.length > 0) {
      query.andWhere('cs.agent IN (:...agents)', { agents: filters.agents });
    }

    if (filters.queues && filters.queues.length > 0) {
      query.andWhere('cs.queue IN (:...queues)', { queues: filters.queues });
    }

    if (filters.directions && filters.directions.length > 0) {
      query.andWhere('cs.direction IN (:...directions)', {
        directions: filters.directions,
      });
    }
  }
}
