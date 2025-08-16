import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AriService } from '../ari/ari.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IvrNode } from './entities/ivr-node.entity';
import axios from 'axios';
import { IvrLogService } from './ivr-log.service';
import { IvrLogEvent } from './entities/ivr-log.entity';

interface AriPlaybackEvent {
  playback?: { id?: string; target_uri?: string };
}
interface AriDtmfEvent {
  channel?: { id?: string };
  digit?: string;
}

interface ActiveCallState {
  channelId: string;
  currentNodeId: string;
  waitingForDigit: boolean;
  digitTimer?: NodeJS.Timeout;
  history: string[]; // stack of previous nodeIds for back
  activePlaybacks: Set<string>; // playback ids for this channel
  pendingTimeoutMs?: number; // deferred timeout until playbacks finish
  ended?: boolean; // channel has ended (StasisEnd / ChannelDestroyed)
  allocRetryCount?: number; // number of recent allocation retries
  allocRetryTimer?: NodeJS.Timeout; // timer for allocation retry
}

@Injectable()
export class IvrRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(IvrRuntimeService.name);
  private readonly calls = new Map<string, ActiveCallState>();
  private rootNodeCache?: IvrNode | null;

  constructor(
    private readonly ari: AriService,
    @InjectRepository(IvrNode) private readonly repo: Repository<IvrNode>,
    private readonly logSvc: IvrLogService
  ) {}

  async onModuleInit() {
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
    // Clean up state promptly when channel ends to avoid race causing 'Channel not found'
    this.ari.on('StasisEnd', (evt: unknown) => this.onChannelEnded(evt));
    this.ari.on('ChannelDestroyed', (evt: unknown) => this.onChannelEnded(evt));
  }

  private async getRootNode(): Promise<IvrNode | null> {
    if (this.rootNodeCache) return this.rootNodeCache;
    const root = await this.repo.findOne({
      where: { name: 'root', parentId: null },
    });
    this.rootNodeCache = root;
    return root;
  }

  private async onStasisStart(evt: unknown, channel: unknown) {
    if (!channel || typeof channel !== 'object') return;
    const channelId = (channel as { id?: string }).id;
    if (!channelId || this.calls.has(channelId)) return;
    const caller = this.extractCallerNumber(evt);
    const root = await this.getRootNode();
    if (!root) {
      this.logger.warn('No root IVR node defined');
      return;
    }
    this.calls.set(channelId, {
      channelId,
      currentNodeId: root.id,
      waitingForDigit: false,
      history: [],
      activePlaybacks: new Set(),
    });
    await this.safeLog({
      channelId,
      caller,
      nodeId: root.id,
      nodeName: root.name,
      event: 'CALL_START',
    });
    await this.executeNode(root, channelId);
  }

  private async executeNode(node: IvrNode, channelId: string) {
    // Fire webhook (non-blocking)
    this.callWebhook(node).catch((err) =>
      this.logger.warn(`Webhook failed: ${err.message}`)
    );
    const client = this.ari.getClient();
    if (!client) return;
    // Abort if channel already ended
    const existing = this.calls.get(channelId);
    if (existing?.ended) return;
    // Reset any existing digit wait when entering a new node
    const st = this.calls.get(channelId);
    if (st) {
      if (st.digitTimer) {
        clearTimeout(st.digitTimer);
        st.digitTimer = undefined;
      }
      st.waitingForDigit = false;
      st.pendingTimeoutMs = undefined;
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
          await this.safeChannelOp(channelId, () =>
            client.channels.play({
              channelId,
              media: `sound:${node.payload}`,
            })
          );
        }
        break;
      }
      case 'menu': {
        if (node.payload) {
          // Always defer starting timeout until after playback ends to avoid premature hangup
          await this.safeChannelOp(channelId, () =>
            client.channels.play({ channelId, media: `sound:${node.payload}` })
          );
          const stLocal = this.calls.get(channelId);
          if (stLocal) {
            stLocal.waitingForDigit = node.allowEarlyDtmf; // mark waiting only logically (no timer yet) if early input allowed
            // Do NOT start timer now; will start after playback finishes in onPlaybackFinished
          }
        } else {
          // No audio prompt — start waiting immediately
          this.setWaiting(channelId, true, node.timeoutMs);
        }
        break;
      }
      case 'dial': {
        if (!node.payload) {
          this.logger.warn('Dial node without payload');
          break;
        }
        // build endpoint using env vars when appropriate (SIP endpoints may need host:port)
        const rawEndpoint = node.payload;
        const aricontext = process.env.ASTERISK_FROM_ARI_CONTEXT || 'from-ari';
        const endpoint = this.normalizeEndpoint(rawEndpoint, aricontext);

        const originateParams = {
          endpoint,
          app: process.env.ARI_APP || 'crm-app',
          callerId: channelId,
        };
        this.logger.debug(`ARI originate params (dial): ${JSON.stringify(originateParams)}`);
        await this.safeChannelOp(channelId, () => client.channels.originate(originateParams));
        break;
      }
      case 'goto': {
        if (!node.payload) break;
        const target = await this.repo.findOne({ where: { id: node.payload } });
        if (target) await this.executeNode(target, channelId);
        break;
      }
      case 'queue': {
        // If payload present, play it as an announcement
        if (node.payload) {
          await this.safeChannelOp(channelId, () =>
            client.channels.play({ channelId, media: `sound:${node.payload}` })
          );
        }
        // If queueName is configured on the node, log and (optionally) perform queue-specific actions
        const targetQueue = (node as IvrNode).queueName || null;
        console.log(
          '----------------------------------------------',
          targetQueue
        );
        // Do not start digit waiting for a queue; keep call until external action.
        await this.safeLog({
          channelId,
          nodeId: node.id,
          nodeName: node.name,
          event: 'QUEUE_ENTER',
          meta: { queueName: targetQueue },
        });

        // implement queue-specific actions here
        // ARI does not have client.channels.queue - instead redirect the current channel
        // to the dialplan extension named after the queue so Asterisk's Queue() handles it.
        if (targetQueue) {
          try {
            // Prefer to send the channel back into dialplan using channels.continue (POST /ari/channels/{channelId}/continue)
            // Many ARI clients expose this method as `channels.continue`. Use it if available, otherwise fall back to Local redirect.
            const aricontext =
              process.env.ASTERISK_FROM_ARI_CONTEXT || 'from-ari';
            // By default use the queue name itself as the extension (e.g. 'support')
            // This matches extensions.conf which defines an extension named 'support'.
            const extension =
              process.env.ASTERISK_QUEUE_EXTENSION || `${targetQueue}`;

            // Some ARI clients attach a `continue` function on channels; guard safely.
            const contFn = (
              client.channels as unknown as Record<string, unknown>
            )['continue'];
            if (typeof contFn === 'function') {
              // cast to a typed callable to avoid using the unsafe `Function` type
              const contCallable = contFn as (...args: unknown[]) => Promise<unknown>;
              const continueParams = { channelId, context: aricontext, extension, priority: 1 };
              this.logger.debug(`ARI continue params: ${JSON.stringify(continueParams)}`);
              await this.safeChannelOp(channelId, () =>
                (contCallable as (...args: unknown[]) => Promise<unknown>).call(
                  client.channels,
                  continueParams
                )
              );
              this.logger.log(
                `Channel ${channelId} continued to ${aricontext}/${extension}`
              );
            } else {
              // Fallback: originate a Local channel into the dialplan extension so the Queue() in extensions.conf handles it
              const ep = this.normalizeEndpoint(extension, aricontext);
              const originateParams2 = {
                endpoint: ep,
                app: process.env.ARI_APP || 'crm-app',
                callerId: channelId,
              };
              this.logger.debug(`ARI originate params (queue fallback): ${JSON.stringify(originateParams2)}`);
              await this.safeChannelOp(channelId, () =>
                client.channels.originate(originateParams2)
              );
              this.logger.log(
                `Channel ${channelId} originated Local/${extension}@${aricontext} to enter queue ${targetQueue}`
              );
            }
          } catch (err) {
            this.logger.warn(
              `Failed to send channel to queue ${targetQueue}: ${
                (err as Error).message
              }`
            );
          }
        }
        break;
      }
      case 'hangup': {
        await this.safeChannelOp(channelId, () =>
          client.channels.hangup({ channelId })
        );
        this.calls.delete(channelId);
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

  private setWaiting(channelId: string, waiting: boolean, timeoutMs?: number) {
    const st = this.calls.get(channelId);
    if (!st) return;
    st.waitingForDigit = waiting;
    if (st.digitTimer) clearTimeout(st.digitTimer);
    st.digitTimer = undefined;
    if (waiting && timeoutMs && timeoutMs > 0) {
      // Defer starting timer if playback audio currently active
      if (st.activePlaybacks.size > 0) {
        st.pendingTimeoutMs = timeoutMs;
      } else {
        st.digitTimer = this.startDigitTimeout(channelId, st, timeoutMs);
      }
    }
    if (!waiting) {
      st.pendingTimeoutMs = undefined;
    }
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
              const parent = await this.repo.findOne({
                where: { id: parentId },
              });
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
    if (st) st.activePlaybacks.add(playbackId);
  }

  private async onPlaybackFinished(evt: unknown) {
    const pb = evt as AriPlaybackEvent;
    const playbackId = pb.playback?.id;
    const channelId = pb.playback?.target_uri?.split(':').pop();
    if (!channelId) return;
    const st = this.calls.get(channelId);
    if (!st) return;
    if (playbackId) st.activePlaybacks.delete(playbackId);
    // If all playbacks finished and we were waiting with deferred timeout, start it now
    if (
      st.activePlaybacks.size === 0 &&
      st.waitingForDigit &&
      !st.digitTimer &&
      st.pendingTimeoutMs
    ) {
      st.digitTimer = this.startDigitTimeout(
        channelId,
        st,
        st.pendingTimeoutMs
      );
    }
    const node = await this.repo.findOne({ where: { id: st.currentNodeId } });
    if (!node) return;
    if (node.action === 'menu') {
      // Start waiting (and timer) only now if not already flagged
      if (!st.waitingForDigit) this.setWaiting(channelId, true, node.timeoutMs);
      // If early DTMF enabled we may have st.waitingForDigit=true already but timer was still deferred; ensure timer starts now
      if (st.waitingForDigit && st.pendingTimeoutMs) {
        st.digitTimer = this.startDigitTimeout(
          channelId,
          st,
          st.pendingTimeoutMs
        );
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
      const current = await this.repo.findOne({ where: { id: node.id } });
      if (current?.parentId) {
        const parent = await this.repo.findOne({
          where: { id: current.parentId },
        });
        if (parent && parent.action === 'menu') {
          const st2 = this.calls.get(channelId);
          if (st2) {
            st2.currentNodeId = parent.id;
            st2.waitingForDigit = false;
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
    const node = await this.repo.findOne({ where: { id: st.currentNodeId } });
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
    }
    st.waitingForDigit = true; // ensure timer logic consistent
    await this.safeLog({
      channelId,
      nodeId: node.id,
      nodeName: node.name,
      event: 'DTMF',
      digit,
    });
    const child = await this.repo.findOne({
      where: { parentId: node.id, digit },
    });
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
        const parentNode = await this.repo.findOne({ where: { id: parentId } });
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
    if (st.digitTimer) clearTimeout(st.digitTimer);
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
    this.calls.delete(channelId);
  }

  private isChannelMissingError(err: unknown) {
    const msg = (err && (err as Error).message) || '';
    return /Channel not found/i.test(msg);
  }

  private isAllocationFailedError(err: unknown) {
    const msg = (err && (err as Error).message) || '';
    // ari-client sometimes wraps ARI JSON error literal
    return /Allocation failed/i.test(msg) || /"error"\s*:\s*"Allocation failed"/i.test(msg);
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
            if (st?.allocRetryTimer) clearTimeout(st.allocRetryTimer);
            const t = setTimeout(() => {
              if (st) st.allocRetryTimer = undefined;
              // retry op
              this.safeChannelOp(channelId, op).catch(() => undefined);
            }, 2000);
            if (st) st.allocRetryTimer = t;
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
        this.logger.debug(`Channel not found for op; cleaning state (${channelId})`);
        const st = this.calls.get(channelId);
        if (st) {
          if (st.digitTimer) clearTimeout(st.digitTimer);
          this.calls.delete(channelId);
          if (!st.ended) {
            await this.safeLog({
              channelId,
              event: 'CALL_END',
              nodeId: st.currentNodeId,
              nodeName: null,
            });
          }
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
}
