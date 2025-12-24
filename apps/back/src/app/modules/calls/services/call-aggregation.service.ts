import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cdr } from '../entities/cdr.entity';
import { CallSummary } from '../entities/call-summary.entity';
import { CallTraceService } from './call-trace.service';

@Injectable()
export class CallAggregationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CallAggregationService.name);
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    @InjectRepository(Cdr) private readonly cdrRepo: Repository<Cdr>,
    @InjectRepository(CallSummary) private readonly summaryRepo: Repository<CallSummary>,
    private readonly traceService: CallTraceService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.aggregateRecentCalls().catch(err =>
      this.logger.error('Error in aggregation loop', err)
    ), 15000); // Check every 15s
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async aggregateRecentCalls() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      // Find the last processed CDR ID
      const lastSummary = await this.summaryRepo.find({
        order: { cdrId: 'DESC' },
        take: 1
      });

      let lastId = 0;
      if (lastSummary.length > 0 && lastSummary[0].cdrId) {
        lastId = lastSummary[0].cdrId;
      }

      // Fetch new CDRs
      const newCdrs = await this.cdrRepo.find({
        where: { id: MoreThan(lastId) },
        order: { id: 'ASC' },
        take: 100 // Batch size
      });

      if (newCdrs.length === 0) return;

      this.logger.log(`Processing ${newCdrs.length} new CDRs for aggregation`);

      for (const cdr of newCdrs) {
        // Check if already exists (idempotency)
        const exists = await this.summaryRepo.findOne({ where: { uniqueId: cdr.uniqueid } });
        if (exists) {
            // Update cdrId if missing? Or just skip.
            // If exists but no cdrId, we might want to update it, but keeping it simple: skip
            continue;
        }

        const trace = await this.traceService.getCallTrace(cdr.uniqueid);
        if (!trace) continue; // Should not happen if CDR exists, but safety check

        const s = trace.summary;
        // Extract IVR path
        const ivrNodes = trace.timeline
          .filter(e => e.type === 'IVR' && e.event === 'NODE_EXECUTE')
          .map(e => e.details.nodeName || e.details.nodeId)
          .join(' -> ');

        const summary = this.summaryRepo.create({
          uniqueId: cdr.uniqueid,
          cdrId: cdr.id,
          startedAt: s.startTime,
          endedAt: s.endTime,
          answeredAt: s.agentAnswerTime,
          duration: s.duration,
          caller: s.caller,
          destination: s.destination,
          status: s.answered ? 'ANSWERED' : (s.status || 'NO ANSWER'),
          queue: s.queueName,
          agent: s.agentAnswered,
          waitTime: s.queueWaitTime,
          hangupBy: s.hangupBy,
          ivrPath: ivrNodes
        });

        await this.summaryRepo.save(summary);
      }
    } finally {
      this.isRunning = false;
    }
  }
}
