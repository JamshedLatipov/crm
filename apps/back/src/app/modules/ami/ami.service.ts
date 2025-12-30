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
      
      // Remove old listeners before creating new client to prevent memory leaks
      if (this.client) {
        this.client.removeAllListeners();
      }
      
      this.client = new Ami();
      
      // Increase max listeners limit to prevent warning during reconnections
      this.client.setMaxListeners(20);
      
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
      if (!name) return;
    
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

  /**
   * Send AMI action and return response
   */
  async action(action: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.connected || !this.client) {
      this.logger.warn(`AMI action ${action} called but not connected`);
      throw new Error('AMI not connected');
    }

    try {
      const response = await this.client.action({
        Action: action,
        ...params,
      });
      return response;
    } catch (err) {
      this.logger.error(`AMI action ${action} failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Check if AMI is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get AMI client for direct access (use carefully)
   */
  getClient(): any {
    return this.client;
  }
}
