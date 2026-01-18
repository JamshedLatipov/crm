import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoOrder, StoOrderZone, ZONE_NUMBER_RANGES } from '@libs/shared/sto-types';

@Injectable()
export class QueueManagerService {
  constructor(
    @InjectRepository(StoOrder)
    private ordersRepository: Repository<StoOrder>,
  ) {}

  async assignQueueNumber(order: StoOrder): Promise<{ queueNumber: number; queueNumberInZone: number }> {
    const zoneRange = ZONE_NUMBER_RANGES[order.zone];
    if (!zoneRange) {
      throw new BadRequestException(`Invalid zone: ${order.zone}`);
    }

    // Get the maximum queue number in zone for today
    const result = await this.ordersRepository
      .createQueryBuilder('order')
      .select('MAX(order.queueNumberInZone)', 'maxNumber')
      .where('order.zone = :zone', { zone: order.zone })
      .andWhere('DATE(order.createdAt) = CURRENT_DATE')
      .getRawOne();

    const maxNumber = result?.maxNumber || 0;
    const nextNumberInZone = maxNumber + 1;

    // Check if we've exceeded the zone limit
    const maxAllowed = zoneRange.end - zoneRange.start + 1;
    if (nextNumberInZone > maxAllowed) {
      throw new BadRequestException(
        `Queue limit exceeded for zone ${order.zone}. Maximum ${maxAllowed} orders per day.`
      );
    }

    // Calculate global queue number
    const queueNumber = zoneRange.start + nextNumberInZone - 1;

    return {
      queueNumber,
      queueNumberInZone: nextNumberInZone,
    };
  }

  async resetDailyCounters(): Promise<void> {
    // This will be called by a cron job at midnight
    // Since we're using DATE(createdAt) = CURRENT_DATE in queries,
    // no manual reset is needed. Old orders are automatically excluded.
    console.log('Daily queue counters reset (automatic via date filtering)');
  }

  async getQueueStats(zone?: StoOrderZone): Promise<{
    waiting: number;
    inProgress: number;
    completed: number;
    blocked: number;
    totalToday: number;
  }> {
    const query = this.ordersRepository
      .createQueryBuilder('order')
      .where('DATE(order.createdAt) = CURRENT_DATE');

    if (zone) {
      query.andWhere('order.zone = :zone', { zone });
    }

    const [waiting, inProgress, completed, blocked, totalToday] = await Promise.all([
      query.clone().andWhere('order.status = :status', { status: 'waiting' }).getCount(),
      query.clone().andWhere('order.status = :status', { status: 'in_progress' }).getCount(),
      query.clone().andWhere('order.status = :status', { status: 'completed' }).getCount(),
      query.clone().andWhere('order.status = :status', { status: 'blocked' }).getCount(),
      query.clone().getCount(),
    ]);

    return {
      waiting,
      inProgress,
      completed,
      blocked,
      totalToday,
    };
  }
}
