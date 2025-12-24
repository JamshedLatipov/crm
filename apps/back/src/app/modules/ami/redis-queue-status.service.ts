import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';

export interface OperatorStatusData {
  memberId: string;
  memberName: string;
  queueName: string;
  paused: boolean;
  status: 'idle' | 'in_call' | 'paused' | 'offline';
  // current call identifiers
  currentCallId?: string; // legacy / main (channel or id)
  currentChannel?: string; // channel name e.g. SIP/2001-00000001
  currentUniqueId?: string; // uniqueid from Asterisk
  pausedReason?: string;
  lastLogin?: number;
  lastLogout?: number;
  updatedAt: number; // timestamp
  wrapUpTime?: number; // seconds remaining
}

export interface ChannelStatusData {
  channelId: string;
  channelName: string;
  state: 'down' | 'reserved' | 'off_hook' | 'dialing' | 'ring' | 'up' | 'busy';
  extension?: string;
  context?: string;
  priority?: number;
  updatedAt: number;
  callDuration?: number; // seconds
}

export interface QueueStatusData {
  queueName: string;
  totalMembers: number;
  activeMembers: number;
  callsWaiting: number;
  longestWaitTime?: number; // seconds
  updatedAt: number;
}

@Injectable()
export class RedisQueueStatusService {
  private readonly logger = new Logger(RedisQueueStatusService.name);
  private readonly OPERATOR_KEY_PREFIX = 'queue:operator:';
  private readonly CHANNEL_KEY_PREFIX = 'channel:';
  private readonly QUEUE_KEY_PREFIX = 'queue:status:';
  private readonly OPERATOR_INDEX_KEY = 'queue:operators:all';
  private readonly CHANNEL_INDEX_KEY = 'channels:all';
  private readonly QUEUE_INDEX_KEY = 'queues:all';
  private readonly TTL = 3600; // 1 hour

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClientType) {}

  // ============= Operator Status Methods =============

  /**
   * Store operator status in Redis
   * Key: queue:operator:{memberId}
   */
  async setOperatorStatus(operatorData: OperatorStatusData): Promise<void> {
    try {
      const key = `${this.OPERATOR_KEY_PREFIX}${operatorData.memberId}`;
      const data = JSON.stringify(operatorData);
      
      // Fetch previous value BEFORE saving to log diffs
      let prevRaw: string | null = null;
      try {
        prevRaw = await this.redis.get(key);
      } catch (e) {
        // Ignore errors when fetching previous value
      }
      
      // Store with TTL and add to index
      await Promise.all([
        this.redis.setEx(key, this.TTL, data),
        this.redis.sAdd(this.OPERATOR_INDEX_KEY, operatorData.memberId),
      ]);
      
      // Log changes
      try {
        if (prevRaw) {
          const prev = JSON.parse(prevRaw) as OperatorStatusData;
          const diffs: string[] = [];
          if (prev.status !== operatorData.status) diffs.push(`status:${prev.status}->${operatorData.status}`);
          if (prev.paused !== operatorData.paused) diffs.push(`paused:${prev.paused}->${operatorData.paused}`);
          if (prev.currentChannel !== operatorData.currentChannel) diffs.push(`currentChannel:${prev.currentChannel}->${operatorData.currentChannel}`);
          if (prev.currentUniqueId !== operatorData.currentUniqueId) diffs.push(`currentUniqueId:${prev.currentUniqueId}->${operatorData.currentUniqueId}`);
          if (diffs.length > 0) this.logger.debug(`Operator ${operatorData.memberId} updated: ${diffs.join(', ')}`);
        } else {
          this.logger.debug(`Operator status set: ${operatorData.memberId} -> ${operatorData.status} (paused=${operatorData.paused})`);
        }
      } catch (e) {
        this.logger.debug(`Operator status update saved for ${operatorData.memberId}`);
      }
    } catch (e) {
      this.logger.error(`Failed to set operator status: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Get operator status from Redis
   */
  async getOperatorStatus(memberId: string): Promise<OperatorStatusData | null> {
    try {
      const key = `${this.OPERATOR_KEY_PREFIX}${memberId}`;
      const data = await this.redis.get(key);
      
      if (!data) return null;
      
      return JSON.parse(data) as OperatorStatusData;
    } catch (e) {
      this.logger.error(`Failed to get operator status: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Get all operators for a specific queue
   */
  async getQueueOperators(queueName: string): Promise<OperatorStatusData[]> {
    try {
      const memberIds = await this.redis.sMembers(this.OPERATOR_INDEX_KEY);
      const operators: OperatorStatusData[] = [];

      for (const memberId of memberIds) {
        const status = await this.getOperatorStatus(memberId);
        if (status && status.queueName === queueName) {
          operators.push(status);
        }
      }

      return operators;
    } catch (e) {
      this.logger.error(`Failed to get queue operators: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * Get all operators across all queues
   */
  async getAllOperators(): Promise<OperatorStatusData[]> {
    try {
      const memberIds = await this.redis.sMembers(this.OPERATOR_INDEX_KEY);
      const operators: OperatorStatusData[] = [];

      for (const memberId of memberIds) {
        const status = await this.getOperatorStatus(memberId);
        if (status) {
          operators.push(status);
        }
      }

      return operators;
    } catch (e) {
      this.logger.error(`Failed to get all operators: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * Update operator paused status
   */
  async updateOperatorPausedStatus(memberId: string, paused: boolean, reason?: string): Promise<void> {
    try {
      const status = await this.getOperatorStatus(memberId);
      if (!status) {
        this.logger.warn(`Operator ${memberId} not found when updating paused status`);
        return;
      }

      const newStatus: 'idle' | 'in_call' | 'paused' | 'offline' = paused ? 'paused' : 'idle';
      const updated: OperatorStatusData = {
        ...status,
        paused,
        status: newStatus,
        pausedReason: paused ? reason : undefined,
        updatedAt: Date.now(),
      };

      await this.setOperatorStatus(updated);
    } catch (e) {
      this.logger.error(`Failed to update operator paused status: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Record operator login time and set status to idle (unless paused)
   */
  async setOperatorLogin(memberId: string, at?: number): Promise<void> {
    try {
      const status = await this.getOperatorStatus(memberId);
      const now = at ?? Date.now();
      const base: OperatorStatusData = status ?? {
        memberId,
        memberName: memberId,
        queueName: '',
        paused: false,
        status: 'idle',
        updatedAt: now,
      };

      const updated: OperatorStatusData = {
        ...base,
        lastLogin: now,
        // If operator was paused keep paused, otherwise idle
        status: base.paused ? 'paused' : 'idle',
        updatedAt: now,
      };

      await this.setOperatorStatus(updated);
    } catch (e) {
      this.logger.error(`Failed to set operator login: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Record operator logout time and set status to offline
   */
  async setOperatorLogout(memberId: string, at?: number): Promise<void> {
    try {
      const status = await this.getOperatorStatus(memberId);
      const now = at ?? Date.now();
      const base: OperatorStatusData = status ?? {
        memberId,
        memberName: memberId,
        queueName: '',
        paused: false,
        status: 'offline',
        updatedAt: now,
      };

      const updated: OperatorStatusData = {
        ...base,
        lastLogout: now,
        status: 'offline',
        currentCallId: undefined,
        currentChannel: undefined,
        currentUniqueId: undefined,
        updatedAt: now,
      };

      await this.setOperatorStatus(updated);
    } catch (e) {
      this.logger.error(`Failed to set operator logout: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Set operator status to in_call when answering a call
   */
  async setOperatorInCall(
    memberId: string,
    callId: string,
    channel?: string,
    uniqueId?: string
  ): Promise<void> {
    try {
      const status = await this.getOperatorStatus(memberId);
      if (!status) {
        this.logger.warn(`Operator ${memberId} not found when setting in_call status`);
        return;
      }

      const updated: OperatorStatusData = {
        ...status,
        status: 'in_call',
        currentCallId: callId,
        currentChannel: channel,
        currentUniqueId: uniqueId,
        updatedAt: Date.now(),
      };

      await this.setOperatorStatus(updated);
    } catch (e) {
      this.logger.error(`Failed to set operator in call: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Clear call info and set operator status back to idle (or paused if paused)
   */
  async clearOperatorCall(memberId: string): Promise<void> {
    try {
      const status = await this.getOperatorStatus(memberId);
      if (!status) {
        this.logger.warn(`Operator ${memberId} not found when clearing call`);
        return;
      }

      const updated: OperatorStatusData = {
        ...status,
        status: status.paused ? 'paused' : 'idle',
        currentCallId: undefined,
        currentChannel: undefined,
        currentUniqueId: undefined,
        updatedAt: Date.now(),
      };

      await this.setOperatorStatus(updated);
    } catch (e) {
      this.logger.error(`Failed to clear operator call: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Remove operator status when leaving queue
   */
  async removeOperatorStatus(memberId: string): Promise<void> {
    try {
      const key = `${this.OPERATOR_KEY_PREFIX}${memberId}`;
      await Promise.all([
        this.redis.del(key),
        this.redis.sRem(this.OPERATOR_INDEX_KEY, memberId),
      ]);
      
      this.logger.debug(`Operator removed: ${memberId}`);
    } catch (e) {
      this.logger.error(`Failed to remove operator status: ${(e as Error).message}`);
      throw e;
    }
  }

  // ============= Channel Status Methods =============

  /**
   * Store channel status in Redis
   * Key: channel:{channelId}
   */
  async setChannelStatus(channelData: ChannelStatusData): Promise<void> {
    try {
      const key = `${this.CHANNEL_KEY_PREFIX}${channelData.channelId}`;
      const data = JSON.stringify(channelData);

      // Store with TTL and add to index
      await Promise.all([
        this.redis.setEx(key, this.TTL, data),
        this.redis.sAdd(this.CHANNEL_INDEX_KEY, channelData.channelId),
      ]);

      this.logger.debug(`Channel status updated: ${channelData.channelId}`);
    } catch (e) {
      this.logger.error(`Failed to set channel status: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Get channel status from Redis
   */
  async getChannelStatus(channelId: string): Promise<ChannelStatusData | null> {
    try {
      const key = `${this.CHANNEL_KEY_PREFIX}${channelId}`;
      const data = await this.redis.get(key);

      if (!data) return null;

      return JSON.parse(data) as ChannelStatusData;
    } catch (e) {
      this.logger.error(`Failed to get channel status: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Get all active channels
   */
  async getAllChannels(): Promise<ChannelStatusData[]> {
    try {
      const channelIds = await this.redis.sMembers(this.CHANNEL_INDEX_KEY);
      const channels: ChannelStatusData[] = [];

      for (const channelId of channelIds) {
        const status = await this.getChannelStatus(channelId);
        if (status) {
          channels.push(status);
        }
      }

      return channels;
    } catch (e) {
      this.logger.error(`Failed to get all channels: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * Remove channel status when channel is destroyed
   */
  async removeChannelStatus(channelId: string): Promise<void> {
    try {
      const key = `${this.CHANNEL_KEY_PREFIX}${channelId}`;
      await Promise.all([
        this.redis.del(key),
        this.redis.sRem(this.CHANNEL_INDEX_KEY, channelId),
      ]);

      this.logger.debug(`Channel removed: ${channelId}`);
    } catch (e) {
      this.logger.error(`Failed to remove channel status: ${(e as Error).message}`);
      throw e;
    }
  }

  // ============= Queue Status Methods =============

  /**
   * Store queue overall status in Redis
   * Key: queue:status:{queueName}
   */
  async setQueueStatus(queueData: QueueStatusData): Promise<void> {
    try {
      const key = `${this.QUEUE_KEY_PREFIX}${queueData.queueName}`;
      const data = JSON.stringify(queueData);

      // Store with TTL and add to index
      await Promise.all([
        this.redis.setEx(key, this.TTL, data),
        this.redis.sAdd(this.QUEUE_INDEX_KEY, queueData.queueName),
      ]);

      this.logger.debug(`Queue status updated: ${queueData.queueName}`);
    } catch (e) {
      this.logger.error(`Failed to set queue status: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Get queue status from Redis
   */
  async getQueueStatus(queueName: string): Promise<QueueStatusData | null> {
    try {
      const key = `${this.QUEUE_KEY_PREFIX}${queueName}`;
      const data = await this.redis.get(key);

      if (!data) return null;

      return JSON.parse(data) as QueueStatusData;
    } catch (e) {
      this.logger.error(`Failed to get queue status: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Get all queues status
   */
  async getAllQueuesStatus(): Promise<QueueStatusData[]> {
    try {
      const queueNames = await this.redis.sMembers(this.QUEUE_INDEX_KEY);
      const queues: QueueStatusData[] = [];

      for (const queueName of queueNames) {
        const status = await this.getQueueStatus(queueName);
        if (status) {
          queues.push(status);
        }
      }

      return queues;
    } catch (e) {
      this.logger.error(`Failed to get all queues status: ${(e as Error).message}`);
      return [];
    }
  }

  // ============= Helper Methods =============

  /**
   * Get complete dashboard snapshot: all queues, operators, and channels
   */
  async getFullSnapshot() {
    try {
      const [operators, channels, queues] = await Promise.all([
        this.getAllOperators(),
        this.getAllChannels(),
        this.getAllQueuesStatus(),
      ]);

      return {
        operators,
        channels,
        queues,
        timestamp: Date.now(),
      };
    } catch (e) {
      this.logger.error(`Failed to get full snapshot: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Clear all status data (for testing or reset)
   */
  async clearAll(): Promise<void> {
    try {
      const [operatorIds, channelIds, queueNames] = await Promise.all([
        this.redis.sMembers(this.OPERATOR_INDEX_KEY),
        this.redis.sMembers(this.CHANNEL_INDEX_KEY),
        this.redis.sMembers(this.QUEUE_INDEX_KEY),
      ]);

      const keysToDelete = [
        ...operatorIds.map((id) => `${this.OPERATOR_KEY_PREFIX}${id}`),
        ...channelIds.map((id) => `${this.CHANNEL_KEY_PREFIX}${id}`),
        ...queueNames.map((name) => `${this.QUEUE_KEY_PREFIX}${name}`),
        this.OPERATOR_INDEX_KEY,
        this.CHANNEL_INDEX_KEY,
        this.QUEUE_INDEX_KEY,
      ];

      if (keysToDelete.length > 0) {
        await this.redis.del(keysToDelete);
      }

      this.logger.log('All queue status data cleared from Redis');
    } catch (e) {
      this.logger.error(`Failed to clear all data: ${(e as Error).message}`);
      throw e;
    }
  }
}
