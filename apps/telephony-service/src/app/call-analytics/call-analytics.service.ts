import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CallLog } from '../call/entities/call-log.entity';

export interface DateRangeDto {
  from?: string;
  to?: string;
}

@Injectable()
export class CallAnalyticsService {
  private readonly logger = new Logger(CallAnalyticsService.name);

  constructor(
    @InjectRepository(CallLog)
    private readonly callLogRepository: Repository<CallLog>,
  ) {}

  async getSummary(dateRange: DateRangeDto) {
    const from = dateRange.from ? new Date(dateRange.from) : this.getStartOfDay();
    const to = dateRange.to ? new Date(dateRange.to) : new Date();

    const calls = await this.callLogRepository.find({
      where: { createdAt: Between(from, to) },
    });

    const answered = calls.filter(c => c.disposition === 'ANSWERED').length;
    const missed = calls.filter(c => ['NO ANSWER', 'BUSY', 'CONGESTION', 'FAILED'].includes(c.disposition || '')).length;
    const inbound = calls.filter(c => c.callType === 'inbound').length;
    const outbound = calls.filter(c => c.callType === 'outbound').length;
    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

    return {
      total: calls.length,
      answered,
      missed,
      inbound,
      outbound,
      avgDuration,
      answerRate: calls.length > 0 ? Math.round((answered / calls.length) * 100) : 0,
      period: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  async getQueuePerformance(dateRange: DateRangeDto) {
    const from = dateRange.from ? new Date(dateRange.from) : this.getStartOfDay();
    const to = dateRange.to ? new Date(dateRange.to) : new Date();

    // TODO: Integrate with actual queue data
    // For now, return placeholder structure
    return {
      queues: [],
      period: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  async getAgentPerformance(dateRange: DateRangeDto) {
    const from = dateRange.from ? new Date(dateRange.from) : this.getStartOfDay();
    const to = dateRange.to ? new Date(dateRange.to) : new Date();

    const calls = await this.callLogRepository.find({
      where: { createdAt: Between(from, to) },
    });

    // Group by agent (createdBy)
    const agentMap = new Map<string, { total: number; answered: number; duration: number }>();
    
    for (const call of calls) {
      const agent = call.createdBy || 'unknown';
      if (!agentMap.has(agent)) {
        agentMap.set(agent, { total: 0, answered: 0, duration: 0 });
      }
      const stats = agentMap.get(agent)!;
      stats.total++;
      if (call.disposition === 'ANSWERED') stats.answered++;
      stats.duration += call.duration || 0;
    }

    const agents = Array.from(agentMap.entries()).map(([agent, stats]) => ({
      agent,
      totalCalls: stats.total,
      answeredCalls: stats.answered,
      avgDuration: stats.total > 0 ? Math.round(stats.duration / stats.total) : 0,
      answerRate: stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0,
    }));

    return {
      agents,
      period: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  async addTag(uniqueId: string, tag: string) {
    const call = await this.callLogRepository.findOne({ where: { asteriskUniqueId: uniqueId } });
    if (!call) {
      return { success: false, error: 'Call not found' };
    }
    
    // Add tag to note or a dedicated tags field
    call.note = call.note ? `${call.note}, [${tag}]` : `[${tag}]`;
    await this.callLogRepository.save(call);
    
    return { success: true };
  }

  async updateRecording(uniqueId: string, recordingUrl: string) {
    const call = await this.callLogRepository.findOne({ where: { asteriskUniqueId: uniqueId } });
    if (!call) {
      return { success: false, error: 'Call not found' };
    }
    
    // Store recording URL - assuming there's a recordingUrl field or we use metadata
    // For now, store in note
    call.note = call.note ? `${call.note} | Recording: ${recordingUrl}` : `Recording: ${recordingUrl}`;
    await this.callLogRepository.save(call);
    
    return { success: true };
  }

  async getSlaViolations(dateRange: DateRangeDto) {
    const from = dateRange.from ? new Date(dateRange.from) : this.getStartOfDay();
    const to = dateRange.to ? new Date(dateRange.to) : new Date();

    // TODO: Implement SLA violation detection based on wait time thresholds
    return {
      violations: [],
      totalViolations: 0,
      period: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  async getAbandoned(dateRange: DateRangeDto) {
    const from = dateRange.from ? new Date(dateRange.from) : this.getStartOfDay();
    const to = dateRange.to ? new Date(dateRange.to) : new Date();

    const calls = await this.callLogRepository.find({
      where: { createdAt: Between(from, to) },
    });

    const abandoned = calls.filter(c => 
      ['NO ANSWER', 'CANCEL', 'CONGESTION'].includes(c.disposition || '')
    );

    return {
      total: abandoned.length,
      abandonedCalls: abandoned.map(c => ({
        id: c.id,
        uniqueId: c.asteriskUniqueId,
        callerNumber: c.createdBy,
        disposition: c.disposition,
        createdAt: c.createdAt,
      })),
      abandonRate: calls.length > 0 ? Math.round((abandoned.length / calls.length) * 100) : 0,
      period: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  private getStartOfDay(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
}
