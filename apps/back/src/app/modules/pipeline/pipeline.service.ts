import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineStage, PipelineLead } from './pipeline.entity';
import { Deal } from '../deals/deal.entity';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
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
}
