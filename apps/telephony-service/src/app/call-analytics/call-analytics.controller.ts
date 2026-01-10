import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CallAnalyticsService, DateRangeDto } from './call-analytics.service';
import { TELEPHONY_PATTERNS } from '@crm/contracts';

@Controller('calls/analytics')
export class CallAnalyticsController {
  constructor(private readonly callAnalyticsService: CallAnalyticsService) {}

  // ============ HTTP Endpoints ============

  @Get('summary')
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.callAnalyticsService.getSummary({ from, to });
  }

  @Get('queue-performance')
  getQueuePerformance(@Query('from') from?: string, @Query('to') to?: string) {
    return this.callAnalyticsService.getQueuePerformance({ from, to });
  }

  @Get('agent-performance')
  getAgentPerformance(@Query('from') from?: string, @Query('to') to?: string) {
    return this.callAnalyticsService.getAgentPerformance({ from, to });
  }

  @Get('sla-violations')
  getSlaViolations(@Query('from') from?: string, @Query('to') to?: string) {
    return this.callAnalyticsService.getSlaViolations({ from, to });
  }

  @Get('abandoned')
  getAbandoned(@Query('from') from?: string, @Query('to') to?: string) {
    return this.callAnalyticsService.getAbandoned({ from, to });
  }

  @Post(':uniqueId/tag')
  addTag(@Param('uniqueId') uniqueId: string, @Body() body: { tag: string }) {
    return this.callAnalyticsService.addTag(uniqueId, body.tag);
  }

  @Post(':uniqueId/recording')
  updateRecording(@Param('uniqueId') uniqueId: string, @Body() body: { recordingUrl: string }) {
    return this.callAnalyticsService.updateRecording(uniqueId, body.recordingUrl);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(TELEPHONY_PATTERNS.ANALYTICS_SUMMARY)
  handleGetSummary(@Payload() dateRange: DateRangeDto) {
    return this.callAnalyticsService.getSummary(dateRange);
  }

  @MessagePattern(TELEPHONY_PATTERNS.ANALYTICS_QUEUE_PERFORMANCE)
  handleGetQueuePerformance(@Payload() dateRange: DateRangeDto) {
    return this.callAnalyticsService.getQueuePerformance(dateRange);
  }

  @MessagePattern(TELEPHONY_PATTERNS.ANALYTICS_AGENT_PERFORMANCE)
  handleGetAgentPerformance(@Payload() dateRange: DateRangeDto) {
    return this.callAnalyticsService.getAgentPerformance(dateRange);
  }

  @MessagePattern(TELEPHONY_PATTERNS.ANALYTICS_SLA_VIOLATIONS)
  handleGetSlaViolations(@Payload() dateRange: DateRangeDto) {
    return this.callAnalyticsService.getSlaViolations(dateRange);
  }

  @MessagePattern(TELEPHONY_PATTERNS.ANALYTICS_ABANDONED)
  handleGetAbandoned(@Payload() dateRange: DateRangeDto) {
    return this.callAnalyticsService.getAbandoned(dateRange);
  }

  @MessagePattern(TELEPHONY_PATTERNS.ANALYTICS_ADD_TAG)
  handleAddTag(@Payload() data: { uniqueId: string; tag: string }) {
    return this.callAnalyticsService.addTag(data.uniqueId, data.tag);
  }

  @MessagePattern(TELEPHONY_PATTERNS.ANALYTICS_UPDATE_RECORDING)
  handleUpdateRecording(@Payload() data: { uniqueId: string; recordingUrl: string }) {
    return this.callAnalyticsService.updateRecording(data.uniqueId, data.recordingUrl);
  }
}
