import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSummary } from '../../calls/entities/call-summary.entity';
import { Lead } from '../../leads/lead.entity';
import { Deal } from '../../deals/deal.entity';
import { CallFiltersDto } from '../dto';
import {
  CallConversionDto,
  ConversionByAgentDto,
  ConversionTrendDto,
  DealStageDto,
} from '../dto/call-conversion.dto';

@Injectable()
export class CallConversionService {
  constructor(
    @InjectRepository(CallSummary)
    private readonly callSummaryRepo: Repository<CallSummary>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
  ) {}

  async getCallConversion(filters: CallFiltersDto): Promise<CallConversionDto> {
    try {
      // Overall statistics
      const overallQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('COUNT(*)', 'totalCalls')
        .addSelect('COUNT(DISTINCT cs.leadId)', 'callsWithLeads')
        .addSelect('COUNT(DISTINCT cs.dealId)', 'callsWithDeals');

      this.applyFilters(overallQuery, filters);
      const overallData = await overallQuery.getRawOne();

      const totalCalls = parseInt(overallData.totalCalls, 10) || 0;
      const callsWithLeads = parseInt(overallData.callsWithLeads, 10) || 0;
      const callsWithDeals = parseInt(overallData.callsWithDeals, 10) || 0;

      const leadConversionRate = totalCalls > 0 
        ? Math.round((callsWithLeads / totalCalls) * 10000) / 100 
        : 0;
      const dealConversionRate = totalCalls > 0 
        ? Math.round((callsWithDeals / totalCalls) * 10000) / 100 
        : 0;

      // Revenue calculation
      const revenueQuery = this.dealRepo
        .createQueryBuilder('d')
        .select('COALESCE(SUM(d.amount), 0)', 'totalRevenue')
        .addSelect('COALESCE(AVG(d.amount), 0)', 'avgDealSize')
        .addSelect('COUNT(*)', 'totalDeals')
        .innerJoin(CallSummary, 'cs', 'cs.dealId = d.id');

      this.applyDealFilters(revenueQuery, filters);
      const revenueData = await revenueQuery.getRawOne();

      const totalRevenue = parseFloat(revenueData.totalRevenue) || 0;
      const avgDealSize = parseFloat(revenueData.avgDealSize) || 0;
      const revenuePerCall = totalCalls > 0 ? Math.round(totalRevenue / totalCalls) : 0;

      // Conversion by agent
      const agentQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('cs.agent', 'agent')
        .addSelect('COUNT(*)', 'totalCalls')
        .addSelect('COUNT(DISTINCT cs.leadId)', 'callsWithLeads')
        .addSelect('COUNT(DISTINCT cs.dealId)', 'callsWithDeals')
        .where('cs.agent IS NOT NULL')
        .groupBy('cs.agent')
        .orderBy('"totalCalls"', 'DESC')
        .limit(15);

      this.applyFilters(agentQuery, filters);
      const agentData = await agentQuery.getRawMany();

      const byAgent: ConversionByAgentDto[] = await Promise.all(
        agentData.map(async (row) => {
          const total = parseInt(row.totalCalls, 10) || 0;
          const leads = parseInt(row.callsWithLeads, 10) || 0;
          const deals = parseInt(row.callsWithDeals, 10) || 0;

          // Get agent revenue
          const agentRevenueQuery = this.dealRepo
            .createQueryBuilder('d')
            .select('COALESCE(SUM(d.amount), 0)', 'revenue')
            .innerJoin(CallSummary, 'cs', 'cs.dealId = d.id')
            .where('cs.agent = :agent', { agent: row.agent });

          this.applyDealFilters(agentRevenueQuery, filters);
          const agentRevenue = await agentRevenueQuery.getRawOne();

          const revenue = parseFloat(agentRevenue.revenue) || 0;

          return {
            agent: row.agent || 'Unknown',
            totalCalls: total,
            callsWithLeads: leads,
            callsWithDeals: deals,
            leadConversionRate: total > 0 ? Math.round((leads / total) * 10000) / 100 : 0,
            dealConversionRate: total > 0 ? Math.round((deals / total) * 10000) / 100 : 0,
            avgDealValue: deals > 0 ? Math.round(revenue / deals) : 0,
            totalRevenue: Math.round(revenue),
          };
        })
      );

      // Trend over time
      const trendQuery = this.callSummaryRepo
        .createQueryBuilder('cs')
        .select('DATE(cs.startedAt)', 'date')
        .addSelect('COUNT(*)', 'totalCalls')
        .addSelect('COUNT(DISTINCT cs.leadId)', 'leadsCreated')
        .addSelect('COUNT(DISTINCT cs.dealId)', 'dealsCreated')
        .groupBy('date')
        .orderBy('date', 'ASC')
        .limit(30);

      this.applyFilters(trendQuery, filters);
      const trendData = await trendQuery.getRawMany();

      const trend: ConversionTrendDto[] = trendData.map((row) => {
        const total = parseInt(row.totalCalls, 10) || 0;
        const leads = parseInt(row.leadsCreated, 10) || 0;
        const deals = parseInt(row.dealsCreated, 10) || 0;

        return {
          date: row.date,
          totalCalls: total,
          leadsCreated: leads,
          dealsCreated: deals,
          leadConversionRate: total > 0 ? Math.round((leads / total) * 10000) / 100 : 0,
          dealConversionRate: total > 0 ? Math.round((deals / total) * 10000) / 100 : 0,
        };
      });

      // Deal stages distribution
      const stagesQuery = this.dealRepo
        .createQueryBuilder('d')
        .select('d.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(d.amount), 0)', 'totalValue')
        .innerJoin(CallSummary, 'cs', 'cs.dealId = d.id')
        .groupBy('d.status')
        .orderBy('"count"', 'DESC');

      this.applyDealFilters(stagesQuery, filters);
      const stagesData = await stagesQuery.getRawMany();

      const totalDealsCount = stagesData.reduce((sum, row) => sum + (parseInt(row.count, 10) || 0), 0);

      const dealStages: DealStageDto[] = stagesData.map((row) => {
        const count = parseInt(row.count, 10) || 0;
        return {
          status: row.status || 'Unknown',
          count,
          totalValue: Math.round(parseFloat(row.totalValue) || 0),
          percentage: totalDealsCount > 0 ? Math.round((count / totalDealsCount) * 10000) / 100 : 0,
        };
      });

      return {
        totalCalls,
        callsWithLeads,
        callsWithDeals,
        leadConversionRate,
        dealConversionRate,
        totalRevenue: Math.round(totalRevenue),
        avgDealSize: Math.round(avgDealSize),
        revenuePerCall,
        byAgent,
        trend,
        dealStages,
      };
    } catch (error) {
      console.error('Error fetching call conversion:', error);
      return {
        totalCalls: 0,
        callsWithLeads: 0,
        callsWithDeals: 0,
        leadConversionRate: 0,
        dealConversionRate: 0,
        totalRevenue: 0,
        avgDealSize: 0,
        revenuePerCall: 0,
        byAgent: [],
        trend: [],
        dealStages: [],
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

  private applyDealFilters(query: any, filters: CallFiltersDto): void {
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
  }
}
