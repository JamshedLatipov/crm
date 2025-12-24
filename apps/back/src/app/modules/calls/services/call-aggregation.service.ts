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
      // Find the last processed call timestamp (use calldate since cdrId is UUID)
      const lastSummary = await this.summaryRepo.find({
        order: { createdAt: 'DESC' },
        take: 1
      });

      let lastTimestamp: Date | undefined = undefined;
      if (lastSummary.length > 0 && lastSummary[0].startedAt) {
        lastTimestamp = lastSummary[0].startedAt;
      }

      // Fetch new CDRs by calldate. If we don't have a lastTimestamp yet, fetch from last 24 hours.
      const whereClause = lastTimestamp 
        ? { calldate: MoreThan(lastTimestamp) } 
        : { calldate: MoreThan(new Date(Date.now() - 86400000)) }; // Last 24 hours fallback
      
      const newCdrs = await this.cdrRepo.find({
        where: whereClause,
        order: { calldate: 'ASC' },
        take: 100 // Batch size
      });

      if (newCdrs.length === 0) return;

      this.logger.log(`Processing ${newCdrs.length} new CDRs for aggregation`);

      // Diagnostic: list uniqueIds for investigation
      const newUniqueIds = newCdrs.map(c => c.uniqueid);
      this.logger.debug(`New CDR uniqueIds count=${newUniqueIds.length}`);

      // Optimize: Fetch all traces in bulk
      // Deduplicate uniqueIds since one call can have multiple CDR records
      const uniqueIds = Array.from(new Set(newCdrs.map(c => c.uniqueid)));
      const traces = await this.traceService.getCallTraces(uniqueIds, newCdrs);
      this.logger.debug(`Traces returned: ${traces.length} from ${uniqueIds.length} unique calls`);

      const summaries: CallSummary[] = [];
      this.logger.debug(`Building summaries from traces`);

      for (const trace of traces) {
        // Check if uniqueId already exists in database is expensive in loop if not batched
        // But we can just rely on the unique constraint in DB for safety,
        // OR fetch existing IDs first.
        // Given 'take: 100', a `WHERE uniqueId IN (...)` is efficient.

        // We will skip existence check here and rely on INSERT ON CONFLICT DO NOTHING logic
        // or just try/catch individually if we want to process rest.
        // Or better: filter out existing ones beforehand.

        const s = trace.summary;
        // Fallback: if agent/answeredAt missing, try to infer from timeline
        let answeredAt = s.agentAnswerTime as Date | undefined;
        let agentName = s.agentAnswered as string | undefined;
        if (!answeredAt || !agentName) {
          for (const ev of trace.timeline) {
            if (!answeredAt && ev.type === 'CALL_LOG') {
              const d = ev.details || {};
              const evName = String(ev.event || '').toLowerCase();
              if (evName.includes('answer') || evName.includes('stasisstart') || d && d.createdBy) {
                if (!answeredAt) answeredAt = ev.timestamp;
                if (!agentName && d && d.createdBy) agentName = d.createdBy;
                if (answeredAt && agentName) break;
              }
            }
            if (!answeredAt && ev.type === 'QUEUE' && (ev.event === 'CONNECT' || ev.event === 'AGENTCONNECT')) {
              answeredAt = ev.timestamp;
              agentName = ev.details?.agent;
              break;
            }
          }
        }
        const ivrNodes = trace.timeline
          .filter(e => e.type === 'IVR' && e.event === 'NODE_EXECUTE')
          .map(e => e.details.nodeName || e.details.nodeId)
          .join(' -> ');

        // Find corresponding CDR for ID (may be missing if CDR not included in this batch)
        const cdr = newCdrs.find(c => c.uniqueid === trace.uniqueId);
        if (!cdr) {
          this.logger.debug(`No matching CDR found for trace ${trace.uniqueId}, creating summary without cdrId`);
        }

        // Calculate additional metrics
        const talkTime = cdr?.billsec ?? null;
        const ringTime = this.calculateRingTime(trace);
        const abandonTime = this.calculateAbandonTime(trace);
        const direction = this.detectDirection(cdr, trace);
        const ringCount = s.ignoredAgents?.length ?? 0;
        const firstResponseTime = this.calculateFirstResponseTime(trace);
        const disconnectReason = cdr ? `${cdr.disposition}${cdr.lastapp ? ` (${cdr.lastapp})` : ''}` : null;
        
        // SLA: violated if wait time > 30 seconds or abandoned after 20+ seconds
        const slaViolated = (s.queueWaitTime && s.queueWaitTime > 30) || 
                           (abandonTime && abandonTime > 20) || false;

        summaries.push(this.summaryRepo.create({
          uniqueId: trace.uniqueId,
          cdrId: cdr ? cdr.id : null,
          startedAt: s.startTime,
          endedAt: s.endTime,
          answeredAt: answeredAt || s.agentAnswerTime || null,
          duration: s.duration ?? null,
          caller: s.caller,
          destination: s.destination,
          status: s.answered ? 'ANSWERED' : (s.status || 'NO ANSWER'),
          queue: s.queueName || null,
          agent: agentName || s.agentAnswered || null,
          waitTime: s.queueWaitTime ?? null,
          hangupBy: s.hangupBy || null,
          ivrPath: ivrNodes || null,
          ignoredAgents: s.ignoredAgents ? JSON.stringify(s.ignoredAgents) : null,
          wasTransferred: s.wasTransferred || false,
          transferTarget: s.transferTarget || null,
          // New enriched fields
          talkTime,
          ringTime,
          abandonTime,
          direction,
          entryPoint: cdr?.dst || null,
          ringCount,
          slaViolated,
          firstResponseTime,
          disconnectReason,
          // Business context fields (will be filled later via separate service)
          leadId: null,
          dealId: null,
          contactId: null,
          recordingUrl: null,
          tags: null
        }));
      }

      // Bulk Save (or individual if we want to ignore duplicates per row)
      // save() in TypeORM iterates and saves. repo.insert() is bulk but no relations/listeners.
      // We'll stick to loop with error handling to avoid one dupe failing the whole batch,
      // or filter existing first. Filtering existing is safer.
      // Deduplicate summaries by uniqueId (in case traces produced duplicates)
      const summaryMap = new Map<string, CallSummary>();
      for (const s of summaries) {
        if (!summaryMap.has(s.uniqueId)) summaryMap.set(s.uniqueId, s);
      }

      const dedupedSummaries = Array.from(summaryMap.values());
      this.logger.debug(`Summaries built: ${dedupedSummaries.length} (deduped)`);

      const existing = await this.summaryRepo.find({ where: { uniqueId: In(uniqueIds) } });
      const existingIds = new Set(existing.map(e => e.uniqueId));
      this.logger.debug(`Existing summaries in DB for this batch: ${existing.length}`);

      const toSave = dedupedSummaries.filter(s => !existingIds.has(s.uniqueId));
      this.logger.debug(`To save after filtering existing: ${toSave.length}`);

      // Log up to 20 uniqueIds that didn't produce summaries
      const builtIds = new Set(dedupedSummaries.map(s => s.uniqueId));
      const missingFromSummaries = uniqueIds.filter(id => !builtIds.has(id));
      if (missingFromSummaries.length > 0) {
        this.logger.warn(`UniqueIds with no summary built: count=${missingFromSummaries.length} sample=${missingFromSummaries.slice(0,20).join(',')}`);
      }

      if (toSave.length > 0) {
        await this.summaryRepo.save(toSave);
        this.logger.log(`Saved ${toSave.length} summaries`);
      } else {
        this.logger.log('No new summaries to save for this batch');
      }
    } finally {
      this.isRunning = false;
    }
  }

  private calculateRingTime(trace: any): number | null {
    const enterQueue = trace.timeline.find((e: any) => e.type === 'QUEUE' && e.event === 'ENTERQUEUE');
    const connect = trace.timeline.find((e: any) => e.type === 'QUEUE' && e.event === 'CONNECT');
    
    if (enterQueue && connect) {
      return Math.floor((connect.timestamp.getTime() - enterQueue.timestamp.getTime()) / 1000);
    }
    return null;
  }

  private calculateAbandonTime(trace: any): number | null {
    const enterQueue = trace.timeline.find((e: any) => e.type === 'QUEUE' && e.event === 'ENTERQUEUE');
    const abandon = trace.timeline.find((e: any) => e.type === 'QUEUE' && e.event === 'ABANDON');
    
    if (enterQueue && abandon) {
      return Math.floor((abandon.timestamp.getTime() - enterQueue.timestamp.getTime()) / 1000);
    }
    return null;
  }

  private detectDirection(cdr: any, trace: any): string {
    if (!cdr) return 'inbound';
    
    // Simple heuristic: if src is internal extension (3-4 digits), it's outbound
    const src = cdr.src || '';
    const dst = cdr.dst || '';
    
    if (/^\d{3,4}$/.test(src) && !dst.startsWith('queue_')) {
      return 'outbound';
    }
    
    if (/^\d{3,4}$/.test(src) && /^\d{3,4}$/.test(dst)) {
      return 'internal';
    }
    
    return 'inbound';
  }

  private calculateFirstResponseTime(trace: any): number | null {
    if (trace.timeline.length < 2) return null;
    
    const start = trace.timeline[0];
    const firstResponse = trace.timeline.find((e: any) => 
      (e.type === 'IVR' && e.event !== 'CALL_START') ||
      (e.type === 'QUEUE' && e.event === 'CONNECT') ||
      (e.type === 'CALL_LOG' && e.event === 'answered')
    );
    
    if (start && firstResponse) {
      return Math.floor((firstResponse.timestamp.getTime() - start.timestamp.getTime()) / 1000);
    }
    
    return null;
  }
}
