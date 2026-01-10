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

  async createQueue(data: { name: string; strategy?: string }): Promise<{ success: boolean; error?: string }> {
    // Queue creation typically requires Asterisk config reload
    // For dynamic queues, we can use AMI to add queue
    this.logger.log(`Creating queue: ${data.name}`);
    // TODO: Implement actual queue creation via AMI/config
    return { success: true };
  }

  async updateQueue(name: string, data: { strategy?: string }): Promise<{ success: boolean; error?: string }> {
    this.logger.log(`Updating queue: ${name}`);
    // TODO: Implement actual queue update
    return { success: true };
  }

  async deleteQueue(name: string): Promise<{ success: boolean; error?: string }> {
    this.logger.log(`Deleting queue: ${name}`);
    // TODO: Implement actual queue deletion
    return { success: true };
  }

  async getQueueMembers(queueName: string): Promise<any[]> {
    const queue = await this.getQueue(queueName);
    return queue?.members || [];
  }

  async getQueueMember(queueName: string, extension: string): Promise<any | null> {
    const members = await this.getQueueMembers(queueName);
    return members.find(m => m.extension === extension) || null;
  }

  async getMyQueueState(userId: string): Promise<any> {
    // Get all queues and find member state for this user's extension
    const result = await this.getQueues();
    const states: Array<{ queueName: string; paused: boolean; callsTaken: number }> = [];
    
    for (const queue of result.queues) {
      const member = queue.members?.find(m => m.extension?.includes(userId));
      if (member) {
        states.push({
          queueName: queue.name,
          paused: member.paused,
          callsTaken: member.callsTaken,
        });
      }
    }
    
    return { userId, states };
  }

  async updateQueueMember(
    queueName: string,
    extension: string,
    data: { penalty?: number },
  ): Promise<{ success: boolean; error?: string }> {
    this.logger.log(`Updating member ${extension} in queue ${queueName}`);
    // TODO: Implement via AMI
    return { success: true };
  }
}
