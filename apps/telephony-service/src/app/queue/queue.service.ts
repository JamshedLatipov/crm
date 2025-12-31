import { Injectable, Logger } from '@nestjs/common';
import {
  QueueStatusDto,
  QueueListResponseDto,
  AddToQueueDto,
  RemoveFromQueueDto,
  PauseMemberDto,
} from '@crm/contracts';
import { AsteriskService } from '../call/asterisk.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly asteriskService: AsteriskService) {}

  async getQueues(): Promise<QueueListResponseDto> {
    const queues = await this.asteriskService.getQueues();
    
    // Transform Asterisk queue data to our DTO format
    return {
      queues: queues.map(q => ({
        name: q.name,
        strategy: q.strategy || 'ringall',
        calls: q.calls || 0,
        completed: q.completed || 0,
        abandoned: q.abandoned || 0,
        holdtime: q.holdtime || 0,
        members: (q.members || []).map((m: { interface: string; name?: string; state: string; paused: string; callsTaken: string; lastCall?: string }) => ({
          extension: m.interface,
          name: m.name,
          state: m.state,
          paused: m.paused === '1',
          callsTaken: parseInt(m.callsTaken) || 0,
          lastCall: m.lastCall,
        })),
      })),
    };
  }

  async getQueue(name: string): Promise<QueueStatusDto | null> {
    const result = await this.getQueues();
    return result.queues.find(q => q.name === name) || null;
  }

  async addMember(dto: AddToQueueDto): Promise<{ success: boolean; error?: string }> {
    return this.asteriskService.addQueueMember(
      dto.queueName,
      dto.extension,
      dto.memberName,
      dto.penalty,
    );
  }

  async removeMember(dto: RemoveFromQueueDto): Promise<{ success: boolean; error?: string }> {
    return this.asteriskService.removeQueueMember(dto.queueName, dto.extension);
  }

  async pauseMember(dto: PauseMemberDto): Promise<{ success: boolean; error?: string }> {
    return this.asteriskService.pauseQueueMember(
      dto.queueName,
      dto.extension,
      dto.paused ?? true,
      dto.reason,
    );
  }
}
