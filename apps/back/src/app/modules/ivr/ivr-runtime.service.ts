import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AriService } from '../ari/ari.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IvrNode } from './entities/ivr-node.entity';
import axios from 'axios';
import * as http from 'http';
import * as https from 'https';
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
        let endpoint = node.payload;
        try {
          const sipHost = this.getAsteriskHost();
          const sipPort = this.getAsteriskSipPort();
          if (typeof endpoint === 'string' && endpoint.startsWith('SIP/') && !endpoint.includes('@')) {
            // append host:port for SIP dialstrings when missing
            endpoint = `${endpoint}@${sipHost}:${sipPort}`;
          }
        } catch {
          // fall back to payload as-is
        }
        await this.safeChannelOp(channelId, () =>
          client.channels.originate({
            endpoint,
            app: process.env.ARI_APP,
            callerId: channelId,
          })
        );
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
        console.log('----------------------------------------------', targetQueue);
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
            const aricontext = process.env.ASTERISK_FROM_ARI_CONTEXT || 'from-ari';
            const extension = process.env.ASTERISK_QUEUE_EXTENSION || `queue_${targetQueue}`;

            // Some ARI clients attach a `continue` function on channels; guard safely.
            const contFn = (client.channels as unknown as Record<string, unknown>)['continue'];
            if (typeof contFn === 'function') {
              // cast to a typed callable to avoid using the unsafe `Function` type
              const contCallable = contFn as (...args: unknown[]) => unknown;
              await this.safeChannelOp(channelId, () =>
                (contCallable as (...args: unknown[]) => unknown).call(client.channels, { channelId, context: aricontext, extension, priority: 1 })
              );
            } else {
              // fallback: call ARI REST continue endpoint directly to move the channel into the dialplan
              const ariHost = this.getAsteriskHost();
              const ariPort = this.getAsteriskRestPort();
              const ariUser = process.env.ARI_USER || process.env.ASTERISK_USER || 'asterisk';
              const ariPass = process.env.ARI_PASS || process.env.ASTERISK_PASS || 'asterisk';
              await this.safeChannelOp(channelId, async () => {
                await this.callAriContinue({
                  channelId,
                  context: aricontext,
                  extension,
                  ariHost,
                  ariPort,
                  ariUser,
                  ariPass,
                });
              });
            }
          } catch (err) {
            this.logger.warn(`Failed to send channel to queue ${targetQueue}: ${(err as Error).message}`);
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
      default:
        this.logger.warn(`Unknown action ${node.action}`);
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

  private async safeChannelOp(channelId: string, op: () => Promise<unknown>) {
    try {
      await op();
    } catch (err) {
      if (this.isChannelMissingError(err)) {
        this.logger.debug(
          `Channel not found for op; cleaning state (${channelId})`
        );
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
      this.logger.warn(`Channel op failed: ${(err as Error).message}`);
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

  private getAsteriskHost(): string {
    return process.env.ASTERISK_HOST || process.env.ASTERISK_HOSTNAME || '127.0.0.1';
  }

  private getAsteriskSipPort(): string {
    return process.env.ASTERISK_SIP_PORT || process.env.ASTERISK_PORT || '5060';
  }

  private getAsteriskRestPort(): string {
    // allow explicit override for ARI REST port
    return (
      process.env.ASTERISK_REST_PORT || process.env.ARI_REST_PORT || '8089'
    );
  }

  private async callAriContinue(opts: {
    channelId: string;
    context: string;
    extension: string;
    ariHost: string;
    ariPort: string;
    ariUser: string;
    ariPass: string;
  }) {
    const { channelId, context, extension, ariHost, ariPort, ariUser, ariPass } = opts;
    const url = `http://${ariHost}:${ariPort}/ari/channels/${encodeURIComponent(channelId)}/continue?context=${encodeURIComponent(context)}&extension=${encodeURIComponent(extension)}&priority=1`;
    const maxAttempts = Number(process.env.ARI_CONTINUE_MAX_ATTEMPTS || 3);
    const timeoutMs = Number(process.env.ARI_CONTINUE_TIMEOUT_MS || 5000);
    let attempt = 0;
    let lastErr: unknown = null;

    // create axios instance with keep-alive agent to avoid frequent connection resets
    const isTls = url.startsWith('https:');
    const agent = isTls
      ? new https.Agent({ keepAlive: true })
      : new http.Agent({ keepAlive: true });
    const client = axios.create({ httpAgent: agent, httpsAgent: agent, timeout: timeoutMs, auth: { username: ariUser, password: ariPass }, headers: { Connection: 'keep-alive' } });

    while (attempt < maxAttempts) {
      attempt++;
      try {
        this.logger.debug(`ARI continue attempt ${attempt} -> ${url} (timeout ${timeoutMs}ms)`);
        // POST with empty body; ensure content-length is explicit when using keep-alive agent
        await client.post(url, '', { headers: { 'Content-Length': '0' } });
        this.logger.debug(`ARI continue succeeded for channel ${channelId}`);
        return;
      } catch (err) {
        lastErr = err;
          type ErrLike = { code?: string; response?: { status?: number; data?: unknown } };
          const eErr = err as ErrLike;
          const code = eErr?.code;
          const status = eErr?.response?.status;
          this.logger.warn(`ARI continue attempt ${attempt} failed: ${(err as Error).message} code=${code || 'n/a'} status=${status || 'n/a'}`);
          // If ARI returned a body (e.g. 401 with explanation) include a truncated snippet for diagnostics
          const respData = eErr?.response?.data;
          if (respData) {
            let snippet: string;
            try {
              snippet =
                typeof respData === 'string'
                  ? respData.slice(0, 400)
                  : JSON.stringify(respData).slice(0, 400);
            } catch {
              snippet = '[unserializable response data]';
            }
            this.logger.warn(`ARI continue response data (truncated): ${snippet}`);
          }
          if (status === 401) {
            this.logger.warn('ARI returned 401 Unauthorized — verify ARI credentials (ARI_USER/ARI_PASS or ASTERISK_USER/ASTERISK_PASS) and that ARI is configured to accept REST requests on the given host/port.');
          }

        // If connection refused, wait a bit longer before retrying
        const backoff = Math.min(1000 * attempt, 5000);
        await new Promise((res) => setTimeout(res, backoff));
      }
    }

    // Final diagnostics: surface a clearer error
    const finalMsg = `ARI continue failed after ${maxAttempts} attempts for channel ${channelId} -> ${url}`;
    this.logger.error(finalMsg);
    throw lastErr as Error | null;
  }
}
