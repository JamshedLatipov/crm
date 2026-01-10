import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore dynamic module without types
import * as AriClient from 'ari-client';

interface AriConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  app: string;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  protocol: 'http' | 'https';
}

@Injectable()
export class AriService {
  private readonly logger = new Logger(AriService.name);
  private client: any;
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;
  private readonly emitter = new EventEmitter();
  private readonly config: AriConfig = {
    host: process.env['ARI_HOST'] || 'localhost',
    port: parseInt(process.env['ARI_PORT'] || '8089', 10),
    protocol: process.env['ARI_PROTOCOL'] === 'https' ? 'https' : 'http',
    username: process.env['ARI_USER'] || 'ariuser',
    password: process.env['ARI_PASSWORD'] || 'aripass',
    app: process.env['ARI_APP'] || 'crm-app',
    autoReconnect: true,
    reconnectDelayMs: 3000,
  };

  async connect() {
    if (process.env['DISABLE_ARI'] === 'true') {
      this.logger.log('ARI integration is disabled via DISABLE_ARI=true');
      return;
    }
    if (this.connected) return;
    try {
      const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
      this.logger.log(`Connecting to ARI ${baseUrl} (app=${this.config.app}, login: ${this.config.username})`);
      
      this.client = await (AriClient as any).connect(
        baseUrl,
        this.config.username,
        this.config.password
      );
      this.subscribeAllEvents();
      this.client.start(this.config.app);
      this.connected = true;
      this.logger.log('ARI connected and application started');
    } catch (err) {
      this.logger.error('ARI connect failed', err as Error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.config.autoReconnect) return;
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, this.config.reconnectDelayMs);
  }

  private subscribeAllEvents() {
    if (!this.client) return;
    const coreEvents = [
      'StasisStart',
      'StasisEnd',
      'ChannelCreated',
      'ChannelDestroyed',
      'ChannelStateChange',
      'ChannelDtmfReceived',
      'PlaybackStarted',
      'PlaybackFinished',
    ];
    coreEvents.forEach((evt) =>
      this.client.on(evt, (...args: unknown[]) => {
        const e = args[0];
        this.logEvent(evt, e);
        this.emitter.emit(evt, ...args);
      })
    );
    const ws = this.client._client && this.client._client.ws;
    if (ws) {
      ws.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type && !coreEvents.includes(parsed.type)) {
            this.logEvent(parsed.type, parsed);
          }
        } catch { /* ignore */ }
      });
      ws.on('close', () => {
        this.logger.warn('ARI websocket closed');
        this.connected = false;
        this.scheduleReconnect();
      });
      ws.on('error', (err: unknown) =>
        this.logger.error('ARI websocket error', err as Error)
      );
    }
  }

  private logEvent(type: string, payload: unknown) {
    const simplified: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
    if (simplified['channel'] && typeof simplified['channel'] === 'object') {
      const ch: any = simplified['channel'];
      simplified['channel'] = { id: ch.id, state: ch.state, name: ch.name };
    }
    this.logger.debug(`[ARI] ${type} ${JSON.stringify(simplified)}`);
  }

  async disconnect() {
    if (process.env['DISABLE_ARI'] === 'true') {
      this.logger.log('ARI integration disabled - skipping disconnect');
      this.connected = false;
      return;
    }
    try {
      this.client?._client?.ws?.close();
    } catch { /* ignore */ }
    this.connected = false;
  }

  isConnected() {
    return this.connected;
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.emitter.on(event, handler);
  }

  getClient(): any {
    return this.client;
  }

  async getChannels(): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('ARI not connected');
    }
    try {
      const channels = await this.client.channels.list();
      this.logger.debug(`[ARI] Retrieved ${channels.length} active channels`);
      return channels;
    } catch (err) {
      this.logger.error(`[ARI] Failed to get channels: ${(err as Error).message}`);
      throw err;
    }
  }

  async getBridges(): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('ARI not connected');
    }
    return this.client.bridges.list();
  }

  async getEndpoints(): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('ARI not connected');
    }
    return this.client.endpoints.list();
  }

  async answerChannel(channelId: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('ARI not connected');
    }
    await this.client.channels.answer({ channelId });
  }

  async hangupChannel(channelId: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('ARI not connected');
    }
    await this.client.channels.hangup({ channelId });
  }

  async playMedia(channelId: string, media: string): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('ARI not connected');
    }
    return this.client.channels.play({ channelId, media });
  }

  async createBridge(type = 'mixing'): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('ARI not connected');
    }
    return this.client.bridges.create({ type });
  }

  async addChannelToBridge(bridgeId: string, channelId: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('ARI not connected');
    }
    await this.client.bridges.addChannel({ bridgeId, channel: channelId });
  }
}
