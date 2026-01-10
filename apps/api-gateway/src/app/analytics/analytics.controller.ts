import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { SERVICES, ANALYTICS_PATTERNS } from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(
    @Inject(SERVICES.ANALYTICS) private readonly analyticsClient: ClientProxy,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard data', description: 'Retrieve aggregated dashboard metrics' })
  @ApiQuery({ name: 'period', description: 'Time period (day, week, month)', required: false })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@Query('period') period = 'week') {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GET_DASHBOARD, { period }).pipe(timeout(10000)),
    );
  }

  @Get('dashboard/manager')
  @ApiOperation({ summary: 'Get manager dashboard', description: 'Retrieve manager-specific dashboard metrics' })
  @ApiQuery({ name: 'userId', description: 'Manager user ID', required: true })
  @ApiResponse({ status: 200, description: 'Manager dashboard data' })
  async getManagerDashboard(@Query('userId') userId: string) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GET_MANAGER_DASHBOARD, { userId: parseInt(userId) }).pipe(timeout(10000)),
    );
  }

  @Get('calls')
  @ApiOperation({ summary: 'Get call analytics', description: 'Retrieve call statistics and metrics' })
  @ApiQuery({ name: 'from', description: 'Start date', required: false })
  @ApiQuery({ name: 'to', description: 'End date', required: false })
  @ApiResponse({ status: 200, description: 'Call analytics' })
  async getCallAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GET_CALL_ANALYTICS, { from, to }).pipe(timeout(10000)),
    );
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get lead analytics', description: 'Retrieve lead conversion and funnel metrics' })
  @ApiQuery({ name: 'from', description: 'Start date', required: false })
  @ApiQuery({ name: 'to', description: 'End date', required: false })
  @ApiResponse({ status: 200, description: 'Lead analytics' })
  async getLeadAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GET_LEAD_ANALYTICS, { from, to }).pipe(timeout(10000)),
    );
  }

  @Get('deals')
  @ApiOperation({ summary: 'Get deal analytics', description: 'Retrieve deal pipeline and revenue metrics' })
  @ApiQuery({ name: 'from', description: 'Start date', required: false })
  @ApiQuery({ name: 'to', description: 'End date', required: false })
  @ApiResponse({ status: 200, description: 'Deal analytics' })
  async getDealAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GET_DEAL_ANALYTICS, { from, to }).pipe(timeout(10000)),
    );
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get user performance', description: 'Retrieve individual user performance metrics' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: false })
  @ApiQuery({ name: 'from', description: 'Start date', required: false })
  @ApiQuery({ name: 'to', description: 'End date', required: false })
  @ApiResponse({ status: 200, description: 'User performance data' })
  async getUserPerformance(
    @Query('userId') userId?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GET_USER_PERFORMANCE, { userId, from, to }).pipe(timeout(10000)),
    );
  }

  // Reports endpoints
  @Get('reports/sales')
  @ApiOperation({ summary: 'Get sales report', description: 'Generate sales report for date range' })
  @ApiQuery({ name: 'fromDate', description: 'Start date', required: false })
  @ApiQuery({ name: 'toDate', description: 'End date', required: false })
  @ApiQuery({ name: 'groupBy', description: 'Group by (day, week, month)', required: false })
  async getSalesReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GENERATE_REPORT, {
        type: 'sales',
        fromDate,
        toDate,
        groupBy,
      }).pipe(timeout(30000)),
    );
  }

  @Get('reports/leads')
  @ApiOperation({ summary: 'Get leads report', description: 'Generate leads report for date range' })
  @ApiQuery({ name: 'fromDate', description: 'Start date', required: false })
  @ApiQuery({ name: 'toDate', description: 'End date', required: false })
  @ApiQuery({ name: 'groupBy', description: 'Group by (day, week, month)', required: false })
  async getLeadsReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GENERATE_REPORT, {
        type: 'leads',
        fromDate,
        toDate,
        groupBy,
      }).pipe(timeout(30000)),
    );
  }

  @Get('reports/calls')
  @ApiOperation({ summary: 'Get calls report', description: 'Generate calls report for date range' })
  @ApiQuery({ name: 'fromDate', description: 'Start date', required: false })
  @ApiQuery({ name: 'toDate', description: 'End date', required: false })
  @ApiQuery({ name: 'groupBy', description: 'Group by (day, week, month)', required: false })
  async getCallsReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GENERATE_REPORT, {
        type: 'calls',
        fromDate,
        toDate,
        groupBy,
      }).pipe(timeout(30000)),
    );
  }

  @Get('reports/performance')
  @ApiOperation({ summary: 'Get performance report', description: 'Generate user performance report' })
  @ApiQuery({ name: 'fromDate', description: 'Start date', required: false })
  @ApiQuery({ name: 'toDate', description: 'End date', required: false })
  async getPerformanceReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GENERATE_REPORT, {
        type: 'performance',
        fromDate,
        toDate,
      }).pipe(timeout(30000)),
    );
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate custom report', description: 'Generate a custom report based on configuration' })
  async generateCustomReport(@Body() config: any) {
    return firstValueFrom(
      this.analyticsClient.send(ANALYTICS_PATTERNS.GENERATE_REPORT, config).pipe(timeout(30000)),
    );
  }
}
