import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AriEvent } from './entities/ari-event.entity';

export interface AriEventWriteOpts {
  event: string;
  channelId?: string | null;
  payload?: Record<string, unknown> | null;
  raw?: string | null;
}

@Injectable()
export class AriEventStoreService {
  constructor(@InjectRepository(AriEvent) private readonly repo: Repository<AriEvent>) {}

  async write(opts: AriEventWriteOpts) {
    const row = this.repo.create({
      event: opts.event,
      channelId: opts.channelId ?? null,
      payload: opts.payload ?? null,
      raw: opts.raw ?? null,
    });
    return this.repo.save(row);
  }

  async recent(limit = 100) {
    return this.repo.createQueryBuilder('e').orderBy('e.createdAt', 'DESC').limit(limit).getMany();
  }
}
