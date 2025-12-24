import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';

export interface CallFlowEvent {
  ts: number;
  event: string;
  channel?: string;
  uniqueId?: string;
  payload?: any;
}

export interface CallMeta {
  uniqueId: string;
  startTime?: number;
  from?: string;
  to?: string;
  ivrEvents?: Array<{ type: 'enter' | 'exit'; ts: number; node?: string; durationMs?: number }>;
  queueEvents?: Array<{ type: 'join' | 'leave'; queue?: string; ts: number; waitMs?: number }>;
  agentEvents?: Array<{ agent?: string; event: 'ring' | 'answer' | 'hangup' | 'transfer'; ts: number; channel?: string; durationMs?: number; toAgent?: string }>;
  transfers?: Array<{ to?: string; at: number; by?: string }>;
  endTime?: number;
  endChannel?: string;
  endCause?: string;
}

@Injectable()
export class RedisCallFlowService {
  private readonly logger = new Logger(RedisCallFlowService.name);
  private readonly CALL_FLOW_PREFIX = 'call:flow:'; // list per unique id
  private readonly CALL_INDEX_KEY = 'calls:active';
  private readonly TTL = 24 * 60 * 60; // keep flows for 24h by default
  private readonly CALL_META_PREFIX = 'call:meta:'; // summary per call

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClientType) {}

  private keyFor(uniqueId: string) {
    return `${this.CALL_FLOW_PREFIX}${uniqueId}`;
  }

  /**
   * Append an event to the call flow list (LPUSH so newest at head). Also add call id to active set.
   */
  async appendEvent(uniqueId: string, evt: CallFlowEvent): Promise<void> {
    try {
      const key = this.keyFor(uniqueId);
      const str = JSON.stringify(evt);
      // LPUSH then set TTL and add to index
      await Promise.all([
        this.redis.lPush(key, str),
        this.redis.expire(key, this.TTL),
        this.redis.sAdd(this.CALL_INDEX_KEY, uniqueId),
      ]);

      // Also keep a short recent AMI events list for debugging/audit
      try {
        const auditKey = 'ami:events:recent';
        await this.redis.lPush(auditKey, JSON.stringify({ id: uniqueId, evt, ts: Date.now() }));
        // keep latest 1000 events
        await this.redis.lTrim(auditKey, 0, 999);
      } catch (e) {
        this.logger.debug('Failed to write audit event to Redis: ' + (e as Error).message);
      }
    } catch (e) {
      this.logger.error(`Failed to append call flow event for ${uniqueId}: ${(e as Error).message}`);
    }
  }

  /**
   * Set call meta (overwrite)
   */
  async setMeta(uniqueId: string, meta: CallMeta): Promise<void> {
    try {
      const key = `${this.CALL_META_PREFIX}${uniqueId}`;
      await Promise.all([this.redis.setEx(key, this.TTL, JSON.stringify(meta)), this.redis.sAdd(this.CALL_INDEX_KEY, uniqueId)]);
    } catch (e) {
      this.logger.error(`Failed to set call meta for ${uniqueId}: ${(e as Error).message}`);
    }
  }

  /**
   * Get call meta
   */
  async getMeta(uniqueId: string): Promise<CallMeta | null> {
    try {
      const key = `${this.CALL_META_PREFIX}${uniqueId}`;
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as CallMeta;
    } catch (e) {
      this.logger.error(`Failed to get call meta for ${uniqueId}: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Patch call meta by shallow merging or pushing to arrays via $push
   * Example: patch = { startTime: 123, $push: { queueEvents: { type:'join', ts: 123 } } }
   */
  async patchMeta(uniqueId: string, patch: Partial<CallMeta> & { $push?: Record<string, any> } ): Promise<void> {
    try {
      const current = (await this.getMeta(uniqueId)) ?? ({ uniqueId } as CallMeta);

      // handle $push
      if (patch.$push) {
        for (const key of Object.keys(patch.$push)) {
          // @ts-ignore
          current[key] = current[key] ?? [];
          // @ts-ignore
          current[key].push(patch.$push[key]);
        }
        delete patch.$push;
      }

      const merged = { ...current, ...patch } as CallMeta;
      await this.setMeta(uniqueId, merged);
    } catch (e) {
      this.logger.error(`Failed to patch call meta for ${uniqueId}: ${(e as Error).message}`);
    }
  }

  // ----- Helpers that compute durations -----
  async ivrEnter(uniqueId: string, node?: string): Promise<void> {
    const now = Date.now();
    await this.patchMeta(uniqueId, { $push: { ivrEvents: { type: 'enter', ts: now, node } } });
  }

  async ivrExit(uniqueId: string, node?: string): Promise<void> {
    const now = Date.now();
    const meta = (await this.getMeta(uniqueId)) ?? ({ uniqueId } as CallMeta);
    const ivr = meta.ivrEvents ?? [];
    // find last enter without duration
    for (let i = ivr.length - 1; i >= 0; i--) {
      if (ivr[i].type === 'enter' && !ivr[i].durationMs) {
        ivr[i].durationMs = now - (ivr[i].ts || now);
        ivr.push({ type: 'exit', ts: now, node });
        await this.setMeta(uniqueId, { ...meta, ivrEvents: ivr });
        return;
      }
    }
    // fallback: just push exit
    await this.patchMeta(uniqueId, { $push: { ivrEvents: { type: 'exit', ts: now, node } } });
  }

  async queueJoin(uniqueId: string, queue?: string): Promise<void> {
    const now = Date.now();
    await this.patchMeta(uniqueId, { $push: { queueEvents: { type: 'join', queue, ts: now } } });
  }

  async queueLeave(uniqueId: string, queue?: string): Promise<void> {
    const now = Date.now();
    const meta = (await this.getMeta(uniqueId)) ?? ({ uniqueId } as CallMeta);
    const qev = meta.queueEvents ?? [];
    for (let i = qev.length - 1; i >= 0; i--) {
      if (qev[i].type === 'join' && !qev[i].waitMs) {
        qev[i].waitMs = now - (qev[i].ts || now);
        qev.push({ type: 'leave', queue, ts: now });
        await this.setMeta(uniqueId, { ...meta, queueEvents: qev });
        return;
      }
    }
    await this.patchMeta(uniqueId, { $push: { queueEvents: { type: 'leave', queue, ts: now } } });
  }

  async agentRing(uniqueId: string, agent?: string, channel?: string): Promise<void> {
    const now = Date.now();
    await this.patchMeta(uniqueId, { $push: { agentEvents: { agent, event: 'ring', ts: now, channel } } });
  }

  async agentAnswer(uniqueId: string, agent?: string, channel?: string): Promise<void> {
    const now = Date.now();
    const meta = (await this.getMeta(uniqueId)) ?? ({ uniqueId } as CallMeta);
    const aev = meta.agentEvents ?? [];
    // find last ring for this agent without duration
    for (let i = aev.length - 1; i >= 0; i--) {
      if (aev[i].event === 'ring' && !aev[i].durationMs && (!agent || aev[i].agent === agent)) {
        aev[i].durationMs = now - (aev[i].ts || now); // ring duration until answer
        aev.push({ agent, event: 'answer', ts: now, channel });
        await this.setMeta(uniqueId, { ...meta, agentEvents: aev });
        return;
      }
    }
    await this.patchMeta(uniqueId, { $push: { agentEvents: { agent, event: 'answer', ts: now, channel } } });
  }

  async agentHangup(uniqueId: string, agent?: string, channel?: string, by?: string): Promise<void> {
    const now = Date.now();
    const meta = (await this.getMeta(uniqueId)) ?? ({ uniqueId } as CallMeta);
    const aev = meta.agentEvents ?? [];
    // find last answer without duration for this agent
    for (let i = aev.length - 1; i >= 0; i--) {
      if (aev[i].event === 'answer' && !aev[i].durationMs && (!agent || aev[i].agent === agent)) {
        aev[i].durationMs = now - (aev[i].ts || now); // talk duration
        aev.push({ agent, event: 'hangup', ts: now, channel });
        await this.setMeta(uniqueId, { ...meta, agentEvents: aev });
        break;
      }
    }
    // ensure we record an explicit hangup entry if not added
    await this.patchMeta(uniqueId, { $push: { agentEvents: { agent, event: 'hangup', ts: now, channel } } });
    // also mark call ended
    await this.markCallEnded(uniqueId);
  }

  /**
   * Get full flow (most-recent-first). Optional limit.
   */
  async getFlow(uniqueId: string, limit?: number): Promise<CallFlowEvent[]> {
    try {
      const key = this.keyFor(uniqueId);
      const end = limit && limit > 0 ? limit - 1 : -1;
      const entries = await this.redis.lRange(key, 0, end);
      return entries.map((s) => JSON.parse(s) as CallFlowEvent);
    } catch (e) {
      this.logger.error(`Failed to get call flow for ${uniqueId}: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * List active call unique ids tracked in Redis
   */
  async listActiveCalls(): Promise<string[]> {
    try {
      return await this.redis.sMembers(this.CALL_INDEX_KEY);
    } catch (e) {
      this.logger.error(`Failed to list active calls: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * Remove call from active index (e.g., on hangup) but keep flow list to expire normally
   */
  async markCallEnded(uniqueId: string): Promise<void> {
    try {
      await this.redis.sRem(this.CALL_INDEX_KEY, uniqueId);
    } catch (e) {
      this.logger.error(`Failed to mark call ended for ${uniqueId}: ${(e as Error).message}`);
    }
  }

  /**
   * Clear flow entirely (for testing)
   */
  async clearFlow(uniqueId: string): Promise<void> {
    try {
      const key = this.keyFor(uniqueId);
      await Promise.all([this.redis.del(key), this.redis.sRem(this.CALL_INDEX_KEY, uniqueId)]);
    } catch (e) {
      this.logger.error(`Failed to clear call flow for ${uniqueId}: ${(e as Error).message}`);
    }
  }
}
