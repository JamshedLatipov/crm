import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineStage, PipelineLead } from './pipeline.entity';
import { LeadService } from '../leads/lead.service';
import { Lead } from '../leads/lead.entity';
import { Deal } from '../deals/deal.entity';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ContactsService } from '../contacts/contacts.service';
import { DataSource } from 'typeorm';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    @InjectRepository(PipelineStage)
    private stagesRepo: Repository<PipelineStage>,
    @InjectRepository(PipelineLead)
    private leadsRepo: Repository<PipelineLead>,
    @InjectRepository(Deal)
    private dealsRepo: Repository<Deal>,
  private dataSource: DataSource,
  private contactsService: ContactsService,
  private leadService: LeadService,
  ) {}

  // Stages
  createStage(dto: CreateStageDto) {
    const st = this.stagesRepo.create(dto as any);
    return this.stagesRepo.save(st);
  }

  listStages() {
    return this.stagesRepo.find({ order: { position: 'ASC' } });
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    await this.stagesRepo.update(id, dto as any);
    return this.stagesRepo.findOneBy({ id });
  }

  // Leads
  createLead(dto: CreateLeadDto) {
    const l = this.leadsRepo.create(dto as any);
    return this.leadsRepo.save(l);
  }

  listLeads() {
    return this.leadsRepo.find({ order: { updatedAt: 'DESC' } });
  }

  async updateLead(id: string, dto: UpdateLeadDto) {
    await this.leadsRepo.update(id, dto as any);
    return this.leadsRepo.findOneBy({ id });
  }

  // Simple automation: move lead to next stage when meta.triggerNext === true
  async processAutomation() {
    const leads = await this.leadsRepo.find();
    const stages = await this.stagesRepo.find({ order: { position: 'ASC' } });
    const stageIndexById = new Map(stages.map((s, i) => [s.id, i]));

    for (const lead of leads) {
      try {
        if (lead.meta && (lead.meta as any).triggerNext) {
          const idx = lead.stageId ? stageIndexById.get(lead.stageId) ?? -1 : -1;
          const next = stages[idx + 1];
          if (next) {
            lead.stageId = next.id;
            // clear trigger
            if (lead.meta) delete (lead.meta as any).triggerNext;
            await this.leadsRepo.save(lead);
            this.logger.log(`Moved lead ${lead.id} to stage ${next.name}`);
          }
        }
      } catch (err) {
        this.logger.error('Automation error', err as any);
      }
    }
  }

  // Simple analytics: conversion rates per stage (counts only)
  async analytics() {
    const stages = await this.stagesRepo.find({ order: { position: 'ASC' } });
    const deals = await this.dealsRepo.find();
    const total = deals.length || 1;
    const byStage = stages.map((s) => ({
      id: s.id,
      name: s.name,
      count: deals.filter((d) => d.stageId === s.id).length,
      conversion: +( (deals.filter((d) => d.stageId === s.id).length / total) * 100 ).toFixed(2),
    }));
    return { total: deals.length, byStage };
  }

  // Reorder stages by an array of stage IDs; positions will be updated to the array index order
  async reorderStages(stageIds: string[]) {
    if (!Array.isArray(stageIds)) return this.listStages();

    return this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < stageIds.length; i++) {
        const id = stageIds[i];
        await manager.update(PipelineStage, { id }, { position: i });
      }
      // Return reordered list
      return manager.find(PipelineStage, { order: { position: 'ASC' } });
    });
  }

  // Create Contact from a PipelineLead
  async createContactFromLead(leadId: string) {
    // Try to detect whether the provided id is a UUID for pipeline_leads or a numeric id for main leads
    let pipelineLead: PipelineLead | null = null;
    let mainLead: Lead | null = null;

    // First, attempt to load as pipeline lead (UUID). If it fails due to invalid UUID, fall back.
    try {
      pipelineLead = await this.leadsRepo.findOneBy({ id: leadId });
    } catch (err) {
      // ignore parse errors from DB driver; we'll try numeric lookup next
      pipelineLead = null;
    }

    if (!pipelineLead) {
      // If leadId looks like an integer, try to load from main leads via LeadService
      const asNumber = Number(leadId);
      if (!Number.isNaN(asNumber) && Number.isInteger(asNumber)) {
        mainLead = await this.leadService.findById(asNumber);
        if (!mainLead) throw new NotFoundException(`Lead ${leadId} not found`);
      } else {
        // If not numeric and not found as pipeline lead, return not found
        throw new NotFoundException(`Lead ${leadId} not found`);
      }
    }

    // Map available fields to contact DTO
    const contactDto: any = {
      name: (pipelineLead ? pipelineLead.title : mainLead?.name) || 'Unknown',
      email: pipelineLead ? ((pipelineLead.meta && (pipelineLead.meta as any).email) || undefined) : mainLead?.email,
      phone: pipelineLead ? ((pipelineLead.meta && (pipelineLead.meta as any).phone) || undefined) : mainLead?.phone,
      source: pipelineLead ? ((pipelineLead.meta && (pipelineLead.meta as any).source) || undefined) : mainLead?.source,
      notes: `Created from lead ${pipelineLead ? pipelineLead.id : mainLead?.id}`,
      isActive: true,
    };

    const created = await this.contactsService.createContact(contactDto);

    // Save reference back on pipelineLead if it exists, otherwise do nothing to main leads table
    if (pipelineLead) {
      pipelineLead.contact = created.id as any;
      await this.leadsRepo.save(pipelineLead);
    } else if (mainLead) {
      // Optionally, if desired, we could store the contact id on main lead; current main Lead entity has no contact column.
      // For now, log and return created contact.
      this.logger.log(`Created contact ${created.id} from main lead ${mainLead.id}`);
    }

    return created;
  }
}
