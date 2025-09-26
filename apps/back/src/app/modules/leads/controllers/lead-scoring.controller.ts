import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadScoringRule, ScoringRuleType } from '../entities/lead-scoring-rule.entity';
import { LeadScoringService } from '../services/lead-scoring.service';
import { Lead } from '../lead.entity';

export class CreateScoringRuleDto {
  name: string;
  description: string;
  type: ScoringRuleType;
  points: number;
  isActive?: boolean;
  conditions?: Record<string, string | number | boolean>;
  priority?: number;
}

export class UpdateScoringRuleDto {
  name?: string;
  description?: string;
  type?: ScoringRuleType;
  points?: number;
  isActive?: boolean;
  conditions?: Record<string, string | number | boolean>;
  priority?: number;
}

@ApiTags('lead-scoring')
@Controller('lead-scoring')
export class LeadScoringController {
  constructor(
    @InjectRepository(LeadScoringRule)
    private readonly scoringRuleRepo: Repository<LeadScoringRule>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly scoringService: LeadScoringService
  ) {}

  @Get('rules')
  async getRules(): Promise<LeadScoringRule[]> {
    return this.scoringRuleRepo.find({ order: { priority: 'DESC' } });
  }

  @Get('rules/default')
  async getDefaultRules() {
    return this.scoringService.getDefaultScoringRules();
  }

  @Post('rules')
  @ApiBody({ type: CreateScoringRuleDto })
  async createRule(@Body() data: CreateScoringRuleDto): Promise<LeadScoringRule> {
    return this.scoringRuleRepo.save(data);
  }

  @Get('rules/:id')
  async getRule(@Param('id') id: number): Promise<LeadScoringRule | null> {
    return this.scoringRuleRepo.findOneBy({ id });
  }

  @Patch('rules/:id')
  @ApiBody({ type: UpdateScoringRuleDto })
  async updateRule(@Param('id') id: number, @Body() data: UpdateScoringRuleDto): Promise<LeadScoringRule> {
    await this.scoringRuleRepo.update(id, data);
    const updated = await this.scoringRuleRepo.findOneBy({ id });
    if (!updated) {
      throw new Error('Rule not found');
    }
    return updated;
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id') id: number): Promise<{ success: boolean }> {
    const result = await this.scoringRuleRepo.delete(id);
    return { success: result.affected ? result.affected > 0 : false };
  }

  @Post('rules/:id/toggle')
  async toggleRule(@Param('id') id: number): Promise<LeadScoringRule> {
    const rule = await this.scoringRuleRepo.findOneBy({ id });
    if (!rule) {
      throw new Error('Rule not found');
    }
    
    rule.isActive = !rule.isActive;
    return this.scoringRuleRepo.save(rule);
  }

  @Post('leads/:leadId/calculate')
  async calculateLeadScore(@Param('leadId') leadId: number): Promise<{ score: number }> {
    const lead = await this.leadRepo.findOneBy({ id: leadId });
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    const score = await this.scoringService.calculateScore(leadId, { lead });
    return { score };
  }

  @Get('leads/high-score')
  async getHighScoreLeads(): Promise<Lead[]> {
    return this.scoringService.getLeadsByScore(70, 50);
  }
}
