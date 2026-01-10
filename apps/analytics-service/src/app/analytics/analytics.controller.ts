import { Controller, Get, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnalyticsService } from './analytics.service';
import { ANALYTICS_PATTERNS } from '@crm/contracts';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ============ HTTP Endpoints ============

  @Get('sales')
  getSalesAnalytics(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getSalesAnalytics(from, to);
  }

  @Get('leads')
  getLeadAnalytics(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getLeadAnalytics(from, to);
  }

  @Get('calls')
  getCallAnalytics(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getCallAnalytics(from, to);
  }

  @Get('users')
  getUserPerformance(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getUserPerformance(from, to);
  }

  // ============ Call-specific Analytics (from monolith) ============

  @Get('calls/agent-performance')
  getCallsAgentPerformance(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getCallsAgentPerformance(from, to);
  }

  @Get('calls/overview')
  getCallsOverview(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getCallsOverview(from, to);
  }

  @Get('calls/sla')
  getCallsSla(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getCallsSla(from, to);
  }

  @Get('calls/abandoned')
  getCallsAbandoned(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getCallsAbandoned(from, to);
  }

  @Get('calls/queue-performance')
  getCallsQueuePerformance(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getCallsQueuePerformance(from, to);
  }

  @Get('calls/ivr-analysis')
  getCallsIvrAnalysis(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getCallsIvrAnalysis(from, to);
  }

  @Get('calls/conversion')
  getCallsConversion(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : this.getDefaultFromDate();
    const to = toDate ? new Date(toDate) : new Date();
    return this.analyticsService.getCallsConversion(from, to);
  }

  // ============ RabbitMQ Handlers ============

  @MessagePattern(ANALYTICS_PATTERNS.GET_LEAD_ANALYTICS)
  handleGetLeadAnalytics(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getLeadAnalytics(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.GET_DEAL_ANALYTICS)
  handleGetDealAnalytics(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getSalesAnalytics(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.GET_CALL_ANALYTICS)
  handleGetCallAnalytics(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getCallAnalytics(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.GET_USER_PERFORMANCE)
  handleGetUserPerformance(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getUserPerformance(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.HEALTH_CHECK)
  handleHealthCheck() {
    return { status: 'ok', service: 'analytics-service' };
  }

  // ============ Call-specific Analytics Message Handlers ============

  @MessagePattern(ANALYTICS_PATTERNS.CALLS_AGENT_PERFORMANCE)
  handleGetCallsAgentPerformance(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getCallsAgentPerformance(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.CALLS_OVERVIEW)
  handleGetCallsOverview(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getCallsOverview(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.CALLS_SLA)
  handleGetCallsSla(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getCallsSla(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.CALLS_ABANDONED)
  handleGetCallsAbandoned(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getCallsAbandoned(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.CALLS_QUEUE_PERFORMANCE)
  handleGetCallsQueuePerformance(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getCallsQueuePerformance(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.CALLS_IVR_ANALYSIS)
  handleGetCallsIvrAnalysis(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getCallsIvrAnalysis(from, to);
  }

  @MessagePattern(ANALYTICS_PATTERNS.CALLS_CONVERSION)
  handleGetCallsConversion(@Payload() data: { fromDate?: string; toDate?: string }) {
    const from = data.fromDate ? new Date(data.fromDate) : this.getDefaultFromDate();
    const to = data.toDate ? new Date(data.toDate) : new Date();
    return this.analyticsService.getCallsConversion(from, to);
  }

  private getDefaultFromDate(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  }
}
