import {
  Controller,
  Get,
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
}
