import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueMember } from '../calls/entities/queue-member.entity';
import { Queue } from '../calls/entities/queue.entity';
import { RedisQueueStatusService } from './redis-queue-status.service';

/**
 * Сервис для синхронизации данных из БД в Redis при старте приложения.
 * Это обеспечивает, что Redis содержит актуальные данные,
 * даже если нет AMI событий (например, при перезагрузке приложения).
 */
@Injectable()
export class QueueDataSyncService implements OnModuleInit {
  private readonly logger = new Logger(QueueDataSyncService.name);

  constructor(
    @InjectRepository(QueueMember) private readonly membersRepo: Repository<QueueMember>,
    @InjectRepository(Queue) private readonly queueRepo: Repository<Queue>,
    private readonly redisStatus: RedisQueueStatusService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting queue data synchronization from DB to Redis');
    try {
      await this.syncQueueMembers();
      await this.syncQueues();
      this.logger.log('Queue data synchronization completed successfully');
    } catch (e) {
      this.logger.error(`Queue data synchronization failed: ${(e as Error).message}`);
      // Don't throw - allow the app to start even if sync fails
      // AMI events will update Redis data as they arrive
    }
  }

  /**
   * Sync queue members from DB to Redis
   * Each queue member becomes an operator in Redis
   */
  private async syncQueueMembers(): Promise<void> {
    try {
      const members = await this.membersRepo.find();
      this.logger.log(`Syncing ${members.length} queue members to Redis`);

      for (const member of members) {
        try {
          await this.redisStatus.setOperatorStatus({
            memberId: member.member_name || `${member.id}`,
            memberName: member.member_name || `${member.id}`,
            queueName: member.queue_name,
            paused: member.paused || false,
            status: member.paused ? 'paused' : 'idle',
            updatedAt: Date.now(),
          });
        } catch (e) {
          this.logger.warn(`Failed to sync member ${member.member_name}: ${(e as Error).message}`);
        }
      }

      this.logger.log(`Successfully synced ${members.length} queue members`);
    } catch (e) {
      this.logger.error(`Failed to sync queue members: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Sync queue configurations from DB to Redis
   * Calculate initial stats based on member counts
   */
  private async syncQueues(): Promise<void> {
    try {
      const queues = await this.queueRepo.find();
      const members = await this.membersRepo.find();

      this.logger.log(`Syncing ${queues.length} queues to Redis`);

      for (const queue of queues) {
        try {
          const queueMembers = members.filter((m) => m.queue_name === queue.name);
          const activeMembers = queueMembers.filter((m) => !m.paused).length;

          await this.redisStatus.setQueueStatus({
            queueName: queue.name,
            totalMembers: queueMembers.length,
            activeMembers,
            callsWaiting: 0, // Will be updated by QueueCallerJoin events
            updatedAt: Date.now(),
          });
        } catch (e) {
          this.logger.warn(`Failed to sync queue ${queue.name}: ${(e as Error).message}`);
        }
      }

      this.logger.log(`Successfully synced ${queues.length} queues`);
    } catch (e) {
      this.logger.error(`Failed to sync queues: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Manual trigger to resync all data
   * Useful for debugging or after data inconsistencies
   */
  async resyncAll(): Promise<void> {
    this.logger.log('Manual resync triggered');
    
    // Clear existing data
    await this.redisStatus.clearAll();
    
    // Resync everything
    await this.syncQueueMembers();
    await this.syncQueues();
    
    this.logger.log('Manual resync completed');
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<{
    dbMembers: number;
    dbQueues: number;
    redisOperators: number;
    redisQueues: number;
    redisChannels: number;
  }> {
    const [dbMembers, dbQueues, redisOperators, redisQueues, redisChannels] = await Promise.all([
      this.membersRepo.count(),
      this.queueRepo.count(),
      this.redisStatus.getAllOperators().then((ops) => ops.length),
      this.redisStatus.getAllQueuesStatus().then((queues) => queues.length),
      this.redisStatus.getAllChannels().then((channels) => channels.length),
    ]);

    return {
      dbMembers,
      dbQueues,
      redisOperators,
      redisQueues,
      redisChannels,
    };
  }
}
