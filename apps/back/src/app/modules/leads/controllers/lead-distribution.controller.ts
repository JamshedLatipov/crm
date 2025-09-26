import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadDistributionRule, DistributionMethod } from '../entities/lead-distribution-rule.entity';
import { LeadDistributionService } from '../services/lead-distribution.service';

export class CreateDistributionRuleDto {
  name: string;
  description: string;
  method: DistributionMethod;
  conditions?: Record<string, string | number | boolean>;
  assignees: string[];
  weights?: Record<string, number>;
  isActive?: boolean;
  priority?: number;
  maxLeadsPerUser?: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: number[];
}

export class UpdateDistributionRuleDto {
  name?: string;
  description?: string;
  method?: DistributionMethod;
  conditions?: Record<string, string | number | boolean>;
  assignees?: string[];
  weights?: Record<string, number>;
  isActive?: boolean;
  priority?: number;
  maxLeadsPerUser?: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: number[];
}

export class ReassignLeadDto {
  newManagerId: string;
  reason?: string;
}

@ApiTags('lead-distribution')
@Controller('lead-distribution')
export class LeadDistributionController {
  constructor(
    @InjectRepository(LeadDistributionRule)
    private readonly distributionRuleRepo: Repository<LeadDistributionRule>,
    private readonly distributionService: LeadDistributionService
  ) {}

  @Get('rules')
  async getRules(): Promise<LeadDistributionRule[]> {
    return this.distributionRuleRepo.find({ order: { priority: 'DESC' } });
  }

  @Get('rules/default')
  async getDefaultRules() {
    return this.distributionService.getDefaultDistributionRules();
  }

  @Post('rules')
  @ApiBody({ type: CreateDistributionRuleDto })
  async createRule(@Body() data: CreateDistributionRuleDto): Promise<LeadDistributionRule> {
    return this.distributionRuleRepo.save(data);
  }

  @Get('rules/:id')
  async getRule(@Param('id') id: number): Promise<LeadDistributionRule | null> {
    return this.distributionRuleRepo.findOneBy({ id });
  }

  @Patch('rules/:id')
  @ApiBody({ type: UpdateDistributionRuleDto })
  async updateRule(@Param('id') id: number, @Body() data: UpdateDistributionRuleDto): Promise<LeadDistributionRule> {
    await this.distributionRuleRepo.update(id, data);
    const updated = await this.distributionRuleRepo.findOneBy({ id });
    if (!updated) {
      throw new Error('Rule not found');
    }
    return updated;
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id') id: number): Promise<{ success: boolean }> {
    const result = await this.distributionRuleRepo.delete(id);
    return { success: result.affected ? result.affected > 0 : false };
  }

  @Post('rules/:id/toggle')
  async toggleRule(@Param('id') id: number): Promise<LeadDistributionRule> {
    const rule = await this.distributionRuleRepo.findOneBy({ id });
    if (!rule) {
      throw new Error('Rule not found');
    }
    
    rule.isActive = !rule.isActive;
    return this.distributionRuleRepo.save(rule);
  }

  @Post('leads/:leadId/distribute')
  async distributeLead(@Param('leadId') leadId: number): Promise<{ assignedTo: string | null }> {
    const assignedTo = await this.distributionService.distributeLeadAutomatically(leadId);
    return { assignedTo };
  }

  @Post('leads/:leadId/reassign')
  @ApiBody({ type: ReassignLeadDto })
  async reassignLead(
    @Param('leadId') leadId: number, 
    @Body() body: ReassignLeadDto
  ): Promise<{ success: boolean }> {
    const success = await this.distributionService.reassignLead(
      leadId, 
      body.newManagerId, 
      body.reason
    );
    return { success };
  }

  @Get('managers/:managerId/statistics')
  async getManagerStatistics(@Param('managerId') managerId: string) {
    return this.distributionService.getManagerStatistics(managerId);
  }

  @Get('managers/loads')
  async getManagerLoads() {
    // Этот метод приватный в сервисе, можно сделать публичным или создать отдельный
    return {}; // Placeholder
  }
}
