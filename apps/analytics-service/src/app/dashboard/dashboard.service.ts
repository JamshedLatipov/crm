import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnalyticsService } from '../analytics/analytics.service';

export interface DashboardData {
  summary: {
    totalRevenue: number;
    revenueChange: number; // percentage
    totalLeads: number;
    leadsChange: number;
    totalDeals: number;
    dealsChange: number;
    totalCalls: number;
    callsChange: number;
  };
  salesFunnel: {
    stage: string;
    count: number;
    value: number;
  }[];
  revenueChart: {
    period: string;
    revenue: number;
    target: number;
  }[];
  topPerformers: {
    userId: number;
    userName: string;
    revenue: number;
    deals: number;
  }[];
  recentActivity: {
    id: number;
    type: string;
    description: string;
    timestamp: string;
    userId: number;
    userName: string;
  }[];
  alerts: {
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    count?: number;
  }[];
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async getDashboard(userId?: number): Promise<DashboardData> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current period analytics
    const currentSales = await this.analyticsService.getSalesAnalytics(thisMonth, now);
    const currentLeads = await this.analyticsService.getLeadAnalytics(thisMonth, now);
    const currentCalls = await this.analyticsService.getCallAnalytics(thisMonth, now);

    // Get previous period for comparison
    const prevSales = await this.analyticsService.getSalesAnalytics(lastMonth, lastMonthEnd);
    const prevLeads = await this.analyticsService.getLeadAnalytics(lastMonth, lastMonthEnd);
    const prevCalls = await this.analyticsService.getCallAnalytics(lastMonth, lastMonthEnd);

    // Calculate changes
    const revenueChange = this.calculateChange(currentSales.totalRevenue, prevSales.totalRevenue);
    const leadsChange = this.calculateChange(currentLeads.totalLeads, prevLeads.totalLeads);
    const dealsChange = this.calculateChange(currentSales.dealsWon, prevSales.dealsWon);
    const callsChange = this.calculateChange(currentCalls.totalCalls, prevCalls.totalCalls);

    // Top performers
    const topPerformers = await this.getTopPerformers(thisMonth, now);

    // Recent activity
    const recentActivity = await this.getRecentActivity();

    // Alerts
    const alerts = await this.getAlerts();

    return {
      summary: {
        totalRevenue: currentSales.totalRevenue,
        revenueChange,
        totalLeads: currentLeads.totalLeads,
        leadsChange,
        totalDeals: currentSales.dealsWon,
        dealsChange,
        totalCalls: currentCalls.totalCalls,
        callsChange,
      },
      salesFunnel: currentSales.dealsByStage,
      revenueChart: currentSales.revenueByPeriod.map(r => ({
        ...r,
        target: 0, // TODO: Add targets
      })),
      topPerformers,
      recentActivity,
      alerts,
    };
  }

  async getManagerDashboard(userId: number): Promise<DashboardData> {
    // Similar to getDashboard but filtered by user's team
    return this.getDashboard(userId);
  }

  private async getTopPerformers(fromDate: Date, toDate: Date) {
    const result = await this.dataSource.query(`
      SELECT 
        u.id as user_id,
        u.username as user_name,
        COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'won'), 0) as revenue,
        COUNT(d.id) FILTER (WHERE d.status = 'won') as deals
      FROM users u
      LEFT JOIN assignments a ON u.id = a."userId" AND a."entityType" = 'deal'
      LEFT JOIN deals d ON a."dealId" = d.id AND d."closedAt" BETWEEN $1 AND $2
      WHERE u.role IN ('manager', 'admin')
      GROUP BY u.id, u.username
      ORDER BY revenue DESC
      LIMIT 5
    `, [fromDate, toDate]);

    return result.map((r: { user_id: string; user_name: string; revenue: string; deals: string }) => ({
      userId: parseInt(r.user_id),
      userName: r.user_name,
      revenue: parseFloat(r.revenue) || 0,
      deals: parseInt(r.deals) || 0,
    }));
  }

  private async getRecentActivity() {
    // Get recent activities from various tables
    const activities = await this.dataSource.query(`
      (
        SELECT 
          l.id,
          'lead_created' as type,
          CONCAT('New lead: ', l.name) as description,
          l."createdAt" as timestamp,
          0 as user_id,
          'System' as user_name
        FROM leads l
        ORDER BY l."createdAt" DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          d.id::int,
          'deal_won' as type,
          CONCAT('Deal won: ', d.title, ' - $', d.amount) as description,
          d."closedAt" as timestamp,
          0 as user_id,
          'System' as user_name
        FROM deals d
        WHERE d.status = 'won'
        ORDER BY d."closedAt" DESC
        LIMIT 5
      )
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    return activities.map((a: { id: number; type: string; description: string; timestamp: Date; user_id: number; user_name: string }) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      timestamp: a.timestamp?.toISOString() || new Date().toISOString(),
      userId: a.user_id,
      userName: a.user_name,
    }));
  }

  private async getAlerts(): Promise<DashboardData['alerts']> {
    const alerts: DashboardData['alerts'] = [];

    // Check for overdue tasks
    const overdueTasks = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE status != 'completed' AND "dueDate" < NOW()
    `);
    if (parseInt(overdueTasks[0].count) > 0) {
      alerts.push({
        type: 'overdue_tasks',
        message: `${overdueTasks[0].count} overdue tasks need attention`,
        severity: 'warning',
        count: parseInt(overdueTasks[0].count),
      });
    }

    // Check for missed calls
    const missedCalls = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM call_logs 
      WHERE disposition IN ('NO ANSWER', 'BUSY') 
      AND "createdAt" > NOW() - INTERVAL '24 hours'
    `);
    if (parseInt(missedCalls[0].count) > 5) {
      alerts.push({
        type: 'missed_calls',
        message: `${missedCalls[0].count} missed calls in the last 24 hours`,
        severity: 'info',
        count: parseInt(missedCalls[0].count),
      });
    }

    // Check for stale leads
    const staleLeads = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM leads 
      WHERE status = 'new' 
      AND "createdAt" < NOW() - INTERVAL '48 hours'
    `);
    if (parseInt(staleLeads[0].count) > 0) {
      alerts.push({
        type: 'stale_leads',
        message: `${staleLeads[0].count} leads without follow-up for 48+ hours`,
        severity: 'warning',
        count: parseInt(staleLeads[0].count),
      });
    }

    return alerts;
  }

  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }
}
