import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSummary } from '../../calls/entities/call-summary.entity';
import { CallFiltersDto } from '../dto';
import {
  QueuePerformanceDto,
  QueueStatsDto,
  QueueAgentDto,
  QueueHourlyStatsDto,
} from '../dto/queue-performance.dto';

@Injectable()
export class QueuePerformanceService {
  constructor(
    @InjectRepository(CallSummary)
    private readonly callSummaryRepo: Repository<CallSummary>,
  ) {}

  async getQueuePerformance(filters: CallFiltersDto): Promise<QueuePerformanceDto> {
    try {
      // Overall statistics by queue
      const queueStatsQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('cs.queue', 'queue')
        .addSelect('COUNT(*)', 'totalCalls')
        .addSelect(
          "COUNT(CASE WHEN cs.status = 'ANSWERED' THEN 1 END)",
          'answeredCalls'
        )
        .addSelect(
          "COUNT(CASE WHEN (cs.status = 'ABANDON' OR (cs.status = 'NO ANSWER' AND cs.abandonTime IS NOT NULL AND cs.abandonTime > 0)) THEN 1 END)",
          'abandonedCalls'
        )
        .addSelect('COALESCE(AVG(cs.waitTime), 0)', 'avgWaitTime')
        .addSelect('COALESCE(MAX(cs.waitTime), 0)', 'maxWaitTime')
        .addSelect('COALESCE(AVG(cs.talkTime), 0)', 'avgTalkTime')
        .addSelect(
          'COUNT(CASE WHEN cs.slaViolated = false THEN 1 END)',
          'slCompliantCalls'
        )
        .where('cs.queue IS NOT NULL')
        .groupBy('cs.queue')
        .orderBy('"totalCalls"', 'DESC');

      this.applyFilters(queueStatsQuery, filters);
      const queueStatsData = await queueStatsQuery.getRawMany();

      const queueStats: QueueStatsDto[] = queueStatsData.map((row) => {
        const total = parseInt(row.totalCalls, 10) || 0;
        const answered = parseInt(row.answeredCalls, 10) || 0;
        const slCompliant = parseInt(row.slCompliantCalls, 10) || 0;

        return {
          queue: row.queue || 'Unknown',
          totalCalls: total,
          answeredCalls: answered,
          abandonedCalls: parseInt(row.abandonedCalls, 10) || 0,
          answerRate: total > 0 ? Math.round((answered / total) * 10000) / 100 : 0,
          avgWaitTime: Math.round(parseFloat(row.avgWaitTime) || 0),
          maxWaitTime: Math.round(parseFloat(row.maxWaitTime) || 0),
          avgTalkTime: Math.round(parseFloat(row.avgTalkTime) || 0),
          serviceLevelCompliance: total > 0 ? Math.round((slCompliant / total) * 10000) / 100 : 0,
        };
      });

      // Top agents per queue
      const topAgentsQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('cs.queue', 'queue')
        .addSelect('cs.agent', 'agent')
        .addSelect('COUNT(*)', 'callsHandled')
        .addSelect('COALESCE(AVG(cs.talkTime + cs.waitTime), 0)', 'avgHandleTime')
        .where('cs.queue IS NOT NULL')
        .andWhere('cs.agent IS NOT NULL')
        .andWhere("cs.status = 'ANSWERED'")
        .groupBy('cs.queue, cs.agent')
        .orderBy('cs.queue, "callsHandled"', 'DESC')
        .limit(50);

      this.applyFilters(topAgentsQuery, filters);
      const topAgentsData = await topAgentsQuery.getRawMany();

      const topAgents: QueueAgentDto[] = topAgentsData.map((row) => ({
        queue: row.queue || 'Unknown',
        agent: row.agent || 'Unknown',
        callsHandled: parseInt(row.callsHandled, 10) || 0,
        avgHandleTime: Math.round(parseFloat(row.avgHandleTime) || 0),
      }));

      // Hourly distribution
      const hourlyQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('EXTRACT(HOUR FROM cs.startedAt)', 'hour')
        .addSelect('COUNT(*)', 'totalCalls')
        .addSelect(
          "COUNT(CASE WHEN cs.status = 'ANSWERED' THEN 1 END)",
          'answeredCalls'
        )
        .addSelect('COALESCE(AVG(cs.waitTime), 0)', 'avgWaitTime')
        .where('cs.queue IS NOT NULL')
        .groupBy('hour')
        .orderBy('hour', 'ASC');

      this.applyFilters(hourlyQuery, filters);
      const hourlyData = await hourlyQuery.getRawMany();

      const hourlyStats: QueueHourlyStatsDto[] = hourlyData.map((row) => ({
        hour: parseInt(row.hour, 10),
        totalCalls: parseInt(row.totalCalls, 10) || 0,
        answeredCalls: parseInt(row.answeredCalls, 10) || 0,
        avgWaitTime: Math.round(parseFloat(row.avgWaitTime) || 0),
      }));

      // Overall statistics
      const overallQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('COUNT(*)', 'totalCalls')
        .addSelect(
          "COUNT(CASE WHEN cs.status = 'ANSWERED' THEN 1 END)",
          'answeredCalls'
        )
        .addSelect('COALESCE(AVG(cs.waitTime), 0)', 'avgWaitTime')
        .where('cs.queue IS NOT NULL');

      this.applyFilters(overallQuery, filters);
      const overallData = await overallQuery.getRawOne();

      const totalCalls = parseInt(overallData.totalCalls, 10) || 0;
      const answeredCalls = parseInt(overallData.answeredCalls, 10) || 0;

      return {
        queueStats,
        topAgents,
        hourlyStats,
        totalCalls,
        overallAnswerRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 10000) / 100 : 0,
        overallAvgWaitTime: Math.round(parseFloat(overallData.avgWaitTime) || 0),
      };
    } catch (error) {
      console.error('Error fetching queue performance:', error);
      return {
        queueStats: [],
        topAgents: [],
        hourlyStats: [],
        totalCalls: 0,
        overallAnswerRate: 0,
        overallAvgWaitTime: 0,
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
  }
}
