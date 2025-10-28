import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineStage, PipelineLead, StageType, AutomationRule } from './pipeline.entity';
import { LeadService } from '../leads/lead.service';
import { Lead } from '../leads/lead.entity';
import { Deal } from '../deals/deal.entity';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { PipelineCreateLeadDto } from './dto/create-lead.dto';
import { PipelineUpdateLeadDto } from './dto/update-lead.dto';
import { ContactsService } from '../contacts/contacts.service';
import { ContactSource } from '../contacts/contact.entity';
import { DataSource } from 'typeorm';
import { CreateContactDto } from '../contacts/dto/create-contact.dto';
import { CompaniesService } from '../companies/services/companies.service';
import { AssignmentService } from '../shared/services/assignment.service';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation.dto';

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
    @InjectRepository(AutomationRule)
    private automationRulesRepo: Repository<AutomationRule>,
    private dataSource: DataSource,
  private contactsService: ContactsService,
  @Inject(forwardRef(() => LeadService))
  private leadService: LeadService,
    private companiesService: CompaniesService,
    private assignmentService: AssignmentService,
  ) {}

  // Stages
  createStage(dto: CreateStageDto) {
    const st = this.stagesRepo.create(dto);
    return this.stagesRepo.save(st);
  }

  listStages(type?: StageType) {
    if (type) {
      return this.stagesRepo.find({ 
        where: { type },
        order: { position: 'ASC' } 
      });
    }
    return this.stagesRepo.find({ order: { position: 'ASC' } });
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    await this.stagesRepo.update(id, dto);
    return this.stagesRepo.findOneBy({ id });
  }

  // Leads
  createLead(dto: PipelineCreateLeadDto) {
    const l = this.leadsRepo.create(dto);
    return this.leadsRepo.save(l);
  }

  listLeads() {
    return this.leadsRepo.find({ order: { updatedAt: 'DESC' } });
  }

  async updateLead(id: string, dto: PipelineUpdateLeadDto) {
    await this.leadsRepo.update(id, dto);
    return this.leadsRepo.findOneBy({ id });
  }

  // Simple automation: move lead to next stage when meta.triggerNext === true
  async processAutomation() {
    const leads = await this.leadsRepo.find();
    const stages = await this.stagesRepo.find({ order: { position: 'ASC' } });
    const stageIndexById = new Map(stages.map((s, i) => [s.id, i]));

    let processedCount = 0;

    for (const lead of leads) {
      try {
        interface LeadMeta {
          triggerNext?: boolean;
          [key: string]: unknown;
        }

        if (lead.meta && (lead.meta as LeadMeta).triggerNext) {
          const idx = lead.stageId
            ? stageIndexById.get(lead.stageId) ?? -1
            : -1;
          const next = stages[idx + 1];
          if (next) {
            lead.stageId = next.id;
            // clear trigger
            if (lead.meta) delete (lead.meta as LeadMeta).triggerNext;
            await this.leadsRepo.save(lead);
            this.logger.log(`Moved lead ${lead.id} to stage ${next.name}`);
            processedCount++;
          }
        }
      } catch (err) {
        this.logger.error('Automation error', err);
      }
    }

    return {
      success: true,
      message: `Automation completed. Processed ${processedCount} leads.`,
      processedCount
    };
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
      conversion: +(
        (deals.filter((d) => d.stageId === s.id).length / total) *
        100
      ).toFixed(2),
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

  async createContactFromLead(leadId: string) {
    let mainLead: Lead | null = null;
    
    const asNumber = Number(leadId);

    
    if (!Number.isNaN(asNumber) && Number.isInteger(asNumber)) {
      mainLead = await this.leadService.findById(asNumber);
      if (!mainLead) throw new NotFoundException(`Lead ${leadId} not found`);
    } else {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    console.log('Main lead data:', mainLead);

    // Получаем текущие назначения лида
    const currentAssignments = await this.assignmentService.getCurrentAssignments('lead', mainLead.id.toString());
    const assignedTo = currentAssignments.length > 0 ? currentAssignments[0].userId.toString() : undefined;

    // If mainLead has a full name, try to split to first/last
    let mainFirst: string | undefined;
    let mainLast: string | undefined;
    if (mainLead && mainLead.name) {
      const parts = mainLead.name.trim().split(/\s+/);
      if (parts.length === 1) {
        mainFirst = parts[0];
      } else if (parts.length >= 2) {
        mainFirst = parts[0];
        mainLast = parts.slice(1).join(' ');
      }
    }

    const contactDto: CreateContactDto = {
      name: mainLead?.name || 'Unknown',
      firstName: mainFirst || undefined,
      lastName: mainLast || undefined,
      email: mainLead?.email || mainLead?.email || undefined,
      phone: mainLead?.phone || mainLead?.phone || undefined,
      mobilePhone: mainLead?.phone || undefined,
      website: mainLead.website || mainLead?.website || undefined,
  company: mainLead && mainLead.company ? { id: mainLead.company.id, name: mainLead.company.name } : undefined,
      // Normalize address: prefer structured meta, else assemble from lead fields
      address:
        (mainLead
          ? {
              street: mainLead.address || undefined,
              city: mainLead.city || undefined,
              country: mainLead.country || undefined,
            }
          : undefined),
      source: ((): ContactSource | undefined => {
        const s = mainLead.source || (mainLead ? mainLead.source : undefined);
        if (!s) return undefined;
        const asStr = String(s);
        return (Object.values(ContactSource) as string[]).includes(asStr)
          ? (asStr as ContactSource)
          : undefined;
      })(),
      assignedTo: assignedTo,
      tags: mainLead.tags || undefined,
      notes: `Created from lead ${mainLead?.id}`,
      isActive: true,
    };

    return await this.contactsService.createContact(contactDto);
  }

  // Automation Rules
  async createAutomationRule(dto: CreateAutomationRuleDto): Promise<AutomationRule> {
    const rule = this.automationRulesRepo.create({
      ...dto,
      priority: dto.priority ?? 0,
    });
    return this.automationRulesRepo.save(rule);
  }

  async listAutomationRules(): Promise<AutomationRule[]> {
    return this.automationRulesRepo.find({
      order: { priority: 'ASC', createdAt: 'DESC' }
    });
  }

  async getAutomationRule(id: string): Promise<AutomationRule> {
    const rule = await this.automationRulesRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Automation rule ${id} not found`);
    }
    return rule;
  }

  async updateAutomationRule(id: string, dto: UpdateAutomationRuleDto): Promise<AutomationRule> {
    await this.automationRulesRepo.update(id, dto);
    return this.getAutomationRule(id);
  }

  async deleteAutomationRule(id: string): Promise<void> {
    const result = await this.automationRulesRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Automation rule ${id} not found`);
    }
  }

  async toggleAutomationRule(id: string): Promise<AutomationRule> {
    const rule = await this.getAutomationRule(id);
    rule.isActive = !rule.isActive;
    return this.automationRulesRepo.save(rule);
  }
}
