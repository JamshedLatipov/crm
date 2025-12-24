import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueMember } from '../calls/entities/queue-member.entity';
import { Queue } from '../calls/entities/queue.entity';
import { RedisQueueStatusService, QueueStatusData } from '../ami/redis-queue-status.service';

export type OperatorStatus = {
  id: string;
  name: string;
  status: 'idle' | 'on_call' | 'wrap_up' | 'offline';
  currentCall?: string | null;
  avgHandleTime?: number | null;
  paused?: boolean;
  queueName?: string;
  updatedAt?: number;
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
    private readonly redisStatus: RedisQueueStatusService,
  ) {}

  /**
   * Get operators from Redis with fallback to database
   * Operators stored in Redis are real-time, DB provides persistent config
   */
  async getOperatorsSnapshot(): Promise<OperatorStatus[]> {
    try {
      // First try to get from Redis (real-time status)
      const redisOperators = await this.redisStatus.getAllOperators();
      
      if (redisOperators.length > 0) {
        return redisOperators.map((op) => ({
          id: op.memberId,
          name: op.memberName,
          status: this.mapRedisStatusToOperatorStatus(op.status),
          currentCall: op.currentCallId || null,
          avgHandleTime: null,
          paused: op.paused,
          queueName: op.queueName,
          updatedAt: op.updatedAt,
        }));
      }

      // Fallback to database if Redis is empty
      const members = await this.membersRepo.find();
      return members.map((m) => ({
        id: m.member_name || '',
        name: m.memberid || m.member_name || '',
        status: m.paused ? 'offline' : 'idle',
        currentCall: null,
        avgHandleTime: null,
        paused: m.paused,
        queueName: m.queue_name,
      }));
    } catch (e) {
      // If Redis fails, fallback to database
      const members = await this.membersRepo.find();
      return members.map((m) => ({
        id: m.member_name || '',
        name: m.memberid || m.member_name || '',
        status: m.paused ? 'offline' : 'idle',
        currentCall: null,
        avgHandleTime: null,
        paused: m.paused,
        queueName: m.queue_name,
      }));
    }
  }

  /**
   * Get operators for specific queue from Redis
   */
  async getQueueOperators(queueName: string): Promise<OperatorStatus[]> {
    try {
      const redisOperators = await this.redisStatus.getQueueOperators(queueName);
      
      return redisOperators.map((op) => ({
        id: op.memberId,
        name: op.memberName,
        status: this.mapRedisStatusToOperatorStatus(op.status),
        currentCall: op.currentCallId || null,
        avgHandleTime: null,
        paused: op.paused,
        queueName: op.queueName,
        updatedAt: op.updatedAt,
      }));
    } catch (e) {
      // Fallback to database
      const members = await this.membersRepo.find({ where: { queue_name: queueName } });
      return members.map((m) => ({
        id: m.member_name || '',
        name: m.memberid || m.member_name || '',
        status: m.paused ? 'offline' : 'idle',
        currentCall: null,
        avgHandleTime: null,
        paused: m.paused,
        queueName: m.queue_name,
      }));
    }
  }

  /**
   * Get queues status from Redis with queue config from database
   */
  async getQueuesSnapshot(): Promise<QueueStatus[]> {
    try {
      // Get queue configs from DB
      const queues = await this.queueRepo.find();
      
      // Get status from Redis
      const queueStatuses = await this.redisStatus.getAllQueuesStatus();
      const statusMap = new Map(queueStatuses.map((q) => [q.queueName, q]));

      return queues.map((q) => {
        const redisStatus = statusMap.get(q.name);
        return {
          id: String(q.id),
          name: q.name,
          waiting: redisStatus?.callsWaiting || 0,
          longestWaitingSeconds: redisStatus?.longestWaitTime || 0,
          callsInService: redisStatus?.activeMembers || 0,
        } as QueueStatus;
      });
    } catch (e) {
      // Fallback to database only
      const queues = await this.queueRepo.find();
      const members = await this.membersRepo.find();
      
      return queues.map((q) => {
        const qm = members.filter((m) => m.queue_name === q.name);
        const callsInService = qm.filter((m) => !m.paused).length;
        return {
          id: String(q.id),
          name: q.name,
          waiting: 0,
          longestWaitingSeconds: 0,
          callsInService,
        } as QueueStatus;
      });
    }
  }

  /**
   * Get status for a specific queue
   */
  async getQueueStatus(queueName: string): Promise<QueueStatus | null> {
    try {
      const redisStatus = await this.redisStatus.getQueueStatus(queueName);
      if (redisStatus) {
        return {
          id: redisStatus.queueName,
          name: redisStatus.queueName,
          waiting: redisStatus.callsWaiting || 0,
          longestWaitingSeconds: redisStatus.longestWaitTime || 0,
          callsInService: redisStatus.activeMembers || 0,
        };
      }

      // Fallback to database
      const queue = await this.queueRepo.findOne({ where: { name: queueName } });
      if (!queue) return null;

      const members = await this.membersRepo.find({ where: { queue_name: queueName } });
      const callsInService = members.filter((m) => !m.paused).length;

      return {
        id: String(queue.id),
        name: queue.name,
        waiting: 0,
        longestWaitingSeconds: 0,
        callsInService,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Async tick for compatibility with gateway polling
   */
  async tick() {
    const [operators, queues] = await Promise.all([
      this.getOperatorsSnapshot(),
      this.getQueuesSnapshot(),
    ]);
    
    return { operators, queues };
  }

  /**
   * Get complete dashboard data with full details
   */
  async getDashboardData() {
    const [operators, queues, channels] = await Promise.all([
      this.getOperatorsSnapshot(),
      this.getQueuesSnapshot(),
      this.redisStatus.getAllChannels(),
    ]);

    return {
      operators,
      queues,
      channels,
      timestamp: Date.now(),
    };
  }

  /**
   * Helper method to map Redis status to API status
   */
  private mapRedisStatusToOperatorStatus(redisStatus: string): 'idle' | 'on_call' | 'wrap_up' | 'offline' {
    switch (redisStatus) {
      case 'in_call':
        return 'on_call';
      case 'paused':
      case 'offline':
        return 'offline';
      case 'idle':
      default:
        return 'idle';
    }
  }
}
