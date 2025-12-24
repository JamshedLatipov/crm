import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
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

      // Optimize: Fetch all traces in bulk
      const uniqueIds = newCdrs.map(c => c.uniqueid);
      const traces = await this.traceService.getCallTraces(uniqueIds, newCdrs);

      const summaries = [];

      for (const trace of traces) {
        // Check if uniqueId already exists in database is expensive in loop if not batched
        // But we can just rely on the unique constraint in DB for safety,
        // OR fetch existing IDs first.
        // Given 'take: 100', a `WHERE uniqueId IN (...)` is efficient.

        // We will skip existence check here and rely on INSERT ON CONFLICT DO NOTHING logic
        // or just try/catch individually if we want to process rest.
        // Or better: filter out existing ones beforehand.

        const s = trace.summary;
        const ivrNodes = trace.timeline
          .filter(e => e.type === 'IVR' && e.event === 'NODE_EXECUTE')
          .map(e => e.details.nodeName || e.details.nodeId)
          .join(' -> ');

        // Find corresponding CDR for ID
        const cdr = newCdrs.find(c => c.uniqueid === trace.uniqueId);
        if (!cdr) continue;

        summaries.push(this.summaryRepo.create({
          uniqueId: trace.uniqueId,
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
          ivrPath: ivrNodes,
          ignoredAgents: s.ignoredAgents ? JSON.stringify(s.ignoredAgents) : null,
          wasTransferred: s.wasTransferred || false,
          transferTarget: s.transferTarget
        }));
      }

      // Bulk Save (or individual if we want to ignore duplicates per row)
      // save() in TypeORM iterates and saves. repo.insert() is bulk but no relations/listeners.
      // We'll stick to loop with error handling to avoid one dupe failing the whole batch,
      // or filter existing first. Filtering existing is safer.
      const existing = await this.summaryRepo.find({ where: { uniqueId: In(uniqueIds) } });
      const existingIds = new Set(existing.map(e => e.uniqueId));

      const toSave = summaries.filter(s => !existingIds.has(s.uniqueId));

      if (toSave.length > 0) {
        await this.summaryRepo.save(toSave);
        this.logger.log(`Saved ${toSave.length} summaries`);
      }
    } finally {
      this.isRunning = false;
    }
  }
}
