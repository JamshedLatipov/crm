import { Injectable, Logger } from '@nestjs/common';
import { AriService } from '../../ari/ari.service';

@Injectable()
export class CallTransferService {
  private readonly logger = new Logger(CallTransferService.name);
  constructor(private readonly ari: AriService) {}

  async blindTransfer(channelId: string, target: string) {
    const client = this.ari.getClient();
    if (!client) throw new Error('ARI client not available');
    this.logger.log(`Blind transfer ${channelId} -> ${target}`);
    const aricontext = process.env.ASTERISK_FROM_ARI_CONTEXT || 'from-ari';
    
    try {
      // Normalize target: if it's a bare token (no '/'), treat it as a dialplan extension
      const normalized = target.includes('/') ? target : `Local/${target}@${aricontext}`;
      await client.channels.redirect({ channelId, endpoint: normalized });
    } catch {
      this.logger.warn('redirect failed, trying originate as fallback');
      try {
        const appName = process.env.ARI_APP || 'crm-app';
        const ep = target.includes('/') ? target : `Local/${target}@${aricontext}`;
        const originateParams = { endpoint: ep, app: appName, callerId: channelId };
        this.logger.debug(`ARI originate params (call-transfer fallback): ${JSON.stringify(originateParams)}`);
        await client.channels.originate(originateParams);
      } catch (e) {
        this.logger.error('Blind transfer failed', e as Error);
        throw e;
      }
    }
  }

  async attendedTransfer(channelId: string, target: string) {
    const client = this.ari.getClient();
    if (!client) throw new Error('ARI client not available');
    this.logger.log(`Attended transfer ${channelId} -> ${target}`);
    try {
      const bridge = await client.bridges.create({ type: 'mixing' });
  const aricontext = process.env.ASTERISK_FROM_ARI_CONTEXT || 'from-ari';
      const appName = process.env.ARI_APP || 'crm-app';
      const ep = target.includes('/') ? target : `Local/${target}@${aricontext}`;
      const orig = await client.channels.originate({
        endpoint: ep,
        app: appName,
        callerId: channelId,
      });
      const newChannelId =
        orig && (orig.id || (orig.channel && orig.channel.id));
      if (newChannelId) {
        await client.bridges.addChannel({
          bridgeId: bridge.id,
          channel: [channelId, newChannelId],
        });
      } else {
        this.logger.warn(
          'Unable to determine new channel id for attended transfer'
        );
      }
    } catch (err) {
      this.logger.error('Attended transfer failed', err as Error);
      throw err;
    }
  }
}
