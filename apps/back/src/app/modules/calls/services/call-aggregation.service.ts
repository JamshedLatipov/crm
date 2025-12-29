import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { Cdr } from '../entities/cdr.entity';
import { CallSummary } from '../entities/call-summary.entity';
import { CallTraceService } from './call-trace.service';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';

@Injectable()
export class CallAggregationService {
  private readonly logger = new Logger(CallAggregationService.name);
  private isRunning = false;


  constructor(
    @InjectRepository(Cdr) private readonly cdrRepo: Repository<Cdr>,
    @InjectRepository(CallSummary) private readonly summaryRepo: Repository<CallSummary>,
    private readonly traceService: CallTraceService,
  ) {}

  @Cron("*/10 * * * * *")
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
      this.logger.log(`Processing ${uniqueIds.length} unique calls (from ${newCdrs.length} CDR records)`);
      
      const traces = await this.traceService.getCallTraces(uniqueIds, newCdrs);
      this.logger.log(`Traces returned: ${traces.length} from ${uniqueIds.length} unique calls`);
      
      // Log missing traces early
      if (traces.length < uniqueIds.length) {
        const traceIds = new Set(traces.map(t => t.uniqueId));
        const missingIds = uniqueIds.filter(id => !traceIds.has(id));
        this.logger.warn(`${missingIds.length} calls did not produce traces. Sample IDs: ${missingIds.slice(0, 5).join(', ')}`);
        // Log corresponding CDR info for first missing ID
        if (missingIds.length > 0) {
          const sampleCdr = newCdrs.find(c => c.uniqueid === missingIds[0]);
          if (sampleCdr) {
            this.logger.debug(`Sample missing CDR: uniqueid=${sampleCdr.uniqueid}, src=${sampleCdr.src}, dst=${sampleCdr.dst}, disposition=${sampleCdr.disposition}, calldate=${sampleCdr.calldate}`);
          }
        }
      }

      const summaries: CallSummary[] = [];
      this.logger.debug(`Building summaries from ${traces.length} traces`);

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
          this.logger.warn(`No matching CDR found for trace ${trace.uniqueId}, creating summary without cdrId`);
        }

        // Calculate additional metrics
        const talkTime = this.calculateTalkTime(trace, cdr, answeredAt || s.agentAnswerTime);
        const ringTime = this.calculateRingTime(trace);
        const abandonTime = this.calculateAbandonTime(trace);
        const direction = this.detectDirection(cdr, trace);
        const ringCount = s.ignoredAgents?.length ?? 0;
        const firstResponseTime = this.calculateFirstResponseTime(trace);
        const disconnectReason = cdr ? `${cdr.disposition}${cdr.lastapp ? ` (${cdr.lastapp})` : ''}` : null;
        
        // SLA: violated if wait time > 30 seconds or abandoned after 20+ seconds
        const slaViolated = (s.queueWaitTime && s.queueWaitTime > 30) || 
                           (abandonTime && abandonTime > 20) || false;

        // Recording URL - check if recording file exists
        const recordingUrl = this.buildRecordingUrl(trace.uniqueId);

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
          recordingUrl,
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

      // Log uniqueIds that didn't produce summaries (should match missing traces)
      const builtIds = new Set(dedupedSummaries.map(s => s.uniqueId));
      const missingFromSummaries = uniqueIds.filter(id => !builtIds.has(id));
      if (missingFromSummaries.length > 0) {
        this.logger.error(`⚠️ ${missingFromSummaries.length} uniqueIds failed to create summaries. Sample IDs: ${missingFromSummaries.slice(0, 10).join(', ')}`);
        // Log details of first few missing
        for (let i = 0; i < Math.min(3, missingFromSummaries.length); i++) {
          const missId = missingFromSummaries[i];
          const missTrace = traces.find(t => t.uniqueId === missId);
          const missCdr = newCdrs.find(c => c.uniqueid === missId);
          this.logger.debug(`Missing summary detail [${i}]: uniqueId=${missId}, hasTrace=${!!missTrace}, hasCdr=${!!missCdr}`);
          if (missCdr) {
            this.logger.debug(`  CDR: src=${missCdr.src}, dst=${missCdr.dst}, disposition=${missCdr.disposition}`);
          }
        }
      }

      if (toSave.length > 0) {
        try {
          await this.summaryRepo.save(toSave);
          this.logger.log(`✅ Successfully saved ${toSave.length} summaries`);
        } catch (err) {
          this.logger.error(`❌ Error saving summaries: ${err.message}`, err.stack);
          // Try to save individually to identify problematic records
          let savedCount = 0;
          for (const summary of toSave) {
            try {
              await this.summaryRepo.save(summary);
              savedCount++;
            } catch (e) {
              this.logger.error(`Failed to save summary for uniqueId=${summary.uniqueId}: ${e.message}`);
            }
          }
          this.logger.log(`Saved ${savedCount}/${toSave.length} summaries individually`);
        }
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

  private calculateTalkTime(trace: any, cdr: any, answeredAt: Date | null): number | null {
    // TalkTime = время от момента ответа до завершения звонка
    
    // Приоритет 1: Вычисляем от answeredAt до endTime (наиболее точно)
    if (answeredAt && trace.summary.endTime) {
      const talkSeconds = Math.floor((trace.summary.endTime.getTime() - answeredAt.getTime()) / 1000);
      return talkSeconds > 0 ? talkSeconds : null;
    }
    
    // Приоритет 2: Для звонков через очередь - от CONNECT до конца
    const connect = trace.timeline.find((e: any) => e.type === 'QUEUE' && (e.event === 'CONNECT' || e.event === 'AGENTCONNECT'));
    if (connect && trace.summary.endTime) {
      const talkSeconds = Math.floor((trace.summary.endTime.getTime() - connect.timestamp.getTime()) / 1000);
      return talkSeconds > 0 ? talkSeconds : null;
    }
    
    // Приоритет 3: Используем billsec из CDR (может быть неточным для очередей)
    if (cdr?.billsec && cdr.billsec > 0 && cdr.billsec < (cdr.duration || Infinity)) {
      return cdr.billsec;
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

  private buildRecordingUrl(uniqueId: string): string | null {
    // For now, always generate URL - the controller will handle 404 if file doesn't exist
    // In production, you might want to check file existence here
    if (!uniqueId) return null;
    
    // Sanitize uniqueId
    const sanitized = uniqueId.replace(/[^a-zA-Z0-9.\-_]/g, '');
    return `/api/calls/recordings/${sanitized}`;
  }
}
