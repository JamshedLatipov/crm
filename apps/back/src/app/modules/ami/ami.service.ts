import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import AmiClient from 'asterisk-ami-client';
import { AriEventStoreService } from '../ari/ari-event-store.service';

@Injectable()
export class AmiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmiService.name);
  private client?: any;
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(private readonly store?: AriEventStoreService) {}

  async onModuleInit() {
    this.logger.log('AMI service initializing');
    await this.connect();
  }

  async onModuleDestroy() {
    this.logger.log('AMI service shutting down');
    try {
      if (this.client && this.connected) {
        await this.client.disconnect();
      }
    } catch (e) {
      this.logger.warn('Error while disconnecting AMI client');
    }
    this.connected = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  private getConfig() {
    return {
      host: process.env.AMI_HOST || '127.0.0.1',
      port: Number(process.env.AMI_PORT || '5038'),
      username: process.env.AMI_USER || 'admin',
      password: process.env.AMI_PASSWORD || 'amp111',
      reconnect: true,
    };
  }

  async connect() {
    if (this.connected) return;
    const cfg = this.getConfig();
    this.logger.log(`Connecting to AMI ${cfg.host}:${cfg.port} as ${cfg.username}`);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Ami = AmiClient; // imported at top
      this.client = new Ami();
      this.client.on('event', (evt: any) => this.onEvent(evt));
      this.client.on('disconnect', () => this.onDisconnect());
      this.client.on('reconnection', () => this.logger.log('AMI reconnection'));
      await this.client.connect(cfg.username, cfg.password, { host: cfg.host, port: cfg.port });
      this.connected = true;
      this.logger.log('AMI connected');
    } catch (err) {
      this.logger.error('AMI connect failed: ' + (err && (err as Error).message));
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.logger.log('Scheduling AMI reconnect in 5s');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect().catch(() => undefined);
    }, 5000);
  }

  private onDisconnect() {
    this.logger.warn('AMI disconnected');
    this.connected = false;
    this.scheduleReconnect();
  }

  private async onEvent(evt: any) {
    try {
      // Filter queue-related events (AMI sends many event names; queue events often start with 'Queue' or include 'Queue')
      const name = String(evt?.Event || evt?.event || evt?.name || 'Unknown');
      console.debug('AMI Event received:', name, '---------------------------------');
      if (!name) return;
    //   if (!/queue/i.test(name)) return; // ignore non-queue events by default

      try {
        console.debug('[AMI EVENT]', name, evt);
      } catch {}

      if (this.store) {
        try {
          await this.store.write({
            event: `AMI:${name}`,
            channelId: evt?.Uniqueid || evt?.Channel || null,
            payload: evt ?? null,
            raw: JSON.stringify(evt ?? null),
          });
        } catch (e) {
          this.logger.warn('Failed to persist AMI event: ' + (e as Error).message);
        }
      }
    } catch (e) {
      this.logger.warn('Error handling AMI event: ' + String((e as Error).message));
    }
  }
}
