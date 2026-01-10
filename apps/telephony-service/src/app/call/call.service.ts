import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { CallLog } from './entities/call-log.entity';
import {
  CallLogFilterDto,
  UpdateCallLogDto,
  OriginateCallDto,
  CallLogResponseDto,
  CallLogListResponseDto,
  CallStatsDto,
  SERVICES,
  CALL_EVENTS,
} from '@crm/contracts';
import { AsteriskService } from './asterisk.service';

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);

  constructor(
    @InjectRepository(CallLog)
    private readonly callLogRepository: Repository<CallLog>,
    @Inject(SERVICES.NOTIFICATION)
    private readonly notificationClient: ClientProxy,
    private readonly asteriskService: AsteriskService,
  ) {}

  async findAll(filter: CallLogFilterDto): Promise<CallLogListResponseDto> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.callLogRepository.createQueryBuilder('call');

    if (filter.status) {
      queryBuilder.andWhere('call.status = :status', { status: filter.status });
    }

    if (filter.callerNumber) {
      queryBuilder.andWhere('call.clientCallId ILIKE :caller', { caller: `%${filter.callerNumber}%` });
    }

    if (filter.userId) {
      queryBuilder.andWhere('call.createdBy = :userId', { userId: filter.userId });
    }

    if (filter.fromDate) {
      queryBuilder.andWhere('call.createdAt >= :fromDate', { fromDate: new Date(filter.fromDate) });
    }

    if (filter.toDate) {
      queryBuilder.andWhere('call.createdAt <= :toDate', { toDate: new Date(filter.toDate) });
    }

    if (filter.minDuration !== undefined) {
      queryBuilder.andWhere('call.duration >= :minDuration', { minDuration: filter.minDuration });
    }

    if (filter.maxDuration !== undefined) {
      queryBuilder.andWhere('call.duration <= :maxDuration', { maxDuration: filter.maxDuration });
    }

    queryBuilder.orderBy('call.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map(call => this.toResponseDto(call)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: string): Promise<CallLogResponseDto> {
    const call = await this.callLogRepository.findOne({ where: { id } });
    if (!call) {
      throw new NotFoundException(`Call log with ID ${id} not found`);
    }
    return this.toResponseDto(call);
  }

  async findByUniqueId(uniqueId: string): Promise<CallLogResponseDto | null> {
    const call = await this.callLogRepository.findOne({ where: { asteriskUniqueId: uniqueId } });
    return call ? this.toResponseDto(call) : null;
  }

  async update(id: string, dto: UpdateCallLogDto): Promise<CallLogResponseDto> {
    const call = await this.callLogRepository.findOne({ where: { id } });
    if (!call) {
      throw new NotFoundException(`Call log with ID ${id} not found`);
    }

    if (dto.note !== undefined) call.note = dto.note;
    if (dto.disposition !== undefined) call.disposition = dto.disposition;
    if (dto.scriptBranch !== undefined) call.scriptBranch = dto.scriptBranch;

    await this.callLogRepository.save(call);
    return this.toResponseDto(call);
  }

  async originate(dto: OriginateCallDto): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      const result = await this.asteriskService.originate(dto.from, dto.to, dto.callerId, dto.variables);
      
      if (result.success) {
        // Create call log entry
        const callLog = this.callLogRepository.create({
          clientCallId: dto.to,
          createdBy: dto.from,
          callType: 'outbound',
          status: 'ringing',
        });
        const saved = await this.callLogRepository.save(callLog);

        // Emit event
        this.emitEvent(CALL_EVENTS.STARTED, {
          callId: saved.id,
          direction: 'outbound',
          callerNumber: dto.from,
          calledNumber: dto.to,
        });

        return { success: true, callId: saved.id };
      }

      return { success: false, error: result.error };
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to originate call: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async hangup(channelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.asteriskService.hangup(channelId);
      return result;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to hangup call: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async transfer(
    channelId: string,
    target: string,
    type: 'blind' | 'attended' = 'blind',
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.asteriskService.transfer(channelId, target, type);
      if (result.success) {
        this.emitEvent(CALL_EVENTS.TRANSFERRED, {
          channelId,
          target,
          type,
        });
      }
      return result;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to transfer call: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getCallTrace(id: string): Promise<any> {
    const call = await this.callLogRepository.findOne({ where: { id } });
    if (!call) {
      throw new NotFoundException(`Call log with ID ${id} not found`);
    }
    
    // Return a trace object with call lifecycle data
    return {
      id: call.id,
      uniqueId: call.asteriskUniqueId,
      callType: call.callType,
      status: call.status,
      disposition: call.disposition,
      duration: call.duration,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
      events: [], // TODO: Integrate with CDR/CEL for actual events
    };
  }

  async getStats(fromDate?: Date, toDate?: Date): Promise<CallStatsDto> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const from = fromDate || startOfDay;
    const to = toDate || now;

    const calls = await this.callLogRepository.find({
      where: {
        createdAt: Between(from, to),
      },
    });

    const answered = calls.filter(c => c.disposition === 'ANSWERED').length;
    const missed = calls.filter(c => ['NO ANSWER', 'BUSY', 'CONGESTION'].includes(c.disposition)).length;
    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

    const inbound = calls.filter(c => c.callType === 'inbound').length;
    const outbound = calls.filter(c => c.callType === 'outbound').length;

    // Group by hour
    const byHour: { hour: number; count: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const count = calls.filter(c => new Date(c.createdAt).getHours() === i).length;
      byHour.push({ hour: i, count });
    }

    // Group by day (last 7 days)
    const byDay: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split('T')[0] || '';
      const count = calls.filter(c => 
        new Date(c.createdAt).toISOString().split('T')[0] === dayStr
      ).length;
      byDay.push({ day: dayStr, count });
    }

    return {
      total: calls.length,
      answered,
      missed,
      avgDuration,
      avgWaitTime: 0, // TODO: Calculate from queue data
      inbound,
      outbound,
      byHour,
      byDay,
    };
  }

  private toResponseDto(call: CallLog): CallLogResponseDto {
    return {
      id: call.id,
      uniqueId: call.asteriskUniqueId,
      callType: call.callType,
      status: call.status as any,
      duration: call.duration,
      disposition: call.disposition,
      note: call.note,
      scriptBranch: call.scriptBranch,
      userId: call.createdBy,
      createdAt: call.createdAt.toISOString(),
      updatedAt: call.updatedAt?.toISOString(),
    };
  }

  private emitEvent(event: string, payload: Record<string, unknown>): void {
    try {
      this.notificationClient.emit(event, {
        event,
        timestamp: new Date().toISOString(),
        payload,
      });
    } catch (err) {
      const error = err as Error;
      this.logger.warn(`Failed to emit event ${event}: ${error.message}`);
    }
  }
}
