import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Lead, LeadStatus } from '../leads/lead.entity';
import { Deal, DealStatus } from '../deals/deal.entity';
import { Task } from '../tasks/task.entity';
import { PipelineStage } from '../pipeline/pipeline.entity';
import { Contact } from '../contacts/contact.entity';
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
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
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

  // Contacts report with custom fields grouping
  async contactsReport(groupByField?: string) {
    const contacts = await this.contactRepo.find({
      where: { isActive: true }
    });

    const totalContacts = contacts.length;

    // Group by custom field if specified
    let groupedData: Record<string, number> = {};
    
    if (groupByField) {
      contacts.forEach(contact => {
        const customFields = contact.customFields as Record<string, any> || {};
        const value = customFields[groupByField];
        const key = value !== undefined && value !== null ? String(value) : 'Не указано';
        groupedData[key] = (groupedData[key] || 0) + 1;
      });
    }

    // Basic statistics
    const activeCount = contacts.filter(c => c.isActive).length;
    const withEmailCount = contacts.filter(c => c.email).length;
    const withPhoneCount = contacts.filter(c => c.phone || c.mobilePhone).length;

    // Group by type
    const byType: Record<string, number> = {};
    contacts.forEach(c => {
      const type = c.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Recent contacts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = contacts.filter(c => 
      c.createdAt && new Date(c.createdAt) > thirtyDaysAgo
    ).length;

    return {
      totalContacts,
      activeCount,
      recentCount,
      withEmailCount,
      withPhoneCount,
      byType,
      ...(groupByField ? { groupedBy: groupByField, groupedData } : {})
    };
  }

  // Contacts distribution by custom field value
  async contactsCustomFieldDistribution(fieldName: string) {
    const contacts = await this.contactRepo.find({
      select: ['id', 'customFields'] as any
    });

    const distribution: Record<string, number> = {};
    let withValueCount = 0;

    contacts.forEach(contact => {
      const customFields = contact.customFields as Record<string, any> || {};
      const value = customFields[fieldName];
      
      if (value !== undefined && value !== null) {
        withValueCount++;
        // Handle arrays (multiselect)
        if (Array.isArray(value)) {
          value.forEach(v => {
            const key = String(v);
            distribution[key] = (distribution[key] || 0) + 1;
          });
        } else {
          const key = String(value);
          distribution[key] = (distribution[key] || 0) + 1;
        }
      } else {
        distribution['Не заполнено'] = (distribution['Не заполнено'] || 0) + 1;
      }
    });

    // Sort by count descending
    const sortedDistribution = Object.entries(distribution)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, number>);

    return {
      fieldName,
      totalContacts: contacts.length,
      withValueCount,
      fillRate: contacts.length > 0 ? Math.round((withValueCount / contacts.length) * 10000) / 100 : 0,
      distribution: sortedDistribution
    };
  }}