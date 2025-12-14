import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AriService } from '../../ari/ari.service';
import { Cdr } from '../entities/cdr.entity';
import { CallLog } from '../entities/call-log.entity';

@Injectable()
export class AriReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AriReconciliationService.name);
  private readonly handlers: Array<() => void> = [];

  constructor(
    private readonly ari: AriService,
    @InjectRepository(Cdr) private readonly cdrRepo: Repository<Cdr>,
    @InjectRepository(CallLog) private readonly callLogRepo: Repository<CallLog>,
  ) {}

  onModuleInit() {
    // subscribe to channel destroyed events for near-realtime reconciliation
    try {
      const h = (evt: any) => this.onChannelDestroyed(evt).catch((e) => this.logger.warn('onChannelDestroyed failed', e));
      this.ari.on('ChannelDestroyed', h);
      this.handlers.push(() => this.ari.on('ChannelDestroyed', () => {}));
      this.logger.log('ARI reconciliation listener registered for ChannelDestroyed');
    } catch (e) {
      this.logger.warn('Failed to register ARI reconciliation listener', e as Error);
    }
  }

  onModuleDestroy() {
    // nothing to unbind explicitly from AriService.emitter
    this.logger.log('ARI reconciliation listener stopped');
  }

  private async onChannelDestroyed(evt: any) {
    try {
      const channel = evt && (evt.channel || evt);
      if (!channel) return;

      // look for client id in channel variables (set via __CLIENT_CALL_ID in dialplan)
      const vars = channel.variables || {};
      const clientCallId = vars.CLIENT_CALL_ID || vars.client_call_id || vars.clientCallId || vars['CLIENT_CALL_ID'];
      const channelUniqueId = channel.uniqueid || channel.id || null;

      if (!clientCallId && !channelUniqueId) return;

      // Wait briefly to allow Asterisk to write CDR row
      await new Promise((res) => setTimeout(res, 1500));

      let found: Cdr | null = null;
      if (clientCallId) {
        found = await this.cdrRepo.findOne({ where: { userfield: clientCallId } });
      }
      if (!found && channelUniqueId) {
        // try matching by uniqueid
        found = await this.cdrRepo.findOne({ where: { uniqueid: channelUniqueId } });
      }

      if (!found) {
        this.logger.debug('No CDR found for channel', { clientCallId, channelUniqueId });
        return;
      }

      // find pending call logs that reference this clientCallId or channelUniqueId
      const candidates = await this.callLogRepo.find({ where: [
        { clientCallId: clientCallId ?? undefined, status: 'awaiting_cdr' },
        { sipCallId: channelUniqueId ?? undefined, status: 'awaiting_cdr' },
      ] });

      for (const cl of candidates) {
        cl.asteriskUniqueId = found.uniqueid;
        cl.duration = found.duration;
        cl.disposition = found.disposition;
        cl.status = 'completed';
        cl.updatedAt = new Date();
        try {
          await this.callLogRepo.save(cl as any);
          this.logger.log(`Reconciled CallLog ${cl.id} with CDR uniqueid=${found.uniqueid}`);
        } catch (err) {
          this.logger.warn('Failed to save reconciled call log', err as Error);
        }
      }
    } catch (err) {
      this.logger.warn('onChannelDestroyed reconciliation error', err as Error);
    }
  }
}
