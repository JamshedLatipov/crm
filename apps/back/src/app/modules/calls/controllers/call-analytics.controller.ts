import { Controller, Get, Param, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull } from 'typeorm';
import { CallSummary } from '../entities/call-summary.entity';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import { CallEnrichmentService } from '../services/call-enrichment.service';

@ApiTags('Call Analytics')
@Controller('api/calls/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CallAnalyticsController {
  constructor(
    @InjectRepository(CallSummary)
    private readonly summaryRepo: Repository<CallSummary>,
    private readonly enrichmentService: CallEnrichmentService
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get call statistics summary' })
  async getCallStatistics(
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const where: any = {};
    if (from && to) {
      where.startedAt = Between(new Date(from), new Date(to));
    }

    const calls = await this.summaryRepo.find({ where });

    const total = calls.length;
    const answered = calls.filter(c => c.status === 'ANSWERED').length;
    const missed = calls.filter(c => c.status === 'NO ANSWER' || c.status === 'BUSY').length;
    const abandoned = calls.filter(c => c.status === 'ABANDON').length;
    
    const avgWaitTime = calls.filter(c => c.waitTime).reduce((sum, c) => sum + (c.waitTime || 0), 0) / 
                        calls.filter(c => c.waitTime).length || 0;
    
    const avgTalkTime = calls.filter(c => c.talkTime).reduce((sum, c) => sum + (c.talkTime || 0), 0) / 
                       calls.filter(c => c.talkTime).length || 0;

    const slaCompliance = total > 0 ? ((total - calls.filter(c => c.slaViolated).length) / total * 100) : 100;

    return {
      total,
      answered,
      missed,
      abandoned,
      answerRate: total > 0 ? (answered / total * 100).toFixed(2) : 0,
      avgWaitTime: Math.round(avgWaitTime),
      avgTalkTime: Math.round(avgTalkTime),
      slaCompliance: slaCompliance.toFixed(2),
      byDirection: {
        inbound: calls.filter(c => c.direction === 'inbound').length,
        outbound: calls.filter(c => c.direction === 'outbound').length,
        internal: calls.filter(c => c.direction === 'internal').length
      }
    };
  }

  @Get('queue-performance')
  @ApiOperation({ summary: 'Get queue performance metrics' })
  async getQueuePerformance(@Query('queue') queue?: string) {
    const where: any = {};
    if (queue) where.queue = queue;

    const calls = await this.summaryRepo.find({ where });

    const queues = Array.from(new Set(calls.map(c => c.queue).filter(Boolean)));
    
    return queues.map(q => {
      const queueCalls = calls.filter(c => c.queue === q);
      const answered = queueCalls.filter(c => c.status === 'ANSWERED');
      
      return {
        queue: q,
        totalCalls: queueCalls.length,
        answeredCalls: answered.length,
        abandonedCalls: queueCalls.filter(c => c.status === 'ABANDON').length,
        avgWaitTime: Math.round(
          queueCalls.reduce((sum, c) => sum + (c.waitTime || 0), 0) / queueCalls.length
        ),
        avgRingTime: Math.round(
          answered.reduce((sum, c) => sum + (c.ringTime || 0), 0) / answered.length
        ),
        slaViolations: queueCalls.filter(c => c.slaViolated).length
      };
    });
  }

  @Get('agent-performance')
  @ApiOperation({ summary: 'Get agent performance metrics' })
  async getAgentPerformance() {
    const calls = await this.summaryRepo.find({
      where: { agent: Not(IsNull()) }
    });

    const agents = Array.from(new Set(calls.map(c => c.agent).filter(Boolean)));
    
    return agents.map(agent => {
      const agentCalls = calls.filter(c => c.agent === agent);
      
      return {
        agent,
        totalCalls: agentCalls.length,
        avgTalkTime: Math.round(
          agentCalls.reduce((sum, c) => sum + (c.talkTime || 0), 0) / agentCalls.length
        ),
        avgRingTime: Math.round(
          agentCalls.reduce((sum, c) => sum + (c.ringTime || 0), 0) / agentCalls.length
        ),
        answeredCalls: agentCalls.filter(c => c.status === 'ANSWERED').length
      };
    });
  }

  @Post(':uniqueId/tag')
  @ApiOperation({ summary: 'Add tags to a call' })
  async tagCall(
    @Param('uniqueId') uniqueId: string,
    @Body('tags') tags: string[]
  ) {
    await this.enrichmentService.tagCall(uniqueId, tags);
    return { success: true };
  }

  @Post(':uniqueId/recording')
  @ApiOperation({ summary: 'Update recording URL' })
  async updateRecording(
    @Param('uniqueId') uniqueId: string,
    @Body('url') url: string
  ) {
    await this.enrichmentService.updateRecordingUrl(uniqueId, url);
    return { success: true };
  }

  @Get('sla-violations')
  @ApiOperation({ summary: 'Get calls with SLA violations' })
  async getSlaViolations() {
    return this.summaryRepo.find({
      where: { slaViolated: true },
      order: { startedAt: 'DESC' },
      take: 100
    });
  }

  @Get('abandoned')
  @ApiOperation({ summary: 'Get abandoned calls analysis' })
  async getAbandonedCalls() {
    const calls = await this.summaryRepo.find({
      where: { status: 'ABANDON' },
      order: { startedAt: 'DESC' },
      take: 100
    });

    return {
      total: calls.length,
      avgAbandonTime: Math.round(
        calls.reduce((sum, c) => sum + (c.abandonTime || 0), 0) / calls.length
      ),
      byQueue: Array.from(new Set(calls.map(c => c.queue))).map(queue => ({
        queue,
        count: calls.filter(c => c.queue === queue).length
      })),
      calls: calls.slice(0, 20)
    };
  }
}
