import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueMember } from '../calls/entities/queue-member.entity';
import { Queue } from '../calls/entities/queue.entity';

export type OperatorStatus = {
  id: string;
  name: string;
  status: 'idle' | 'on_call' | 'wrap_up' | 'offline';
  currentCall?: string | null;
  avgHandleTime?: number | null;
};

export type QueueStatus = {
  id: string;
  name: string;
  waiting: number;
  longestWaitingSeconds: number;
  callsInService: number;
};

@Injectable()
export class ContactCenterService {
  constructor(
    @InjectRepository(QueueMember) private readonly membersRepo: Repository<QueueMember>,
    @InjectRepository(Queue) private readonly queueRepo: Repository<Queue>,
  ) {}

  // Return operators based on queue_members table. Fields are best-effort mappings.
  async getOperatorsSnapshot(): Promise<OperatorStatus[]> {
    const members = await this.membersRepo.find();
    return members.map((m) => ({
      id: m.member_name,
      name: m.memberid || m.member_name,
      status: m.paused ? 'offline' : 'idle',
      currentCall: null,
      avgHandleTime: null,
    }));
  }

  // Return queues with basic derived statistics: number of available agents and total members.
  async getQueuesSnapshot(): Promise<QueueStatus[]> {
    const queues = await this.queueRepo.find();
    const members = await this.membersRepo.find();
    return queues.map((q) => {
      const qm = members.filter((m) => m.queue_name === q.name);
      const callsInService = qm.filter((m) => !m.paused).length;
      // waiting / longestWaitingSeconds are not tracked here — set to 0 as placeholder
      return {
        id: String(q.id),
        name: q.name,
        waiting: 0,
        longestWaitingSeconds: 0,
        callsInService,
      } as QueueStatus;
    });
  }

  // For compatibility with the gateway polling logic, provide an async tick that returns current snapshots.
  async tick() {
    const operators = await this.getOperatorsSnapshot();
    const queues = await this.getQueuesSnapshot();
    return { operators, queues };
  }
}
