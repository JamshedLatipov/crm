import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cdr } from '../entities/cdr.entity';
import { CallLog } from '../entities/call-log.entity';

@Injectable()
export class ReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Cdr) private readonly cdrRepo: Repository<Cdr>,
    @InjectRepository(CallLog) private readonly callLogRepo: Repository<CallLog>
  ) {}

  onModuleInit() {
    // run reconciliation every 10 seconds
    this.timer = setInterval(() => this.reconcileOnce().catch((e) => this.logger.warn('reconcile error', e)), 10000);
    this.logger.log('Reconciliation service started');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.logger.log('Reconciliation service stopped');
  }

  private async reconcileOnce() {
    const pending = await this.callLogRepo.find({ where: { status: 'awaiting_cdr' } });
    if (!pending || pending.length === 0) return;
    this.logger.debug(`Reconciling ${pending.length} pending call logs`);

    for (const cl of pending) {
      try {
        let found: Cdr | null = null;
        if (cl.clientCallId) {
          found = await this.cdrRepo.findOne({ where: { userfield: cl.clientCallId } });
        }
        if (!found && cl.sipCallId) {
          found = await this.cdrRepo.findOne({ where: { uniqueid: cl.sipCallId } });
        }
        if (!found && cl.callId) {
          // try matching by userfield as fallback
          found = await this.cdrRepo.findOne({ where: { userfield: cl.callId } });
        }

        if (found) {
          cl.asteriskUniqueId = found.uniqueid;
          cl.duration = found.duration;
          cl.disposition = found.disposition;
          cl.status = 'completed';
          cl.updatedAt = new Date();
          await this.callLogRepo.save(cl as any);
          this.logger.log(`CallLog ${cl.id} reconciled with CDR uniqueid=${found.uniqueid}`);
        }
      } catch (err) {
        this.logger.warn('Failed to reconcile call log', err as Error);
      }
    }
  }
}
