import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSummary } from '../../calls/entities/call-summary.entity';
import { CallFiltersDto } from '../dto';
import { AgentPerformanceDto, AgentPerformanceResponseDto } from '../dto/agent-performance.dto';

@Injectable()
export class AgentPerformanceService {
  constructor(
    @InjectRepository(CallSummary)
    private readonly callSummaryRepo: Repository<CallSummary>,
  ) {}

  async getAgentPerformance(
    filters: CallFiltersDto
  ): Promise<AgentPerformanceResponseDto> {
    const query = this.callSummaryRepo
      .createQueryBuilder('cs')
      .select('cs.agent', 'agent')
      .addSelect('COUNT(*)', 'totalCalls')
      .addSelect(
        "COUNT(CASE WHEN cs.status = 'ANSWERED' THEN 1 END)",
        'answeredCalls'
      )
      .addSelect(
        "COUNT(CASE WHEN cs.status != 'ANSWERED' THEN 1 END)",
        'missedCalls'
      )
      .addSelect('COALESCE(AVG(cs.talkTime), 0)', 'avgTalkTime')
      .addSelect('COALESCE(AVG(cs.waitTime), 0)', 'avgWaitTime')
      .addSelect('COALESCE(SUM(cs.talkTime), 0)', 'totalTalkTime')
      .where('cs.agent IS NOT NULL')
      .groupBy('cs.agent')
      .orderBy('"totalCalls"', 'DESC');

    // Apply filters
    this.applyFilters(query, filters);

    try {
      const results = await query.getRawMany();

      const data: AgentPerformanceDto[] = results.map((row) => ({
        agent: row.agent,
        totalCalls: parseInt(row.totalCalls, 10) || 0,
        answeredCalls: parseInt(row.answeredCalls, 10) || 0,
        missedCalls: parseInt(row.missedCalls, 10) || 0,
        avgTalkTime: Math.round(parseFloat(row.avgTalkTime) || 0),
        avgWaitTime: Math.round(parseFloat(row.avgWaitTime) || 0),
        totalTalkTime: parseInt(row.totalTalkTime, 10) || 0,
      }));

      return {
        data,
        total: data.length,
      };
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      return {
        data: [],
        total: 0,
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
