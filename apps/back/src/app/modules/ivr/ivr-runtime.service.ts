import { Injectable, Logger, OnModuleInit, Inject, OnModuleDestroy, Optional } from '@nestjs/common';
import { AriService } from '../ari/ari.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IvrNode } from './entities/ivr-node.entity';
import axios from 'axios';
import { IvrLogService } from './ivr-log.service';
import { IvrLogEvent } from './entities/ivr-log.entity';
import { IvrMedia } from '../ivr-media/entities/ivr-media.entity';
import { RedisClientType } from 'redis';
import { IvrCacheService } from './ivr-cache.service';
import { QueueProducerService } from '../queues/queue-producer.service';

interface AriPlaybackEvent {
  playback?: { id?: string; target_uri?: string };
}
interface AriDtmfEvent {
  channel?: { id?: string };
  digit?: string;
}

// Serializable state stored in Redis
interface SerializableCallState {
  channelId: string;
  currentNodeId: string;
  waitingForDigit: boolean;
  history: string[];
  activePlaybacks: string[]; // Array instead of Set for JSON
  pendingTimeoutMs?: number;
  ended?: boolean;
  allocRetryCount?: number;
  createdAt: number;
  updatedAt: number;
}

// Full state with timers (local only)
interface ActiveCallState {
  channelId: string;
  currentNodeId: string;
  waitingForDigit: boolean;
  digitTimer?: NodeJS.Timeout;
  history: string[];
  activePlaybacks: Set<string>;
  pendingTimeoutMs?: number;
  ended?: boolean;
  allocRetryCount?: number;
  allocRetryTimer?: NodeJS.Timeout;
}

const REDIS_PREFIX = 'ivr:calls:';
const CALL_STATE_TTL = 60 * 60; // 1 hour max call duration

@Injectable()
export class IvrRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IvrRuntimeService.name);
  
  // Local cache for timers (cannot be serialized to Redis)
  private readonly localTimers = new Map<string, { digitTimer?: NodeJS.Timeout; allocRetryTimer?: NodeJS.Timeout }>();
  
  // In-memory cache synced with Redis
  private readonly calls = new Map<string, ActiveCallState>();
  
  private rootNodeCache?: IvrNode | null;

  constructor(
    private readonly ari: AriService,
    @InjectRepository(IvrNode) private readonly repo: Repository<IvrNode>,
    @InjectRepository(IvrMedia)
    private readonly mediaRepo: Repository<IvrMedia>,
    private readonly logSvc: IvrLogService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    @Optional() private readonly ivrCache?: IvrCacheService,
    @Optional() private readonly queueProducer?: QueueProducerService,
  ) {}

  async onModuleInit() {
    // Restore active calls from Redis on startup
    await this.restoreCallsFromRedis();
    
    this.ari.on('StasisStart', (evt: unknown, channel: unknown) =>
      this.onStasisStart(evt, channel)
    );
    this.ari.on('ChannelDtmfReceived', (evt: unknown) => this.onDtmf(evt));
    this.ari.on('PlaybackStarted', (evt: unknown) =>
      this.onPlaybackStarted(evt)
    );
    this.ari.on('PlaybackFinished', (evt: unknown) =>
      this.onPlaybackFinished(evt)
    );
    this.ari.on('StasisEnd', (evt: unknown) => this.onChannelEnded(evt));
    this.ari.on('ChannelDestroyed', (evt: unknown) => this.onChannelEnded(evt));
  }

  async onModuleDestroy() {
    // Clear all local timers
    for (const [channelId, timers] of this.localTimers) {
      if (timers.digitTimer) clearTimeout(timers.digitTimer);
      if (timers.allocRetryTimer) clearTimeout(timers.allocRetryTimer);
    }
    this.localTimers.clear();
  }

  // Redis state management
  private async saveCallToRedis(channelId: string, state: ActiveCallState): Promise<void> {
    try {
      const serializable: SerializableCallState = {
        channelId: state.channelId,
        currentNodeId: state.currentNodeId,
        waitingForDigit: state.waitingForDigit,
        history: state.history,
        activePlaybacks: Array.from(state.activePlaybacks),
        pendingTimeoutMs: state.pendingTimeoutMs,
        ended: state.ended,
        allocRetryCount: state.allocRetryCount,
        createdAt: (state as any).createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await this.redis.setEx(
        `${REDIS_PREFIX}${channelId}`,
        CALL_STATE_TTL,
        JSON.stringify(serializable)
      );
    } catch (err) {
      this.logger.warn(`Failed to save call state to Redis: ${err}`);
    }
  }

  private async deleteCallFromRedis(channelId: string): Promise<void> {
    try {
      await this.redis.del(`${REDIS_PREFIX}${channelId}`);
    } catch (err) {
      this.logger.warn(`Failed to delete call state from Redis: ${err}`);
    }
  }

  private async restoreCallsFromRedis(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${REDIS_PREFIX}*`);
      this.logger.log(`Restoring ${keys.length} active IVR calls from Redis`);
      
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (!data) continue;
          
          const serialized: SerializableCallState = JSON.parse(data);
          
          // Check if call is stale (older than TTL)
          if (Date.now() - serialized.updatedAt > CALL_STATE_TTL * 1000) {
            await this.redis.del(key);
            continue;
          }
          
          // Restore to memory
          const state: ActiveCallState = {
            channelId: serialized.channelId,
            currentNodeId: serialized.currentNodeId,
            waitingForDigit: serialized.waitingForDigit,
            history: serialized.history,
            activePlaybacks: new Set(serialized.activePlaybacks),
            pendingTimeoutMs: serialized.pendingTimeoutMs,
            ended: serialized.ended,
            allocRetryCount: serialized.allocRetryCount,
          };
          
          this.calls.set(serialized.channelId, state);
          this.localTimers.set(serialized.channelId, {});
          
          this.logger.log(`Restored IVR call: ${serialized.channelId}`);
        } catch (err) {
          this.logger.warn(`Failed to restore call from key ${key}: ${err}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to restore calls from Redis: ${err}`);
    }
  }

  // Get call state with Redis fallback
  private async getCallState(channelId: string): Promise<ActiveCallState | undefined> {
    // First check local cache
    let state = this.calls.get(channelId);
    if (state) return state;
    
    // Try to restore from Redis (in case another instance created it)
    try {
      const data = await this.redis.get(`${REDIS_PREFIX}${channelId}`);
      if (data) {
        const serialized: SerializableCallState = JSON.parse(data);
        state = {
          channelId: serialized.channelId,
          currentNodeId: serialized.currentNodeId,
          waitingForDigit: serialized.waitingForDigit,
          history: serialized.history,
          activePlaybacks: new Set(serialized.activePlaybacks),
          pendingTimeoutMs: serialized.pendingTimeoutMs,
          ended: serialized.ended,
          allocRetryCount: serialized.allocRetryCount,
        };
        this.calls.set(channelId, state);
        this.localTimers.set(channelId, {});
        return state;
      }
    } catch (err) {
      this.logger.warn(`Failed to get call state from Redis: ${err}`);
    }
    
    return undefined;
  }

  /**
   * Resolve root node. If `entryKey` is provided, try to find a root node named `root:<entryKey>`
   * (allows mapping different dialplan entry points to different IVR roots). Falls back to
   * the default `root` node.
   */
  private async getRootNode(entryKey?: string): Promise<IvrNode | null> {
    const name = entryKey?.trim() || 'root';
    
    // Try cache first
    if (this.ivrCache) {
      return this.ivrCache.getRootNode(name);
    }
    
    // Fallback to direct DB query
    return this.repo.findOne({
      where: { name, parentId: null },
    });
  }

  /**
   * Get node by ID (with cache)
   */
  private async getNodeById(id: string): Promise<IvrNode | null> {
    if (!id) return null;
    
    // Try cache first
    if (this.ivrCache) {
      return this.ivrCache.getNodeById(id);
    }
    
    // Fallback to direct DB query
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Get child node by digit (with cache)
   */
  private async getChildByDigit(parentId: string, digit: string): Promise<IvrNode | null> {
    // Try cache first
    if (this.ivrCache) {
      return this.ivrCache.getChildByDigit(parentId, digit);
    }
    
    // Fallback to direct DB query
    return this.repo.findOne({ where: { parentId, digit } });
  }

  /**
   * Get media by ID (with cache)
   */
  private async getMediaById(id: string): Promise<IvrMedia | null> {
    if (!id) return null;
    
    // Try cache first
    if (this.ivrCache) {
      return this.ivrCache.getMediaById(id);
    }
    
    // Fallback to direct DB query
    return this.mediaRepo.findOne({ where: { id } });
  }

  private async onStasisStart(evt: unknown, channel: unknown) {
    if (!channel || typeof channel !== 'object') return;
    const channelId = (channel as { id?: string }).id;
    if (!channelId || this.calls.has(channelId)) return;
    const caller = this.extractCallerNumber(evt);
    // Allow dialplan to pass an optional entry key as second Stasis arg
    let entryKey: string | undefined;
    try {
      const maybe = evt as Record<string, unknown>;
      const args = maybe['args'] as unknown;
      if (
        Array.isArray(args) &&
        args.length > 1 &&
        typeof args[1] === 'string'
      ) {
        entryKey = args[1] as string;
      }
    } catch {
      /* ignore */
    }
    const root = await this.getRootNode(entryKey);
    if (!root) {
      this.logger.warn(`No root IVR node defined${entryKey ? ` for entryKey='${entryKey}'` : ''}`);
      return;
    }
    const newState: ActiveCallState = {
      channelId,
      currentNodeId: root.id,
      waitingForDigit: false,
      history: [],
      activePlaybacks: new Set(),
    };
    this.calls.set(channelId, newState);
    this.localTimers.set(channelId, {});
    await this.saveCallToRedis(channelId, newState);
    
    await this.safeLog({
      channelId,
      caller,
      nodeId: root.id,
      nodeName: root.name,
      event: 'CALL_START',
    });
    
    await this.executeNode(root, channelId, channel as { id?: string });
  }

  private async executeNode(
    node: IvrNode,
    channelId: string,
    channel?: { id?: string } | null
  ) {
    this.callWebhook(node).catch((err) =>
      this.logger.warn(`Webhook failed: ${err.message}`)
    );
    const client = this.ari.getClient();
    if (!client) return;
    const existing = this.calls.get(channelId);
    if (existing?.ended) return;
    const st = this.calls.get(channelId);
    if (st) {
      const timers = this.localTimers.get(channelId);
      if (timers?.digitTimer) {
        clearTimeout(timers.digitTimer);
        timers.digitTimer = undefined;
      }
      st.waitingForDigit = false;
      st.pendingTimeoutMs = undefined;
      await this.saveCallToRedis(channelId, st);
    }
    await this.safeLog({
      channelId,
      nodeId: node.id,
      nodeName: node.name,
      event: 'NODE_EXECUTE',
      meta: { action: node.action, payload: node.payload },
    });
    switch (node.action) {
      case 'playback': {
        if (node.payload) {
          let mediaRef = node.payload;
          // if payload looks like a UUID (media id), resolve filename
          if (/^[0-9a-fA-F-]{36,}$/.test(String(node.payload))) {
            const m = await this.getMediaById(node.payload);
            if (m) mediaRef = m.filename.replace(/\.[^.]+$/, '');
          }
          // play from custom sounds folder so project-provided audio is used
          await this.safeChannelOp(channelId, () =>
            client.channels.play({ channelId, media: `sound:custom/${mediaRef}` })
          );
        }
        break;
      }
      case 'menu': {
        if (node.payload) {
          let mediaRef = node.payload;
          if (/^[0-9a-fA-F-]{36,}$/.test(String(node.payload))) {
            const m = await this.getMediaById(node.payload);
            if (m) mediaRef = m.filename.replace(/\.[^.]+$/, '');
          }
          // play menu prompt from custom sounds
          await this.safeChannelOp(channelId, () =>
            client.channels.play({ channelId, media: `sound:custom/${mediaRef}` })
          );
          const stLocal = this.calls.get(channelId);
          if (stLocal) stLocal.waitingForDigit = node.allowEarlyDtmf;
        } else {
          this.setWaiting(channelId, true, node.timeoutMs);
        }
        break;
      }
      case 'dial': {
        if (!node.payload) {
          this.logger.warn('Dial node without payload');
          break;
        }
        const rawEndpoint = node.payload;
        const aricontext = process.env.ASTERISK_FROM_ARI_CONTEXT || 'from-ari';
        const endpoint = this.normalizeEndpoint(rawEndpoint, aricontext);
        const originateParams = {
          endpoint,
          app: process.env.ARI_APP || 'crm-app',
          callerId: channelId,
        };
        await this.safeChannelOp(channelId, () =>
          client.channels.originate(originateParams)
        );
        break;
      }
      case 'goto': {
        if (!node.payload) break;
        const target = await this.getNodeById(node.payload);
        if (target) await this.executeNode(target, channelId, channel);
        break;
      }
      case 'queue': {
        // Get call state and prepare for transition
        const st = this.calls.get(channelId);
        if (!st) {
          this.logger.warn(`No call state found for ${channelId} during queue transition`);
          break;
        }

        // Ensure channel is answered before any operations
        try {
          const channelInfo = await client.channels.get({ channelId });
          if (channelInfo && channelInfo.state !== 'Up') {
            this.logger.log(`[QUEUE_TRANSITION] Channel ${channelId} not Up (state=${channelInfo.state}), answering now`);
            await client.channels.answer({ channelId });
            // Give channel time to fully transition to Up state
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          this.logger.error(`[QUEUE_TRANSITION] Failed to check/answer channel ${channelId}: ${err}`);
          await this.cleanupCall(channelId);
          break;
        }

        // Disable DTMF handling completely before queue transition
        st.waitingForDigit = false;
        const timers = this.localTimers.get(channelId);
        if (timers?.digitTimer) {
          clearTimeout(timers.digitTimer);
          timers.digitTimer = undefined;
        }
        this.logger.log(`[QUEUE_TRANSITION] Disabled DTMF for channel ${channelId}`);

        // Stop any active playbacks before transitioning to dialplan
        if (st.activePlaybacks?.size > 0) {
          this.logger.log(`[QUEUE_TRANSITION] Stopping ${st.activePlaybacks.size} active playbacks for channel=${channelId}`);
          for (const pbId of st.activePlaybacks) {
            try {
              await this.safeChannelOp(channelId, () =>
                client.playbacks.stop({ playbackId: pbId })
              );
            } catch (err) {
              this.logger.warn(`Failed to stop playback ${pbId}: ${err}`);
            }
          }
          st.activePlaybacks.clear();
          // Give Asterisk MORE time to fully process playback stops and stabilize channel
          this.logger.log(`[QUEUE_TRANSITION] Waiting 500ms for playback cleanup channel=${channelId}`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Verify channel is still up before continuing
        try {
          const channelInfo = await client.channels.get({ channelId });
          if (!channelInfo || channelInfo.state === 'Down') {
            this.logger.warn(`[QUEUE_TRANSITION] Channel ${channelId} is down, aborting transition`);
            await this.cleanupCall(channelId);
            break;
          }
          this.logger.log(`[QUEUE_TRANSITION] Channel ${channelId} state=${channelInfo.state}, proceeding to queue`);
        } catch (err) {
          this.logger.error(`[QUEUE_TRANSITION] Failed to get channel info for ${channelId}: ${err}`);
          await this.cleanupCall(channelId);
          break;
        }

        const queueName = node.queueName || 'support';
        this.logger.log(`[QUEUE_TRANSITION] Starting continue to queue=${queueName} for channel=${channelId}`);
        
        // Use 'default' context so operators registered there can receive calls
        const context = 'default';
        const priority = 1;
        const host = process.env.ARI_HOST || 'localhost';
        const port = process.env.ARI_PORT || '8089';
        const protocol =
          process.env.ARI_PROTOCOL === 'https' ? 'https' : 'http';
        const user = process.env.ARI_USER || 'ariuser';
        const pass = process.env.ARI_PASSWORD || 'aripass';
        const url = `${protocol}://${host}:${port}/ari/channels/${encodeURIComponent(
          channelId
        )}/continue`;
        await this.safeLog({
          channelId,
          nodeId: node.id,
          nodeName: node.name,
          event: 'QUEUE_ENTER',
          meta: {
            queue: queueName,
            attempt: 'continue_http',
            context,
            priority,
          },
        });
        try {
          // Try a few possible extension names so dialplan naming differences (e.g. 'support' vs 'queue_support') are handled.
          // Try named queue dialplan entry first (queue_<name>), then plain queue name
          const candidates = [`queue_${queueName}`, queueName];
          let success = false;
          let lastError = null;
          for (const ext of candidates) {
            this.logger.log(`[QUEUE_TRANSITION] Attempting continue: context=${context}, ext=${ext}, channel=${channelId}`);
            try {
              const res = await axios.post(url, null, {
                params: { context, extension: ext, priority },
                auth: { username: user, password: pass },
                timeout: 5000,
                validateStatus: () => true,
              });
              this.logger.log(`[QUEUE_TRANSITION] Continue response: status=${res.status}, ext=${ext}, channel=${channelId}`);
              if (res.status >= 200 && res.status < 300) {
                success = true;
                this.logger.log(`[QUEUE_TRANSITION] SUCCESS! Transitioned channel=${channelId} to queue via extension=${ext}`);
                break;
              } else {
                lastError = `status ${res.status}`;
              }
            } catch (err) {
              lastError = err.message || String(err);
              this.logger.warn(`[QUEUE_TRANSITION] Continue attempt failed for ext=${ext}: ${lastError}`);
            }
          }
          if (success) {
            // Channel has been handed off to dialplan, clean up immediately
            this.calls.delete(channelId);
            this.logger.log(`[QUEUE_TRANSITION] Channel ${channelId} handed off to dialplan for queue ${queueName}`);
          } else {
            this.logger.error(
              `[QUEUE_TRANSITION] All continue attempts failed for channel=${channelId} queue=${queueName}, lastError=${lastError}`
            );
            await this.safeLog({
              channelId,
              nodeId: node.id,
              nodeName: node.name,
              event: 'QUEUE_ENTER',
              meta: { queue: queueName, attempt: 'failed_http', error: lastError },
            });
          }
        } catch (e) {
          const msg = (e as Error).message;
          this.logger.error(
            `HTTP continue to queue failed channel=${channelId} err=${msg}`
          );
          await this.safeLog({
            channelId,
            nodeId: node.id,
            nodeName: node.name,
            event: 'QUEUE_ENTER',
            meta: { queue: queueName, attempt: 'failed_http', error: msg },
          });
        }
        break;
      }
      case 'hangup': {
        await this.safeChannelOp(channelId, () =>
          client.channels.hangup({ channelId })
        );
        await this.cleanupCall(channelId);
        await this.safeLog({
          channelId,
          nodeId: node.id,
          nodeName: node.name,
          event: 'CALL_END',
        });
        break;
      }
    }
  }

  private async setWaiting(channelId: string, waiting: boolean, timeoutMs?: number) {
    const st = this.calls.get(channelId);
    if (!st) return;
    st.waitingForDigit = waiting;
    
    const timers = this.localTimers.get(channelId) || {};
    if (timers.digitTimer) clearTimeout(timers.digitTimer);
    timers.digitTimer = undefined;
    
    if (waiting && timeoutMs && timeoutMs > 0) {
      // Defer starting timer if playback audio currently active
      if (st.activePlaybacks.size > 0) {
        st.pendingTimeoutMs = timeoutMs;
      } else {
        timers.digitTimer = this.startDigitTimeout(channelId, st, timeoutMs);
      }
    }
    if (!waiting) {
      st.pendingTimeoutMs = undefined;
    }
    
    this.localTimers.set(channelId, timers);
    await this.saveCallToRedis(channelId, st);
  }

  // Helper to cleanup call state from both local and Redis
  private async cleanupCall(channelId: string): Promise<void> {
    const timers = this.localTimers.get(channelId);
    if (timers) {
      if (timers.digitTimer) clearTimeout(timers.digitTimer);
      if (timers.allocRetryTimer) clearTimeout(timers.allocRetryTimer);
    }
    this.localTimers.delete(channelId);
    this.calls.delete(channelId);
    await this.deleteCallFromRedis(channelId);
  }

  private startDigitTimeout(
    channelId: string,
    st: ActiveCallState,
    timeoutMs: number
  ) {
    return setTimeout(() => {
      // On timeout check current node
      const nodeId = st.currentNodeId;
      if (!nodeId) return;
      this.repo
        .findOne({ where: { id: nodeId } })
        .then(async (node) => {
          if (!node) return;
          // Log timeout
          await this.safeLog({
            channelId,
            nodeId: node.id,
            nodeName: node.name,
            event: 'TIMEOUT',
          });
          if (node.action === 'menu') {
            // Repeat menu instead of hanging up
            st.waitingForDigit = false;
            // Re-execute same node (replay prompt or immediately wait if no payload)
            await this.executeNode(node, channelId);
          } else {
            // Non-menu: do NOT hangup; attempt to return to nearest ancestor menu
            const parentId = (node as IvrNode).parentId;
            if (parentId) {
              const parent = await this.getNodeById(parentId);
              if (parent && parent.action === 'menu') {
                st.currentNodeId = parent.id;
                st.waitingForDigit = false;
                await this.executeNode(parent, channelId);
                return;
              }
            }
            // Fallback: just clear waiting (keep call alive)
            st.waitingForDigit = false;
          }
        })
        .catch(() => undefined);
    }, timeoutMs);
  }

  private async onPlaybackStarted(evt: unknown) {
    const pb = evt as AriPlaybackEvent;
    const playbackId = pb.playback?.id;
    const channelId = pb.playback?.target_uri?.split(':').pop();
    if (!playbackId || !channelId) return;
    const st = this.calls.get(channelId);
    if (st) {
      st.activePlaybacks.add(playbackId);
      await this.saveCallToRedis(channelId, st);
    }
  }

  private async onPlaybackFinished(evt: unknown) {
    const pb = evt as AriPlaybackEvent;
    const playbackId = pb.playback?.id;
    const channelId = pb.playback?.target_uri?.split(':').pop();
    if (!channelId) return;
    const st = this.calls.get(channelId);
    if (!st) return;
    if (playbackId) st.activePlaybacks.delete(playbackId);
    
    const timers = this.localTimers.get(channelId) || {};
    
    // If all playbacks finished and we were waiting with deferred timeout, start it now
    if (
      st.activePlaybacks.size === 0 &&
      st.waitingForDigit &&
      !timers.digitTimer &&
      st.pendingTimeoutMs
    ) {
      timers.digitTimer = this.startDigitTimeout(
        channelId,
        st,
        st.pendingTimeoutMs
      );
      this.localTimers.set(channelId, timers);
    }
    const node = await this.getNodeById(st.currentNodeId);
    if (!node) return;
    if (node.action === 'menu') {
      // Start waiting (and timer) only now if not already flagged
      if (!st.waitingForDigit) await this.setWaiting(channelId, true, node.timeoutMs);
      // If early DTMF enabled we may have st.waitingForDigit=true already but timer was still deferred; ensure timer starts now
      if (st.waitingForDigit && st.pendingTimeoutMs) {
        const t = this.localTimers.get(channelId) || {};
        t.digitTimer = this.startDigitTimeout(
          channelId,
          st,
          st.pendingTimeoutMs
        );
        this.localTimers.set(channelId, t);
        st.pendingTimeoutMs = undefined;
      }
    } else if (node.action === 'playback') {
      // After playback: return to parent menu if exists; else keep call (no hangup)
      await this.safeLog({
        channelId,
        nodeId: node.id,
        nodeName: node.name,
        event: 'PLAYBACK_FINISHED',
      });
      const current = await this.getNodeById(node.id);
      if (current?.parentId) {
        const parent = await this.getNodeById(current.parentId);
        if (parent && parent.action === 'menu') {
          const st2 = this.calls.get(channelId);
          if (st2) {
            st2.currentNodeId = parent.id;
            st2.waitingForDigit = false;
            await this.saveCallToRedis(channelId, st2);
          }
          await this.executeNode(parent, channelId);
        }
      }
    }
  }

  private async onDtmf(evt: unknown) {
    const d = evt as AriDtmfEvent;
    const channelId = d.channel?.id;
    const digit = d.digit;
    if (!channelId || !digit) return;
    const st = this.calls.get(channelId);
    if (!st) return;
    const node = await this.getNodeById(st.currentNodeId);
    if (!node) return;
    // Accept digits if waiting OR menu prompt still playing (early DTMF)
    if (
      !st.waitingForDigit &&
      !(
        node.action === 'menu' &&
        node.allowEarlyDtmf &&
        st.activePlaybacks.size > 0
      )
    )
      return;
    // Stop any active playbacks (early interruption)
    if (st.activePlaybacks.size > 0) {
      const client = this.ari.getClient();
      for (const pbId of st.activePlaybacks) {
        try {
          await client?.playbacks.stop({ playbackId: pbId }); // ignore errors
        } catch {
          /* ignore */
        }
      }
      st.activePlaybacks.clear();
      // Give Asterisk time to process playback stops before proceeding
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    st.waitingForDigit = true; // ensure timer logic consistent
    await this.safeLog({
      channelId,
      nodeId: node.id,
      nodeName: node.name,
      event: 'DTMF',
      digit,
    });
    const child = await this.getChildByDigit(node.id, digit);
    const backDigit = node.backDigit || '0';
    const repeatDigit = node.repeatDigit || '*';
    const rootDigit = node.rootDigit || '#';
    // Repeat current menu
    if (repeatDigit && digit === repeatDigit && node.action === 'menu') {
      st.waitingForDigit = false;
      await this.executeNode(node, channelId);
      return;
    }
    // Jump to root menu
    if (rootDigit && digit === rootDigit) {
      const root = await this.getRootNode();
      if (root) {
        st.history = [];
        st.currentNodeId = root.id;
        st.waitingForDigit = false;
        await this.executeNode(root, channelId);
        return;
      }
    }
    if (digit === backDigit && node.parentId) {
      const parentId = st.history.pop() || node.parentId;
      if (parentId) {
        st.currentNodeId = parentId;
        this.setWaiting(channelId, false);
        const parentNode = await this.getNodeById(parentId);
        if (parentNode) await this.executeNode(parentNode, channelId);
        return;
      }
    }
    if (!child) {
      // repeat current menu
      this.setWaiting(channelId, false);
      await this.executeNode(node, channelId);
      return;
    }
    st.history.push(node.id);
    st.currentNodeId = child.id;
    this.setWaiting(channelId, false);
    await this.executeNode(child, channelId);
  }

  private async callWebhook(node: IvrNode) {
    if (!node.webhookUrl) return;
    
    // Use queue for reliable webhook delivery if available
    if (this.queueProducer) {
      await this.queueProducer.queueWebhook({
        url: node.webhookUrl,
        method: ((node.webhookMethod || 'POST').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH'),
        payload: { nodeId: node.id, name: node.name, action: node.action },
        sourceType: 'ivr',
        sourceId: node.id,
        maxRetries: 3,
        timeout: 10000,
      });
      return;
    }

    // Fallback to direct call if queue not available
    try {
      const method = (node.webhookMethod || 'POST').toLowerCase();
      const res = await axios.request({
        url: node.webhookUrl,
        method: method as typeof axios.defaults.method,
        data: { nodeId: node.id, name: node.name, action: node.action },
      });
      console.log(res);
    } catch (err) {
      this.logger.warn(`Webhook request failed: ${(err as Error).message}`);
    }
  }

  private async safeLog(args: {
    channelId: string;
    caller?: string | null;
    nodeId?: string | null;
    nodeName?: string | null;
    event: IvrLogEvent;
    digit?: string | null;
    meta?: Record<string, unknown> | null;
  }) {
    try {
      if (!args.channelId) return;
      await this.logSvc.write({
        channelId: args.channelId,
        caller: args.caller ?? null,
        nodeId: args.nodeId ?? null,
        nodeName: args.nodeName ?? null,
        event: args.event,
        digit: args.digit ?? null,
        meta: args.meta ?? null,
      });
    } catch (e) {
      this.logger.warn(`IVR log write failed: ${(e as Error).message}`);
    }
  }

  // Handle both StasisEnd & ChannelDestroyed to cleanup state and avoid subsequent operations on missing channel
  private async onChannelEnded(evt: unknown) {
    if (!evt || typeof evt !== 'object') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e: any = evt;
    const channelId: string | undefined = e.channel?.id || e.id;
    if (!channelId) return;
    const st = this.calls.get(channelId);
    if (!st) return; // already cleaned or not an IVR tracked call
    
    // Clear all timers
    const timers = this.localTimers.get(channelId);
    if (timers) {
      if (timers.digitTimer) {
        clearTimeout(timers.digitTimer);
        timers.digitTimer = undefined;
      }
      if (timers.allocRetryTimer) {
        clearTimeout(timers.allocRetryTimer);
        timers.allocRetryTimer = undefined;
      }
    }
    
    st.activePlaybacks.clear();
    if (!st.ended) {
      st.ended = true;
      await this.safeLog({
        channelId,
        event: 'CALL_END',
        nodeId: st.currentNodeId,
        nodeName: null,
      });
    }
    await this.cleanupCall(channelId);
  }

  private isChannelMissingError(err: unknown) {
    const msg = (err && (err as Error).message) || '';
    return /Channel not found/i.test(msg);
  }

  private isAllocationFailedError(err: unknown) {
    const msg = (err && (err as Error).message) || '';
    // ari-client sometimes wraps ARI JSON error literal
    return (
      /Allocation failed/i.test(msg) ||
      /"error"\s*:\s*"Allocation failed"/i.test(msg)
    );
  }

  private async safeChannelOp(channelId: string, op: () => Promise<unknown>) {
    try {
      await op();
    } catch (err) {
      // Handle transient ARI allocation failures with a short retry loop
      try {
        if (this.isAllocationFailedError(err)) {
          const st = this.calls.get(channelId);
          const prev = st?.allocRetryCount || 0;
          const next = prev + 1;
          if (st) st.allocRetryCount = next;
          const maxRetries = 3;
          if (next <= maxRetries) {
            this.logger.warn(
              `ARI allocation failed for channel ${channelId}, scheduling retry ${next}/${maxRetries}`
            );
            // clear existing timer if any
            const timers = this.localTimers.get(channelId) || {};
            if (timers.allocRetryTimer) clearTimeout(timers.allocRetryTimer);
            const t = setTimeout(() => {
              const tm = this.localTimers.get(channelId);
              if (tm) tm.allocRetryTimer = undefined;
              // retry op
              this.safeChannelOp(channelId, op).catch(() => undefined);
            }, 2000);
            timers.allocRetryTimer = t;
            this.localTimers.set(channelId, timers);
            return;
          }
          this.logger.error(
            `ARI allocation failed for channel ${channelId} after ${next} attempts, giving up`
          );
          // Do not delete call state here; caller may decide to hangup or retry later.
          return;
        }
      } catch {
        /* ignore errors in allocation handling */
      }
      // Attach extra context to logs so we can trace failing ARI operations
      const st = this.calls.get(channelId);
      const currentNodeId = st?.currentNodeId;
      let currentNodeAction: string | null = null;
      try {
        if (currentNodeId) {
          // best-effort fetch of node action for context
          // do not await to avoid blocking error path; use synchronous lookup from repo if available is not possible
          // we will set to null here; detailed node lookup can be added if needed
          currentNodeAction = null;
        }
      } catch {
        currentNodeAction = null;
      }

      if (this.isChannelMissingError(err)) {
        const st = this.calls.get(channelId);
        if (st) {
          const timers = this.localTimers.get(channelId);
          if (timers?.digitTimer) clearTimeout(timers.digitTimer);
          if (!st.ended) {
            await this.safeLog({
              channelId,
              event: 'CALL_END',
              nodeId: st.currentNodeId,
              nodeName: null,
            });
          }
          await this.cleanupCall(channelId);
        }
        return;
      }
      // Log rich context for debugging ARI errors
      try {
        const errInfo: Record<string, unknown> = {
          message: (err && (err as Error).message) || String(err),
          stack: (err && (err as Error).stack) || undefined,
          channelId,
          currentNodeId,
          currentNodeAction,
        };
        this.logger.warn(`Channel op failed: ${JSON.stringify(errInfo)}`);
      } catch {
        this.logger.warn(`Channel op failed: ${(err as Error).message}`);
      }
    }
  }

  private extractCallerNumber(evt: unknown): string | null {
    if (typeof evt !== 'object' || !evt) return null;
    const maybe = evt as Record<string, unknown>;
    const channel = maybe['channel'] as Record<string, unknown> | undefined;
    const caller =
      channel && (channel['caller'] as Record<string, unknown> | undefined);
    const num = caller && (caller['number'] as unknown);
    return typeof num === 'string' ? num : null;
  }

  // If a raw endpoint looks like a bare extension or dialplan identifier (no '/'),
  // convert it to a Local channel that will enter the dialplan: Local/<ext>@<context>
  private normalizeEndpoint(raw: string, aricontext: string) {
    if (!raw) return raw;
    if (raw.includes('/')) return raw; // already protocol-qualified (PJSIP/, SIP/, Local/, etc.)
    return `Local/${raw}@${aricontext}`;
  }

  // Return a lightweight snapshot of active calls for external consumers (local cache)
  public getActiveCallsSnapshot(): { count: number; channelIds: string[] } {
    const channelIds = Array.from(this.calls.keys());
    return { count: channelIds.length, channelIds };
  }

  // Return active calls from Redis (all instances)
  public async getActiveCallsFromRedis(): Promise<{ count: number; channelIds: string[] }> {
    try {
      const keys = await this.redis.keys(`${REDIS_PREFIX}*`);
      const channelIds = keys.map(key => key.replace(REDIS_PREFIX, ''));
      return { count: channelIds.length, channelIds };
    } catch (err) {
      this.logger.warn(`Failed to get active calls from Redis: ${err}`);
      // Fallback to local
      return this.getActiveCallsSnapshot();
    }
  }

  // Get detailed call state from Redis
  public async getCallStateFromRedis(channelId: string): Promise<SerializableCallState | null> {
    try {
      const data = await this.redis.get(`${REDIS_PREFIX}${channelId}`);
      if (data) {
        return JSON.parse(data) as SerializableCallState;
      }
    } catch (err) {
      this.logger.warn(`Failed to get call state from Redis: ${err}`);
    }
    return null;
  }
}
