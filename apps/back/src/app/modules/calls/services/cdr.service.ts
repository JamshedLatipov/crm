import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Cdr } from '../entities/cdr.entity';
import { CallLog } from '../entities/call-log.entity';
import { CallScript } from '../../call-scripts/entities/call-script.entity';

export interface CdrFilterDto {
  fromDate?: string; // ISO
  toDate?: string; // ISO
  src?: string;
  dst?: string;
  disposition?: string | string[];
  minDuration?: number;
  maxDuration?: number;
  search?: string; // free text across src/dst/clid
  operatorId?: string; // derived filter by operator (channel/src/dst)
  page?: number;
  limit?: number;
}

@Injectable()
export class CdrService {
  constructor(
    @InjectRepository(Cdr) private readonly repo: Repository<Cdr>,
    @InjectRepository(CallLog) private readonly callLogRepo: Repository<CallLog>
  ) {}

  async find(filter: CdrFilterDto) {
    const where: Record<string, unknown> = {};
    if (filter.fromDate && filter.toDate) {
      where.calldate = Between(
        new Date(filter.fromDate),
        new Date(filter.toDate)
      );
    } else if (filter.fromDate) {
      where.calldate = MoreThanOrEqual(new Date(filter.fromDate));
    } else if (filter.toDate) {
      where.calldate = LessThanOrEqual(new Date(filter.toDate));
    }
    if (filter.src) where.src = filter.src;
    if (filter.dst) where.dst = filter.dst;
    if (filter.disposition) {
      if (Array.isArray(filter.disposition))
        where.disposition = In(filter.disposition);
      else where.disposition = filter.disposition;
    }
    const qb = this.repo.createQueryBuilder('c').where(where);
    // operatorId filtering (derive from channel, accountcode, or direct src/dst match)
    if (filter.operatorId) {
      qb.andWhere(
        '(c.channel ILIKE :chanPat OR c.accountcode = :opId OR c.src = :opId OR c.dst = :opId)',
        {
          chanPat: `%/${filter.operatorId}-%`,
          opId: filter.operatorId,
        }
      );
    }
    if (filter.minDuration)
      qb.andWhere('c.duration >= :minDuration', {
        minDuration: filter.minDuration,
      });
    if (filter.maxDuration)
      qb.andWhere('c.duration <= :maxDuration', {
        maxDuration: filter.maxDuration,
      });
    if (filter.search) {
      qb.andWhere('(c.src ILIKE :s OR c.dst ILIKE :s OR c.clid ILIKE :s)', {
        s: `%${filter.search}%`,
      });
    }
    qb.orderBy('c.calldate', 'DESC');
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(200, filter.limit || 50);
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(uniqueid: string) {
    return this.repo.findOne({ where: { uniqueid } });
  }

  /**
   * Persist auxiliary call log / metadata record
   */
  async createCallLog(data: Partial<CallLog>): Promise<CallLog> {
    // determine initial status: if duration/disposition provided - completed, else awaiting_cdr when call identifier present
    const status =
      typeof data.duration === 'number' || data.disposition
        ? 'completed'
        : data.clientCallId || data.callId || data.sipCallId
        ? 'awaiting_cdr'
        : 'completed';
    const now = new Date();
    const ent = this.callLogRepo.create({ ...data, status, updatedAt: now } as any);
    const saved = await this.callLogRepo.save(ent as any);
    return Array.isArray(saved) ? saved[0] : (saved as CallLog);
  }

  async listCallLog(limit = 50, offset = 0) {
    const qb = this.callLogRepo
      .createQueryBuilder('cl')
      // cast script id to text to compare with varchar scriptBranch
      .leftJoin(CallScript, 's', 'cl.scriptBranch = s.id::text')
      .orderBy('cl.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    // select entity fields and script title
    const rawAndEntities = await qb.select(['cl', 's.title']).getRawAndEntities();
    const entities = rawAndEntities.entities as CallLog[];
    const raw = rawAndEntities.raw as any[];

    // merge script title into returned records as `scriptTitle`
    return entities.map((e, i) => ({
      ...e,
      scriptTitle: raw[i]?.s_title ?? null,
    }));
  }
}
