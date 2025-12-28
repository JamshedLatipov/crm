import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSummary } from '../../calls/entities/call-summary.entity';
import { IvrLog } from '../../ivr/entities/ivr-log.entity';
import { CallFiltersDto } from '../dto';
import {
  IvrAnalysisDto,
  IvrPathDto,
  IvrNodeDto,
  IvrDtmfDto,
  IvrEventStatsDto,
} from '../dto/ivr-analysis.dto';

@Injectable()
export class IvrAnalysisService {
  constructor(
    @InjectRepository(CallSummary)
    private readonly callSummaryRepo: Repository<CallSummary>,
    @InjectRepository(IvrLog)
    private readonly ivrLogRepo: Repository<IvrLog>,
  ) {}

  async getIvrAnalysis(filters: CallFiltersDto): Promise<IvrAnalysisDto> {
    try {
      // Overall IVR statistics
      const overallQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('COUNT(*)', 'totalSessions')
        .addSelect(
          "COUNT(CASE WHEN cs.status = 'ANSWERED' THEN 1 END)",
          'completedSessions'
        )
        .where('cs.ivrPath IS NOT NULL');

      this.applyCallSummaryFilters(overallQuery, filters);
      const overallData = await overallQuery.getRawOne();

      const totalSessions = parseInt(overallData.totalSessions, 10) || 0;
      const completedSessions = parseInt(overallData.completedSessions, 10) || 0;
      const completionRate = totalSessions > 0 
        ? Math.round((completedSessions / totalSessions) * 10000) / 100 
        : 0;

      // Popular paths
      const pathsQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('cs.ivrPath', 'path')
        .addSelect('COUNT(*)', 'callCount')
        .addSelect('COALESCE(AVG(cs.waitTime), 0)', 'avgTimeInIvr')
        .addSelect(
          "COUNT(CASE WHEN cs.status = 'ANSWERED' THEN 1 END)",
          'completedCount'
        )
        .where('cs.ivrPath IS NOT NULL')
        .groupBy('cs.ivrPath')
        .orderBy('"callCount"', 'DESC')
        .limit(10);

      this.applyCallSummaryFilters(pathsQuery, filters);
      const pathsData = await pathsQuery.getRawMany();

      const paths: IvrPathDto[] = pathsData.map((row) => {
        const callCount = parseInt(row.callCount, 10) || 0;
        const completedCount = parseInt(row.completedCount, 10) || 0;
        return {
          path: row.path || 'Unknown',
          callCount,
          percentage: totalSessions > 0 ? Math.round((callCount / totalSessions) * 10000) / 100 : 0,
          avgTimeInIvr: Math.round(parseFloat(row.avgTimeInIvr) || 0),
          completionRate: callCount > 0 ? Math.round((completedCount / callCount) * 10000) / 100 : 0,
        };
      });

      // Average IVR duration
      const avgDurationQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('COALESCE(AVG(cs.waitTime), 0)', 'avgDuration')
        .where('cs.ivrPath IS NOT NULL');

      this.applyCallSummaryFilters(avgDurationQuery, filters);
      const avgDurationData = await avgDurationQuery.getRawOne();
      const avgIvrDuration = Math.round(parseFloat(avgDurationData.avgDuration) || 0);

      // Node statistics
      const nodesQuery = this.ivrLogRepo
        .createQueryBuilder('ivr')
        .select('ivr.nodeName', 'nodeName')
        .addSelect('COUNT(*)', 'visits')
        .addSelect(
          "COUNT(CASE WHEN ivr.event = 'CALL_END' THEN 1 END)",
          'exitCount'
        )
        .where('ivr.nodeName IS NOT NULL')
        .groupBy('ivr.nodeName')
        .orderBy('"visits"', 'DESC')
        .limit(15);

      this.applyIvrLogFilters(nodesQuery, filters);
      const nodesData = await nodesQuery.getRawMany();

      const nodes: IvrNodeDto[] = nodesData.map((row) => {
        const visits = parseInt(row.visits, 10) || 0;
        const exitCount = parseInt(row.exitCount, 10) || 0;
        return {
          nodeName: row.nodeName || 'Unknown',
          visits,
          avgTimeSpent: 0, // Can be calculated if we have timing data
          exitCount,
          exitRate: visits > 0 ? Math.round((exitCount / visits) * 10000) / 100 : 0,
        };
      });

      // DTMF selections
      const dtmfQuery = this.ivrLogRepo
        .createQueryBuilder('ivr')
        .select('ivr.digit', 'digit')
        .addSelect('ivr.nodeName', 'nodeName')
        .addSelect('COUNT(*)', 'count')
        .where("ivr.event = 'DTMF'")
        .andWhere('ivr.digit IS NOT NULL')
        .groupBy('ivr.digit, ivr.nodeName')
        .orderBy('"count"', 'DESC')
        .limit(20);

      this.applyIvrLogFilters(dtmfQuery, filters);
      const dtmfData = await dtmfQuery.getRawMany();

      const totalDtmf = dtmfData.reduce((sum, row) => sum + (parseInt(row.count, 10) || 0), 0);

      const dtmfSelections: IvrDtmfDto[] = dtmfData.map((row) => {
        const count = parseInt(row.count, 10) || 0;
        return {
          digit: row.digit,
          count,
          percentage: totalDtmf > 0 ? Math.round((count / totalDtmf) * 10000) / 100 : 0,
          nodeName: row.nodeName || 'Unknown',
        };
      });

      // Event statistics
      const eventStatsQuery = this.ivrLogRepo
        .createQueryBuilder('ivr')
        .select('ivr.event', 'event')
        .addSelect('COUNT(*)', 'count')
        .groupBy('ivr.event')
        .orderBy('"count"', 'DESC');

      this.applyIvrLogFilters(eventStatsQuery, filters);
      const eventStatsData = await eventStatsQuery.getRawMany();

      const eventStats: IvrEventStatsDto[] = eventStatsData.map((row) => ({
        event: row.event,
        count: parseInt(row.count, 10) || 0,
      }));

      return {
        totalSessions,
        completedSessions,
        completionRate,
        avgIvrDuration,
        paths,
        nodes,
        dtmfSelections,
        eventStats,
      };
    } catch (error) {
      console.error('Error fetching IVR analysis:', error);
      return {
        totalSessions: 0,
        completedSessions: 0,
        completionRate: 0,
        avgIvrDuration: 0,
        paths: [],
        nodes: [],
        dtmfSelections: [],
        eventStats: [],
      };
    }
  }

  private applyCallSummaryFilters(query: any, filters: CallFiltersDto): void {
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

    if (filters.queues && filters.queues.length > 0) {
      query.andWhere('cs.queue IN (:...queues)', { queues: filters.queues });
    }

    if (filters.directions && filters.directions.length > 0) {
      query.andWhere('cs.direction IN (:...directions)', {
        directions: filters.directions,
      });
    }
  }

  private applyIvrLogFilters(query: any, filters: CallFiltersDto): void {
    if (filters.startDate) {
      query.andWhere('ivr.createdAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters.endDate) {
      query.andWhere('ivr.createdAt <= :endDate', {
        endDate: new Date(filters.endDate),
      });
    }
  }
}
