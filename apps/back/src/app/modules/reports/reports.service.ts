import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Lead, LeadStatus } from '../leads/lead.entity';
import { Deal, DealStatus } from '../deals/deal.entity';
import { Task } from '../tasks/task.entity';
import { PipelineStage } from '../pipeline/pipeline.entity';
import { AssignmentService } from '../shared/services/assignment.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    @InjectRepository(Deal)
    private dealRepo: Repository<Deal>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(PipelineStage)
    private stageRepo: Repository<PipelineStage>,
    private readonly assignmentService: AssignmentService,
  ) {}

  // 4.1 Leads: new leads count, conversion to deals, sources
  async leadsOverview(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    // Optimized: Count directly in DB
    const newLeadsCount = await this.leadRepo.count({
      where: { createdAt: MoreThan(since) } as any
    });

    // Optimized: Count leads with deals using QueryBuilder (Inner Join)
    const convertedToDeals = await this.leadRepo.createQueryBuilder('lead')
      .innerJoin('lead.deals', 'deal')
      .where('lead.createdAt > :since', { since })
      .getCount();

    // Optimized: Group by source in DB
    const sourcesData = await this.leadRepo.createQueryBuilder('lead')
      .select('lead.source', 'source')
      .addSelect('COUNT(lead.id)', 'count')
      .where('lead.createdAt > :since', { since })
      .groupBy('lead.source')
      .getRawMany();

    const sourcesMap: Record<string, number> = {};
    sourcesData.forEach(item => {
      const s = item.source || 'unknown';
      sourcesMap[String(s)] = Number(item.count);
    });

    return {
      since: since.toISOString(),
      newLeadsCount,
      convertedToDeals,
      conversionRate: newLeadsCount > 0 ? Math.round((convertedToDeals / newLeadsCount) * 10000) / 100 : 0,
      bySource: sourcesMap,
    };
  }

  // 4.2 Funnel: conversion per stage
  async funnelAnalytics() {
    const stages = await this.stageRepo.find({ order: { position: 'ASC' as any } });

    // Optimized: Get counts per stage using Group By
    const dealsCounts = await this.dealRepo.createQueryBuilder('deal')
      .select('deal.stageId', 'stageId')
      .addSelect('COUNT(deal.id)', 'count')
      .groupBy('deal.stageId')
      .getRawMany();

    const countsMap = new Map<string, number>();
    dealsCounts.forEach(d => countsMap.set(String(d.stageId), Number(d.count)));

    const byStage = stages.map((s: any) => {
      const count = countsMap.get(String(s.id)) || 0;
      return {
        id: s.id,
        name: s.name,
        count,
      };
    });

    const conversions = byStage.map((s: any, i: number) => ({
      ...s,
      conversionToNext: i < byStage.length - 1 ? Math.round(((byStage[i + 1].count || 0) / (s.count || 1)) * 10000) / 100 : null,
    }));

    const totalDeals = dealsCounts.reduce((acc, curr) => acc + Number(curr.count), 0);

    return {
      totalDeals,
      byStage: conversions,
    };
  }

  // 4.3 Forecasts: use deals service weighted amounts
  async revenueForecast(period: 'month' | 'quarter' | 'year' = 'month') {
    // replicate logic similar to deals.service.getSalesForecast
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      }
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }

    const deals = await this.dealRepo.createQueryBuilder('deal')
      .where('deal.expectedCloseDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('deal.status = :status', { status: DealStatus.OPEN })
      .getMany();

    const totalAmount = deals.reduce((sum, d) => sum + Number((d as any).amount || 0), 0);
    const weightedAmount = deals.reduce((sum, d) => sum + Number((d as any).amount || 0) * ((d as any).probability || 0) / 100, 0);

    return { period, startDate: startDate.toISOString(), endDate: endDate.toISOString(), totalAmount, weightedAmount, dealsCount: deals.length };
  }

  // 4.4 Tasks: completed tasks count and manager efficiency
  async tasksReport(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const completed = await this.taskRepo.createQueryBuilder('task')
      .where('task.status = :status', { status: 'done' })
      .andWhere('task.updatedAt >= :since', { since })
      .getMany();

    // group by current assignee using centralized assignments table
    const ids = completed.map(t => String((t as any).id));
    const map = await this.assignmentService.getCurrentAssignmentsForEntities('task', ids);

    const byManager: Record<string, number> = {};
    completed.forEach(t => {
      const key = (map && map[String(t.id)]) ? String(map[String(t.id)].userId) : 'unassigned';
      byManager[key] = (byManager[key] || 0) + 1;
    });

    return { since: since.toISOString(), completedCount: completed.length, byManager };
  }
}
