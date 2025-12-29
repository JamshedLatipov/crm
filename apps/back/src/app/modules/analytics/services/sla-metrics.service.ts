import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSummary } from '../../calls/entities/call-summary.entity';
import { CallFiltersDto } from '../dto';
import { SlaMetricsDto, SlaTrendDto, QueueSlaDto } from '../dto/sla-metrics.dto';

@Injectable()
export class SlaMetricsService {
  constructor(
    @InjectRepository(CallSummary)
    private readonly callSummaryRepo: Repository<CallSummary>,
  ) {}

  async getSlaMetrics(filters: CallFiltersDto): Promise<SlaMetricsDto> {
    try {
      const baseQuery = this.callSummaryRepo.createQueryBuilder('cs');
      this.applyFilters(baseQuery, filters);

    // Get main SLA statistics
    const statsQuery = baseQuery.clone()
      .select('COUNT(*)', 'totalCalls')
      .addSelect(
        'COUNT(CASE WHEN cs.slaViolated = false THEN 1 END)',
        'slaCompliantCalls'
      )
      .addSelect(
        'COUNT(CASE WHEN cs.slaViolated = true THEN 1 END)',
        'slaViolatedCalls'
      )
      .addSelect('COALESCE(AVG(cs.firstResponseTime), 0)', 'avgFirstResponseTime')
      .addSelect(
        "COUNT(CASE WHEN cs.status = 'ABANDON' THEN 1 END)",
        'abandonedCallsCount'
      )
      .addSelect('COALESCE(AVG(cs.abandonTime), 0)', 'avgAbandonTime');

    const stats = await statsQuery.getRawOne();

    const totalCalls = parseInt(stats.totalCalls, 10);
    const slaCompliantCalls = parseInt(stats.slaCompliantCalls, 10);
    const slaViolatedCalls = parseInt(stats.slaViolatedCalls, 10);
    const abandonedCallsCount = parseInt(stats.abandonedCallsCount, 10);

    // Calculate rates
    const slaComplianceRate = totalCalls > 0
      ? Math.round((slaCompliantCalls / totalCalls) * 10000) / 100
      : 0;

    const abandonRate = totalCalls > 0
      ? Math.round((abandonedCallsCount / totalCalls) * 10000) / 100
      : 0;

    // Get daily trend
    const trendQuery = this.callSummaryRepo.createQueryBuilder('cs')
      .select("DATE(cs.startedAt)", 'date')
      .addSelect('COUNT(*)', 'totalCalls')
      .addSelect(
        'COUNT(CASE WHEN cs.slaViolated = true THEN 1 END)',
        'violatedCalls'
      )
      .groupBy('date')
      .orderBy('date', 'ASC');

    this.applyFilters(trendQuery, filters);
    const trendData = await trendQuery.getRawMany();

    const trend: SlaTrendDto[] = trendData.map((row) => {
      const total = parseInt(row.totalCalls, 10);
      const violated = parseInt(row.violatedCalls, 10);
      const compliant = total - violated;
      return {
        date: row.date,
        totalCalls: total,
        violatedCalls: violated,
        complianceRate: total > 0 ? Math.round((compliant / total) * 10000) / 100 : 0,
      };
    });

    // Get SLA by queue
    const queueQuery = this.callSummaryRepo.createQueryBuilder('cs')
      .select('cs.queue', 'queue')
      .addSelect('COUNT(*)', 'totalCalls')
      .addSelect(
        'COUNT(CASE WHEN cs.slaViolated = false THEN 1 END)',
        'compliantCalls'
      )
      .addSelect(
        'COUNT(CASE WHEN cs.slaViolated = true THEN 1 END)',
        'violatedCalls'
      )
      .addSelect('COALESCE(AVG(cs.waitTime), 0)', 'avgWaitTime')
      .where('cs.queue IS NOT NULL')
      .groupBy('cs.queue')
      .orderBy('"totalCalls"', 'DESC');

    this.applyFilters(queueQuery, filters);
    const queueData = await queueQuery.getRawMany();

    const byQueue: QueueSlaDto[] = queueData.map((row) => {
      const total = parseInt(row.totalCalls, 10);
      const compliant = parseInt(row.compliantCalls, 10);
      return {
        queue: row.queue || 'Unknown',
        totalCalls: total,
        compliantCalls: compliant,
        violatedCalls: parseInt(row.violatedCalls, 10),
        complianceRate: total > 0 ? Math.round((compliant / total) * 10000) / 100 : 0,
        avgWaitTime: Math.round(parseFloat(row.avgWaitTime)),
      };
    });

    return {
      totalCalls,
      slaCompliantCalls,
      slaViolatedCalls,
      slaComplianceRate,
      avgFirstResponseTime: Math.round(parseFloat(stats.avgFirstResponseTime)),
      abandonedCallsCount,
      abandonRate,
      avgAbandonTime: Math.round(parseFloat(stats.avgAbandonTime)),
      trend,
      byQueue,
    };
    } catch (error) {
      console.error('Error fetching SLA metrics:', error);
      return {
        totalCalls: 0,
        slaCompliantCalls: 0,
        slaViolatedCalls: 0,
        slaComplianceRate: 0,
        avgFirstResponseTime: 0,
        abandonedCallsCount: 0,
        abandonRate: 0,
        avgAbandonTime: 0,
        trend: [],
        byQueue: [],
      };
    }
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

    if (filters.statuses && filters.statuses.length > 0) {
      query.andWhere('cs.status IN (:...statuses)', {
        statuses: filters.statuses,
      });
    }

    if (filters.minDuration !== undefined) {
      query.andWhere('cs.duration >= :minDuration', {
        minDuration: filters.minDuration,
      });
    }

    if (filters.maxDuration !== undefined) {
      query.andWhere('cs.duration <= :maxDuration', {
        maxDuration: filters.maxDuration,
      });
    }
  }
}
