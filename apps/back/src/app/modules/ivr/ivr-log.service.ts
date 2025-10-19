import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IvrLog, IvrLogEvent } from './entities/ivr-log.entity';

export interface LogOptions {
  channelId: string;
  caller?: string | null;
  nodeId?: string | null;
  nodeName?: string | null;
  event: IvrLogEvent;
  digit?: string | null;
  meta?: Record<string, unknown> | null;
}

@Injectable()
export class IvrLogService {
  constructor(@InjectRepository(IvrLog) private readonly repo: Repository<IvrLog>) {}

  async write(opts: LogOptions) {
    const row = this.repo.create({
      channelId: opts.channelId,
      caller: opts.caller ?? null,
      nodeId: opts.nodeId ?? null,
  nodeName: opts.nodeName ?? null,
      event: opts.event,
      digit: opts.digit ?? null,
      meta: opts.meta ?? null,
    });
    return this.repo.save(row);
  }

  async getLogsSince(since: Date) {
    return this.repo.createQueryBuilder('log')
      .where('log.createdAt >= :since', { since: since.toISOString() })
      .getMany();
  }
}
