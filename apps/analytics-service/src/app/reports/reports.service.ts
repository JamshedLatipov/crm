import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface ReportConfig {
  type: 'sales' | 'leads' | 'calls' | 'performance' | 'custom';
  fromDate: Date;
  toDate: Date;
  groupBy?: 'day' | 'week' | 'month';
  filters?: Record<string, unknown>;
  format?: 'json' | 'csv' | 'excel';
}

export interface ReportResult {
  title: string;
  generatedAt: string;
  period: { from: string; to: string };
  data: Record<string, unknown>[];
  summary: Record<string, number>;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async generateSalesReport(config: ReportConfig): Promise<ReportResult> {
    const { fromDate, toDate, groupBy = 'day' } = config;

    const groupByFormat = this.getGroupByFormat(groupBy);
    
    const data = await this.dataSource.query(`
      SELECT 
        ${groupByFormat} as period,
        COUNT(*) FILTER (WHERE status = 'won') as deals_won,
        COUNT(*) FILTER (WHERE status = 'lost') as deals_lost,
        COALESCE(SUM(amount) FILTER (WHERE status = 'won'), 0) as revenue,
        COALESCE(AVG(amount) FILTER (WHERE status = 'won'), 0) as avg_deal_size,
        COUNT(*) as total_deals
      FROM deals
      WHERE "createdAt" BETWEEN $1 AND $2
      GROUP BY ${groupByFormat}
      ORDER BY period
    `, [fromDate, toDate]);

    const summary = await this.dataSource.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'won') as total_won,
        COUNT(*) FILTER (WHERE status = 'lost') as total_lost,
        COALESCE(SUM(amount) FILTER (WHERE status = 'won'), 0) as total_revenue,
        COALESCE(AVG(amount) FILTER (WHERE status = 'won'), 0) as avg_deal_size
      FROM deals
      WHERE "createdAt" BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    return {
      title: 'Sales Report',
      generatedAt: new Date().toISOString(),
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      data: data.map((d: Record<string, unknown>) => ({
        period: d.period,
        dealsWon: parseInt(d.deals_won as string) || 0,
        dealsLost: parseInt(d.deals_lost as string) || 0,
        revenue: parseFloat(d.revenue as string) || 0,
        avgDealSize: parseFloat(d.avg_deal_size as string) || 0,
        totalDeals: parseInt(d.total_deals as string) || 0,
      })),
      summary: {
        totalWon: parseInt(summary[0].total_won) || 0,
        totalLost: parseInt(summary[0].total_lost) || 0,
        totalRevenue: parseFloat(summary[0].total_revenue) || 0,
        avgDealSize: parseFloat(summary[0].avg_deal_size) || 0,
      },
    };
  }

  async generateLeadsReport(config: ReportConfig): Promise<ReportResult> {
    const { fromDate, toDate, groupBy = 'day' } = config;
    const groupByFormat = this.getGroupByFormat(groupBy);

    const data = await this.dataSource.query(`
      SELECT 
        ${groupByFormat} as period,
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE status = 'qualified') as qualified,
        COUNT(*) FILTER (WHERE status = 'converted') as converted,
        COUNT(*) FILTER (WHERE status = 'disqualified') as disqualified
      FROM leads
      WHERE "createdAt" BETWEEN $1 AND $2
      GROUP BY ${groupByFormat}
      ORDER BY period
    `, [fromDate, toDate]);

    const summary = await this.dataSource.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'qualified') as qualified,
        COUNT(*) FILTER (WHERE status = 'converted') as converted,
        ROUND(COUNT(*) FILTER (WHERE status = 'converted')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as conversion_rate
      FROM leads
      WHERE "createdAt" BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    return {
      title: 'Leads Report',
      generatedAt: new Date().toISOString(),
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      data: data.map((d: Record<string, unknown>) => ({
        period: d.period,
        totalLeads: parseInt(d.total_leads as string) || 0,
        qualified: parseInt(d.qualified as string) || 0,
        converted: parseInt(d.converted as string) || 0,
        disqualified: parseInt(d.disqualified as string) || 0,
      })),
      summary: {
        total: parseInt(summary[0].total) || 0,
        qualified: parseInt(summary[0].qualified) || 0,
        converted: parseInt(summary[0].converted) || 0,
        conversionRate: parseFloat(summary[0].conversion_rate) || 0,
      },
    };
  }

  async generateCallsReport(config: ReportConfig): Promise<ReportResult> {
    const { fromDate, toDate, groupBy = 'day' } = config;
    const groupByFormat = this.getGroupByFormat(groupBy);

    const data = await this.dataSource.query(`
      SELECT 
        ${groupByFormat} as period,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE disposition = 'ANSWERED') as answered,
        COUNT(*) FILTER (WHERE disposition IN ('NO ANSWER', 'BUSY')) as missed,
        COALESCE(AVG(duration), 0) as avg_duration,
        COALESCE(SUM(duration), 0) as total_duration
      FROM call_logs
      WHERE "createdAt" BETWEEN $1 AND $2
      GROUP BY ${groupByFormat}
      ORDER BY period
    `, [fromDate, toDate]);

    const summary = await this.dataSource.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE disposition = 'ANSWERED') as answered,
        COUNT(*) FILTER (WHERE disposition IN ('NO ANSWER', 'BUSY')) as missed,
        COALESCE(AVG(duration), 0) as avg_duration,
        COALESCE(SUM(duration), 0) as total_duration
      FROM call_logs
      WHERE "createdAt" BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    return {
      title: 'Calls Report',
      generatedAt: new Date().toISOString(),
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      data: data.map((d: Record<string, unknown>) => ({
        period: d.period,
        totalCalls: parseInt(d.total_calls as string) || 0,
        answered: parseInt(d.answered as string) || 0,
        missed: parseInt(d.missed as string) || 0,
        avgDuration: Math.round(parseFloat(d.avg_duration as string) || 0),
        totalDuration: parseInt(d.total_duration as string) || 0,
      })),
      summary: {
        total: parseInt(summary[0].total) || 0,
        answered: parseInt(summary[0].answered) || 0,
        missed: parseInt(summary[0].missed) || 0,
        avgDuration: Math.round(parseFloat(summary[0].avg_duration) || 0),
        totalDuration: parseInt(summary[0].total_duration) || 0,
      },
    };
  }

  async generatePerformanceReport(config: ReportConfig): Promise<ReportResult> {
    const { fromDate, toDate } = config;

    const data = await this.dataSource.query(`
      SELECT 
        u.id as user_id,
        u.username,
        COUNT(DISTINCT l.id) as leads_handled,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'won') as deals_won,
        COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'won'), 0) as revenue,
        COUNT(DISTINCT c.id) as calls_made,
        COALESCE(SUM(c.duration), 0) as call_duration
      FROM users u
      LEFT JOIN assignments a ON u.id = a."userId"
      LEFT JOIN leads l ON a."leadId" = l.id AND l."createdAt" BETWEEN $1 AND $2
      LEFT JOIN deals d ON a."dealId" = d.id AND d."createdAt" BETWEEN $1 AND $2
      LEFT JOIN call_logs c ON u.id::text = c."createdBy" AND c."createdAt" BETWEEN $1 AND $2
      WHERE u.role IN ('manager', 'admin')
      GROUP BY u.id, u.username
      ORDER BY revenue DESC
    `, [fromDate, toDate]);

    const totals = data.reduce((acc: Record<string, number>, d: Record<string, unknown>) => {
      acc.totalRevenue = (acc.totalRevenue || 0) + (parseFloat(d.revenue as string) || 0);
      acc.totalDeals = (acc.totalDeals || 0) + (parseInt(d.deals_won as string) || 0);
      acc.totalCalls = (acc.totalCalls || 0) + (parseInt(d.calls_made as string) || 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      title: 'Team Performance Report',
      generatedAt: new Date().toISOString(),
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      data: data.map((d: Record<string, unknown>) => ({
        userId: d.user_id,
        username: d.username,
        leadsHandled: parseInt(d.leads_handled as string) || 0,
        dealsWon: parseInt(d.deals_won as string) || 0,
        revenue: parseFloat(d.revenue as string) || 0,
        callsMade: parseInt(d.calls_made as string) || 0,
        callDuration: parseInt(d.call_duration as string) || 0,
      })),
      summary: {
        totalRevenue: totals.totalRevenue || 0,
        totalDeals: totals.totalDeals || 0,
        totalCalls: totals.totalCalls || 0,
        teamSize: data.length,
      },
    };
  }

  async exportToCsv(report: ReportResult): Promise<string> {
    if (report.data.length === 0) return '';
    
    const firstRow = report.data[0];
    if (!firstRow) return '';
    
    const headers = Object.keys(firstRow);
    const rows = report.data.map(row => 
      headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  private getGroupByFormat(groupBy: string): string {
    switch (groupBy) {
      case 'week':
        return 'DATE_TRUNC(\'week\', "createdAt")';
      case 'month':
        return 'DATE_TRUNC(\'month\', "createdAt")';
      default:
        return 'DATE("createdAt")';
    }
  }
}
