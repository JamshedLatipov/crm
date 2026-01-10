import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import AmiClient from 'asterisk-ami-client';

@Injectable()
export class AmiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmiService.name);
  private client?: any;
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;

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
      host: process.env['AMI_HOST'] || '127.0.0.1',
      port: Number(process.env['AMI_PORT'] || '5038'),
      username: process.env['AMI_USER'] || 'admin',
      password: process.env['AMI_PASSWORD'] || 'amp111',
      reconnect: true,
    };
  }

  async connect() {
    if (this.connected) return;
    const cfg = this.getConfig();
    this.logger.log(`Connecting to AMI ${cfg.host}:${cfg.port} as ${cfg.username}`);
    try {
      const Ami = AmiClient;
      
      if (this.client) {
        this.client.removeAllListeners();
      }
      
      this.client = new Ami();
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
      const name = String(evt?.Event || evt?.event || evt?.name || 'Unknown');
      if (!name) return;
      this.logger.debug(`[AMI] Event: ${name}`);
    } catch (e) {
      this.logger.warn('Error handling AMI event: ' + String((e as Error).message));
    }
  }

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

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): any {
    return this.client;
  }

  // AMI Actions
  async originate(channel: string, extension: string, context: string, priority = 1, variables?: Record<string, string>) {
    return this.action('Originate', {
      Channel: channel,
      Extension: extension,
      Context: context,
      Priority: priority,
      ...(variables ? { Variable: Object.entries(variables).map(([k, v]) => `${k}=${v}`).join(',') } : {}),
    });
  }

  async hangup(channel: string) {
    return this.action('Hangup', { Channel: channel });
  }

  async redirect(channel: string, extension: string, context: string, priority = 1) {
    return this.action('Redirect', {
      Channel: channel,
      Exten: extension,
      Context: context,
      Priority: priority,
    });
  }

  async getQueueStatus(queue?: string) {
    return this.action('QueueStatus', queue ? { Queue: queue } : {});
  }

  async getPeerStatus(peer?: string) {
    return this.action('PJSIPShowEndpoints', peer ? { Endpoint: peer } : {});
  }
}
