import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSummary } from '../../calls/entities/call-summary.entity';
import { CallFiltersDto } from '../dto';
import { CallsOverviewDto, CallsByTimeDto, StatusDistributionDto } from '../dto/calls-overview.dto';

@Injectable()
export class CallsOverviewService {
  constructor(
    @InjectRepository(CallSummary)
    private readonly callSummaryRepo: Repository<CallSummary>,
  ) {}

  async getCallsOverview(filters: CallFiltersDto): Promise<CallsOverviewDto> {
    try {
      const baseQuery = this.callSummaryRepo.createQueryBuilder('cs');
      this.applyFilters(baseQuery, filters);

      // Get main statistics
      const statsQuery = baseQuery.clone()
      .select('COUNT(*)', 'totalCalls')
      .addSelect(
        "COUNT(CASE WHEN cs.direction = 'inbound' THEN 1 END)",
        'inboundCalls'
      )
      .addSelect(
        "COUNT(CASE WHEN cs.direction = 'outbound' THEN 1 END)",
        'outboundCalls'
      )
      .addSelect(
        "COUNT(CASE WHEN cs.direction = 'internal' THEN 1 END)",
        'internalCalls'
      )
      .addSelect(
        "COUNT(CASE WHEN cs.status = 'ANSWERED' THEN 1 END)",
        'answeredCalls'
      )
      .addSelect(
        "COUNT(CASE WHEN cs.status = 'NO ANSWER' OR cs.status = 'BUSY' THEN 1 END)",
        'missedCalls'
      )
      .addSelect(
        "COUNT(CASE WHEN cs.status = 'ABANDON' THEN 1 END)",
        'abandonedCalls'
      )
      .addSelect('COALESCE(AVG(cs.duration), 0)', 'avgDuration')
      .addSelect('COALESCE(AVG(cs.waitTime), 0)', 'avgWaitTime');

    const stats = await statsQuery.getRawOne();

    // Get calls by hour
    const callsByHourQuery = this.callSummaryRepo
      .createQueryBuilder('cs')
      .select("EXTRACT(HOUR FROM cs.startedAt)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .groupBy('hour')
      .orderBy('hour', 'ASC');
    
    this.applyFilters(callsByHourQuery, filters);
    const hourlyData = await callsByHourQuery.getRawMany();

    const callsByHour: CallsByTimeDto[] = hourlyData.map((row) => ({
      period: parseInt(row.hour, 10),
      count: parseInt(row.count, 10),
    }));

    // Get calls by day
    const callsByDayQuery = this.callSummaryRepo
      .createQueryBuilder('cs')
      .select("DATE(cs.startedAt)", 'day')
      .addSelect('COUNT(*)', 'count')
      .groupBy('day')
      .orderBy('day', 'ASC');
    
    this.applyFilters(callsByDayQuery, filters);
    const dailyData = await callsByDayQuery.getRawMany();

    const callsByDay: CallsByTimeDto[] = dailyData.map((row) => ({
      period: row.day,
      count: parseInt(row.count, 10),
    }));

    // Get status distribution
    const statusQuery = this.callSummaryRepo
      .createQueryBuilder('cs')
      .select('cs.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('cs.status')
      .orderBy('"count"', 'DESC');
    
    this.applyFilters(statusQuery, filters);
    const statusData = await statusQuery.getRawMany();

    const totalCalls = parseInt(stats.totalCalls, 10);
    const statusDistribution: StatusDistributionDto[] = statusData.map((row) => {
      const count = parseInt(row.count, 10);
      return {
        status: row.status || 'UNKNOWN',
        count,
        percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 10000) / 100 : 0,
      };
    });

    return {
      totalCalls,
      inboundCalls: parseInt(stats.inboundCalls, 10),
      outboundCalls: parseInt(stats.outboundCalls, 10),
      internalCalls: parseInt(stats.internalCalls, 10),
      answeredCalls: parseInt(stats.answeredCalls, 10),
      missedCalls: parseInt(stats.missedCalls, 10),
      abandonedCalls: parseInt(stats.abandonedCalls, 10),
      avgDuration: Math.round(parseFloat(stats.avgDuration)),
      avgWaitTime: Math.round(parseFloat(stats.avgWaitTime)),
      callsByHour,
      callsByDay,
      statusDistribution,
    };
    } catch (error) {
      console.error('Error fetching calls overview:', error);
      return {
        totalCalls: 0,
        inboundCalls: 0,
        outboundCalls: 0,
        internalCalls: 0,
        answeredCalls: 0,
        missedCalls: 0,
        abandonedCalls: 0,
        avgDuration: 0,
        avgWaitTime: 0,
        callsByHour: [],
        callsByDay: [],
        statusDistribution: [],
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
