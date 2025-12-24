import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CallSummary } from '../entities/call-summary.entity';

@Injectable()
export class CallEnrichmentService {
  private readonly logger = new Logger(CallEnrichmentService.name);

  constructor(
    @InjectRepository(CallSummary)
    private readonly summaryRepo: Repository<CallSummary>,
  ) {}

  /**
   * Enrich call summaries with business context (leads, deals, contacts)
   * Can be called manually or scheduled
   */
  async enrichRecentCalls() {
    try {
      // Find calls without business context from last hour
      const recentCalls = await this.summaryRepo.find({
        where: [
          { leadId: IsNull() },
          { dealId: IsNull() },
          { contactId: IsNull() }
        ],
        order: { createdAt: 'DESC' },
        take: 100
      });

      if (recentCalls.length === 0) return;

      this.logger.log(`Enriching ${recentCalls.length} call summaries with business context`);

      for (const call of recentCalls) {
        await this.enrichSingleCall(call);
      }

      this.logger.log(`Enrichment complete`);
    } catch (error) {
      this.logger.error('Error enriching calls', error);
    }
  }

  private async enrichSingleCall(call: CallSummary) {
    // TODO: Implement lookup logic
    // 1. Search for lead by phone (caller field)
    // 2. Search for contact by phone
    // 3. Search for deal by contact
    // 4. Extract recording URL from CDR if available
    
    // Example:
    // const lead = await this.leadRepo.findOne({ where: { phone: call.caller } });
    // if (lead) {
    //   call.leadId = lead.id;
    //   await this.summaryRepo.save(call);
    // }

    this.logger.debug(`Enrichment for call ${call.uniqueId} - placeholder (implement CRM lookup)`);
  }

  /**
   * Tag calls based on patterns
   */
  async tagCall(uniqueId: string, tags: string[]) {
    const call = await this.summaryRepo.findOne({ where: { uniqueId } });
    if (!call) return;

    const existingTags = call.tags ? JSON.parse(call.tags) : [];
    const newTags = Array.from(new Set([...existingTags, ...tags]));
    
    call.tags = JSON.stringify(newTags);
    await this.summaryRepo.save(call);
    
    this.logger.log(`Tagged call ${uniqueId} with: ${tags.join(', ')}`);
  }

  /**
   * Update recording URL
   */
  async updateRecordingUrl(uniqueId: string, url: string) {
    await this.summaryRepo.update({ uniqueId }, { recordingUrl: url });
    this.logger.log(`Updated recording URL for call ${uniqueId}`);
  }
}
