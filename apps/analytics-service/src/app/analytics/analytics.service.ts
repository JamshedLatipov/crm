import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface SalesAnalytics {
  totalRevenue: number;
  dealsWon: number;
  dealsLost: number;
  conversionRate: number;
  avgDealSize: number;
  avgDealCycle: number; // days
  revenueByPeriod: { period: string; revenue: number }[];
  dealsByStage: { stage: string; count: number; value: number }[];
}

export interface LeadAnalytics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  leadsBySource: { source: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  avgResponseTime: number; // minutes
}

export interface CallAnalytics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  avgWaitTime: number;
  callsByHour: { hour: number; count: number }[];
  callsByUser: { userId: number; userName: string; calls: number; duration: number }[];
}

export interface UserPerformance {
  userId: number;
  userName: string;
  leadsAssigned: number;
  leadsConverted: number;
  dealsWon: number;
  revenue: number;
  callsMade: number;
  callDuration: number;
  tasksCompleted: number;
  avgResponseTime: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getSalesAnalytics(fromDate: Date, toDate: Date): Promise<SalesAnalytics> {
    // Total revenue and deal stats
    const dealStats = await this.dataSource.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'won') as deals_won,
        COUNT(*) FILTER (WHERE status = 'lost') as deals_lost,
        COALESCE(SUM(amount) FILTER (WHERE status = 'won'), 0) as total_revenue,
        COALESCE(AVG(amount) FILTER (WHERE status = 'won'), 0) as avg_deal_size
      FROM deals 
      WHERE "createdAt" BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    // Conversion rate
    const totalDeals = await this.dataSource.query(`
      SELECT COUNT(*) as total FROM deals 
      WHERE "createdAt" BETWEEN $1 AND $2 AND status IN ('won', 'lost')
    `, [fromDate, toDate]);

    const conversionRate = totalDeals[0].total > 0 
      ? (dealStats[0].deals_won / totalDeals[0].total) * 100 
      : 0;

    // Revenue by period (daily)
    const revenueByPeriod = await this.dataSource.query(`
      SELECT 
        DATE("closedAt") as period,
        COALESCE(SUM(amount), 0) as revenue
      FROM deals 
      WHERE status = 'won' AND "closedAt" BETWEEN $1 AND $2
      GROUP BY DATE("closedAt")
      ORDER BY period
    `, [fromDate, toDate]);

    // Deals by stage
    const dealsByStage = await this.dataSource.query(`
      SELECT 
        ps.name as stage,
        COUNT(d.id) as count,
        COALESCE(SUM(d.amount), 0) as value
      FROM deals d
      JOIN pipeline_stages ps ON d."stageId" = ps.id
      WHERE d."createdAt" BETWEEN $1 AND $2
      GROUP BY ps.name, ps."sortOrder"
      ORDER BY ps."sortOrder"
    `, [fromDate, toDate]);

    // Average deal cycle
    const avgCycle = await this.dataSource.query(`
      SELECT COALESCE(AVG(EXTRACT(DAY FROM ("closedAt" - "createdAt"))), 0) as avg_cycle
      FROM deals 
      WHERE status = 'won' AND "closedAt" BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    return {
      totalRevenue: parseFloat(dealStats[0].total_revenue) || 0,
      dealsWon: parseInt(dealStats[0].deals_won) || 0,
      dealsLost: parseInt(dealStats[0].deals_lost) || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgDealSize: parseFloat(dealStats[0].avg_deal_size) || 0,
      avgDealCycle: Math.round(parseFloat(avgCycle[0].avg_cycle) || 0),
      revenueByPeriod: revenueByPeriod.map((r: { period: string; revenue: string }) => ({
        period: r.period,
        revenue: parseFloat(r.revenue) || 0,
      })),
      dealsByStage: dealsByStage.map((d: { stage: string; count: string; value: string }) => ({
        stage: d.stage,
        count: parseInt(d.count) || 0,
        value: parseFloat(d.value) || 0,
      })),
    };
  }

  async getLeadAnalytics(fromDate: Date, toDate: Date): Promise<LeadAnalytics> {
    // Lead counts
    const leadStats = await this.dataSource.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE "createdAt" >= $1) as new_leads,
        COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
        COUNT(*) FILTER (WHERE status = 'converted') as converted_leads
      FROM leads 
      WHERE "createdAt" BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    const conversionRate = leadStats[0].total_leads > 0
      ? (leadStats[0].converted_leads / leadStats[0].total_leads) * 100
      : 0;

    // Leads by source
    const leadsBySource = await this.dataSource.query(`
      SELECT 
        COALESCE(source, 'unknown') as source,
        COUNT(*) as count
      FROM leads 
      WHERE "createdAt" BETWEEN $1 AND $2
      GROUP BY source
      ORDER BY count DESC
    `, [fromDate, toDate]);

    // Leads by status
    const leadsByStatus = await this.dataSource.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM leads 
      WHERE "createdAt" BETWEEN $1 AND $2
      GROUP BY status
      ORDER BY count DESC
    `, [fromDate, toDate]);

    return {
      totalLeads: parseInt(leadStats[0].total_leads) || 0,
      newLeads: parseInt(leadStats[0].new_leads) || 0,
      qualifiedLeads: parseInt(leadStats[0].qualified_leads) || 0,
      convertedLeads: parseInt(leadStats[0].converted_leads) || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      leadsBySource: leadsBySource.map((l: { source: string; count: string }) => ({
        source: l.source,
        count: parseInt(l.count) || 0,
      })),
      leadsByStatus: leadsByStatus.map((l: { status: string; count: string }) => ({
        status: l.status,
        count: parseInt(l.count) || 0,
      })),
      avgResponseTime: 0, // TODO: Calculate from activity logs
    };
  }

  async getCallAnalytics(fromDate: Date, toDate: Date): Promise<CallAnalytics> {
    // Call stats
    const callStats = await this.dataSource.query(`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE disposition = 'ANSWERED') as answered_calls,
        COUNT(*) FILTER (WHERE disposition IN ('NO ANSWER', 'BUSY', 'CONGESTION')) as missed_calls,
        COALESCE(AVG(duration), 0) as avg_duration
      FROM call_logs 
      WHERE "createdAt" BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    // Calls by hour
    const callsByHour = await this.dataSource.query(`
      SELECT 
        EXTRACT(HOUR FROM "createdAt") as hour,
        COUNT(*) as count
      FROM call_logs 
      WHERE "createdAt" BETWEEN $1 AND $2
      GROUP BY EXTRACT(HOUR FROM "createdAt")
      ORDER BY hour
    `, [fromDate, toDate]);

    // Calls by user
    const callsByUser = await this.dataSource.query(`
      SELECT 
        c."createdBy" as user_id,
        u.username as user_name,
        COUNT(*) as calls,
        COALESCE(SUM(c.duration), 0) as duration
      FROM call_logs c
      LEFT JOIN users u ON c."createdBy"::text = u.id::text
      WHERE c."createdAt" BETWEEN $1 AND $2
      GROUP BY c."createdBy", u.username
      ORDER BY calls DESC
    `, [fromDate, toDate]);

    return {
      totalCalls: parseInt(callStats[0].total_calls) || 0,
      answeredCalls: parseInt(callStats[0].answered_calls) || 0,
      missedCalls: parseInt(callStats[0].missed_calls) || 0,
      avgDuration: Math.round(parseFloat(callStats[0].avg_duration) || 0),
      avgWaitTime: 0, // TODO: Calculate from queue data
      callsByHour: callsByHour.map((c: { hour: string; count: string }) => ({
        hour: parseInt(c.hour),
        count: parseInt(c.count) || 0,
      })),
      callsByUser: callsByUser.map((c: { user_id: string; user_name: string; calls: string; duration: string }) => ({
        userId: parseInt(c.user_id) || 0,
        userName: c.user_name || 'Unknown',
        calls: parseInt(c.calls) || 0,
        duration: parseInt(c.duration) || 0,
      })),
    };
  }

  async getUserPerformance(fromDate: Date, toDate: Date): Promise<UserPerformance[]> {
    const performance = await this.dataSource.query(`
      WITH user_leads AS (
        SELECT 
          a."userId",
          COUNT(*) as leads_assigned,
          COUNT(*) FILTER (WHERE l.status = 'converted') as leads_converted
        FROM assignments a
        JOIN leads l ON a."leadId" = l.id
        WHERE a."assignedAt" BETWEEN $1 AND $2
        GROUP BY a."userId"
      ),
      user_deals AS (
        SELECT 
          a."userId",
          COUNT(*) FILTER (WHERE d.status = 'won') as deals_won,
          COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'won'), 0) as revenue
        FROM assignments a
        JOIN deals d ON a."dealId" = d.id
        WHERE a."assignedAt" BETWEEN $1 AND $2
        GROUP BY a."userId"
      ),
      user_calls AS (
        SELECT 
          "createdBy"::int as user_id,
          COUNT(*) as calls_made,
          COALESCE(SUM(duration), 0) as call_duration
        FROM call_logs
        WHERE "createdAt" BETWEEN $1 AND $2
        GROUP BY "createdBy"
      ),
      user_tasks AS (
        SELECT 
          a."userId",
          COUNT(*) FILTER (WHERE a.status = 'completed') as tasks_completed
        FROM assignments a
        WHERE a."entityType" = 'task' AND a."assignedAt" BETWEEN $1 AND $2
        GROUP BY a."userId"
      )
      SELECT 
        u.id as user_id,
        u.username as user_name,
        COALESCE(ul.leads_assigned, 0) as leads_assigned,
        COALESCE(ul.leads_converted, 0) as leads_converted,
        COALESCE(ud.deals_won, 0) as deals_won,
        COALESCE(ud.revenue, 0) as revenue,
        COALESCE(uc.calls_made, 0) as calls_made,
        COALESCE(uc.call_duration, 0) as call_duration,
        COALESCE(ut.tasks_completed, 0) as tasks_completed
      FROM users u
      LEFT JOIN user_leads ul ON u.id = ul."userId"
      LEFT JOIN user_deals ud ON u.id = ud."userId"
      LEFT JOIN user_calls uc ON u.id = uc.user_id
      LEFT JOIN user_tasks ut ON u.id = ut."userId"
      WHERE u.role IN ('manager', 'admin')
      ORDER BY COALESCE(ud.revenue, 0) DESC
    `, [fromDate, toDate]);

    return performance.map((p: {
      user_id: string;
      user_name: string;
      leads_assigned: string;
      leads_converted: string;
      deals_won: string;
      revenue: string;
      calls_made: string;
      call_duration: string;
      tasks_completed: string;
    }) => ({
      userId: parseInt(p.user_id),
      userName: p.user_name,
      leadsAssigned: parseInt(p.leads_assigned) || 0,
      leadsConverted: parseInt(p.leads_converted) || 0,
      dealsWon: parseInt(p.deals_won) || 0,
      revenue: parseFloat(p.revenue) || 0,
      callsMade: parseInt(p.calls_made) || 0,
      callDuration: parseInt(p.call_duration) || 0,
      tasksCompleted: parseInt(p.tasks_completed) || 0,
      avgResponseTime: 0,
    }));
  }

  // ============ Call-specific Analytics Methods (from monolith) ============

  async getCallsAgentPerformance(fromDate: Date, toDate: Date) {
    const agentStats = await this.dataSource.query(`
      SELECT 
        "createdBy" as agent,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE disposition = 'ANSWERED') as answered_calls,
        COALESCE(AVG(duration), 0) as avg_duration,
        COALESCE(SUM(duration), 0) as total_duration
      FROM call_logs
      WHERE "createdAt" BETWEEN $1 AND $2
      GROUP BY "createdBy"
      ORDER BY total_calls DESC
    `, [fromDate, toDate]);

    return {
      agents: agentStats.map((a: { agent: string; total_calls: string; answered_calls: string; avg_duration: string; total_duration: string }) => ({
        agent: a.agent,
        totalCalls: parseInt(a.total_calls) || 0,
        answeredCalls: parseInt(a.answered_calls) || 0,
        avgDuration: Math.round(parseFloat(a.avg_duration) || 0),
        totalDuration: parseInt(a.total_duration) || 0,
        answerRate: parseInt(a.total_calls) > 0 
          ? Math.round((parseInt(a.answered_calls) / parseInt(a.total_calls)) * 100) 
          : 0,
      })),
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    };
  }

  async getCallsOverview(fromDate: Date, toDate: Date) {
    const stats = await this.dataSource.query(`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE disposition = 'ANSWERED') as answered_calls,
        COUNT(*) FILTER (WHERE disposition IN ('NO ANSWER', 'BUSY', 'FAILED', 'CONGESTION')) as missed_calls,
        COUNT(*) FILTER (WHERE "callType" = 'inbound') as inbound_calls,
        COUNT(*) FILTER (WHERE "callType" = 'outbound') as outbound_calls,
        COALESCE(AVG(duration) FILTER (WHERE disposition = 'ANSWERED'), 0) as avg_duration
      FROM call_logs
      WHERE "createdAt" BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    return {
      totalCalls: parseInt(stats[0].total_calls) || 0,
      answeredCalls: parseInt(stats[0].answered_calls) || 0,
      missedCalls: parseInt(stats[0].missed_calls) || 0,
      inboundCalls: parseInt(stats[0].inbound_calls) || 0,
      outboundCalls: parseInt(stats[0].outbound_calls) || 0,
      avgDuration: Math.round(parseFloat(stats[0].avg_duration) || 0),
      answerRate: parseInt(stats[0].total_calls) > 0 
        ? Math.round((parseInt(stats[0].answered_calls) / parseInt(stats[0].total_calls)) * 100) 
        : 0,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    };
  }

  async getCallsSla(fromDate: Date, toDate: Date) {
    // SLA metrics - calls answered within threshold (e.g., 20 seconds)
    const slaThreshold = 20; // seconds
    
    const stats = await this.dataSource.query(`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE disposition = 'ANSWERED' AND COALESCE("waitTime", 0) <= $3) as within_sla,
        COUNT(*) FILTER (WHERE disposition = 'ANSWERED' AND COALESCE("waitTime", 0) > $3) as outside_sla,
        COALESCE(AVG("waitTime"), 0) as avg_wait_time
      FROM call_logs
      WHERE "createdAt" BETWEEN $1 AND $2 AND "callType" = 'inbound'
    `, [fromDate, toDate, slaThreshold]);

    return {
      totalCalls: parseInt(stats[0].total_calls) || 0,
      withinSla: parseInt(stats[0].within_sla) || 0,
      outsideSla: parseInt(stats[0].outside_sla) || 0,
      avgWaitTime: Math.round(parseFloat(stats[0].avg_wait_time) || 0),
      slaThreshold,
      slaRate: parseInt(stats[0].total_calls) > 0 
        ? Math.round((parseInt(stats[0].within_sla) / parseInt(stats[0].total_calls)) * 100) 
        : 0,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    };
  }

  async getCallsAbandoned(fromDate: Date, toDate: Date) {
    const stats = await this.dataSource.query(`
      SELECT 
        COUNT(*) as total_inbound,
        COUNT(*) FILTER (WHERE disposition IN ('NO ANSWER', 'CANCEL', 'CONGESTION')) as abandoned
      FROM call_logs
      WHERE "createdAt" BETWEEN $1 AND $2 AND "callType" = 'inbound'
    `, [fromDate, toDate]);

    const abandonedCalls = await this.dataSource.query(`
      SELECT id, "asteriskUniqueId" as unique_id, "createdBy" as caller, disposition, "createdAt"
      FROM call_logs
      WHERE "createdAt" BETWEEN $1 AND $2 
        AND "callType" = 'inbound'
        AND disposition IN ('NO ANSWER', 'CANCEL', 'CONGESTION')
      ORDER BY "createdAt" DESC
      LIMIT 100
    `, [fromDate, toDate]);

    return {
      totalInbound: parseInt(stats[0].total_inbound) || 0,
      abandonedCount: parseInt(stats[0].abandoned) || 0,
      abandonRate: parseInt(stats[0].total_inbound) > 0 
        ? Math.round((parseInt(stats[0].abandoned) / parseInt(stats[0].total_inbound)) * 100) 
        : 0,
      abandonedCalls: abandonedCalls.map((c: { id: string; unique_id: string; caller: string; disposition: string; createdAt: Date }) => ({
        id: c.id,
        uniqueId: c.unique_id,
        caller: c.caller,
        disposition: c.disposition,
        createdAt: c.createdAt,
      })),
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    };
  }

  async getCallsQueuePerformance(fromDate: Date, toDate: Date) {
    // Queue performance - placeholder if queue data is not in call_logs
    // This would typically come from Asterisk queue_log table
    return {
      queues: [],
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    };
  }

  async getCallsIvrAnalysis(fromDate: Date, toDate: Date) {
    // IVR analysis - placeholder
    return {
      ivrNodes: [],
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    };
  }

  async getCallsConversion(fromDate: Date, toDate: Date) {
    // Call to deal conversion (ROI)
    const conversionStats = await this.dataSource.query(`
      WITH call_deals AS (
        SELECT DISTINCT c.id as call_id, d.id as deal_id, d.amount
        FROM call_logs c
        JOIN leads l ON c."clientCallId" = l.phone
        JOIN deals d ON d."leadId" = l.id
        WHERE c."createdAt" BETWEEN $1 AND $2 
          AND d.status = 'won'
      )
      SELECT 
        COUNT(DISTINCT call_id) as calls_with_deals,
        COUNT(DISTINCT deal_id) as deals_from_calls,
        COALESCE(SUM(amount), 0) as revenue_from_calls
      FROM call_deals
    `, [fromDate, toDate]);

    const totalCalls = await this.dataSource.query(`
      SELECT COUNT(*) as total FROM call_logs WHERE "createdAt" BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    return {
      totalCalls: parseInt(totalCalls[0].total) || 0,
      callsWithDeals: parseInt(conversionStats[0].calls_with_deals) || 0,
      dealsFromCalls: parseInt(conversionStats[0].deals_from_calls) || 0,
      revenueFromCalls: parseFloat(conversionStats[0].revenue_from_calls) || 0,
      conversionRate: parseInt(totalCalls[0].total) > 0 
        ? Math.round((parseInt(conversionStats[0].calls_with_deals) / parseInt(totalCalls[0].total)) * 100) 
        : 0,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    };
  }
}
