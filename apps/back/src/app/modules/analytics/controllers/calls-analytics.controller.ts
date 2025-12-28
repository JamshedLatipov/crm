import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import { RolesGuard } from '../../user/roles.guard';
import { Roles } from '../../user/roles.decorator';
import { AgentPerformanceService, CallsOverviewService, SlaMetricsService, AbandonedCallsService, QueuePerformanceService } from '../services';
import {
  CallFiltersDto,
  AgentPerformanceResponseDto,
  CallsOverviewDto,
  SlaMetricsDto,
  AbandonedCallsDto,
  QueuePerformanceDto,
} from '../dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics/calls')
export class CallsAnalyticsController {
  constructor(
    private readonly agentPerformanceService: AgentPerformanceService,
    private readonly callsOverviewService: CallsOverviewService,
    private readonly slaMetricsService: SlaMetricsService,
    private readonly abandonedCallsService: AbandonedCallsService,
    private readonly queuePerformanceService: QueuePerformanceService,
  ) {}

  @Get('agent-performance')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get agent performance metrics',
    description: 'Returns performance statistics for all agents with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent performance data',
    type: AgentPerformanceResponseDto,
  })
  async getAgentPerformance(
    @Query() filters: CallFiltersDto
  ): Promise<AgentPerformanceResponseDto> {
    return this.agentPerformanceService.getAgentPerformance(filters);
  }

  @Get('overview')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get calls overview statistics',
    description: 'Returns comprehensive call statistics including distributions and trends',
  })
  @ApiResponse({
    status: 200,
    description: 'Calls overview data',
    type: CallsOverviewDto,
  })
  async getCallsOverview(
    @Query() filters: CallFiltersDto
  ): Promise<CallsOverviewDto> {
    return this.callsOverviewService.getCallsOverview(filters);
  }

  @Get('sla')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get SLA metrics',
    description: 'Returns SLA compliance metrics including trends and queue breakdown',
  })
  @ApiResponse({
    status: 200,
    description: 'SLA metrics data',
    type: SlaMetricsDto,
  })
  async getSlaMetrics(
    @Query() filters: CallFiltersDto
  ): Promise<SlaMetricsDto> {
    return this.slaMetricsService.getSlaMetrics(filters);
  }

  @Get('abandoned')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get abandoned calls analysis',
    description: 'Returns detailed analysis of abandoned calls including reasons and trends',
  })
  @ApiResponse({
    status: 200,
    description: 'Abandoned calls data',
    type: AbandonedCallsDto,
  })
  async getAbandonedCalls(
    @Query() filters: CallFiltersDto
  ): Promise<AbandonedCallsDto> {
    return this.abandonedCallsService.getAbandonedCalls(filters);
  }

  @Get('queue-performance')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get queue performance metrics',
    description: 'Returns performance statistics for all queues including agents and hourly distribution',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue performance data',
    type: QueuePerformanceDto,
  })
  async getQueuePerformance(
    @Query() filters: CallFiltersDto
  ): Promise<QueuePerformanceDto> {
    return this.queuePerformanceService.getQueuePerformance(filters);
  }
}
