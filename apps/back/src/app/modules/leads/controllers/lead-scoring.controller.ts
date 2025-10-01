import { Controller, Get, Post, Body, Param, Patch, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadScoringRule, ScoringRuleType } from '../entities/lead-scoring-rule.entity';
import { LeadScoringService } from '../services/lead-scoring.service';
import { Lead } from '../lead.entity';
import { LeadScore, LeadTemperature } from '../entities/lead-score.entity';

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

export class UpdateMetadataDto {
  lastWebsiteVisit?: Date;
  lastEmailOpen?: Date;
  lastFormSubmission?: Date;
  totalPageViews?: number;
  totalEmailOpens?: number;
  totalEmailClicks?: number;
  averageSessionDuration?: number;
  conversionEvents?: string[];
}

export class BulkCalculateDto {
  leadIds?: number[];
  forceRecalculate?: boolean;
}

@ApiTags('lead-scoring')
@Controller('lead-scoring')
export class LeadScoringController {
  constructor(
    @InjectRepository(LeadScoringRule)
    private readonly scoringRuleRepo: Repository<LeadScoringRule>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadScore)
    private readonly leadScoreRepo: Repository<LeadScore>,
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

  // Новые методы для расширенного Lead Scoring

  @Post('leads/:leadId/calculate-advanced')
  async calculateAdvancedLeadScore(
    @Param('leadId', ParseIntPipe) leadId: number
  ) {
    try {
      // Если у нас есть новый сервис с расширенным функционалом
      const result = await this.scoringService.calculateScore(leadId, { 
        lead: await this.leadRepo.findOneBy({ id: leadId }) 
      });
      return {
        success: true,
        data: { score: result, leadId },
        message: `Lead score calculated successfully. Score: ${result}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate lead score'
      };
    }
  }

  @Post('bulk-calculate')
  async bulkCalculateScores(
    @Body() dto: BulkCalculateDto
  ) {
    try {
      const leads = dto.leadIds 
        ? await this.leadRepo.findByIds(dto.leadIds)
        : await this.leadRepo.find();

      const results = [];
      for (const lead of leads) {
        try {
          const score = await this.scoringService.calculateScore(lead.id, { lead });
          results.push({ leadId: lead.id, score, success: true });
        } catch (error) {
          results.push({ leadId: lead.id, error: error.message, success: false });
        }
      }
      
      return {
        success: true,
        data: {
          processed: results.length,
          results: results
        },
        message: `Successfully processed ${results.length} leads`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to bulk calculate lead scores'
      };
    }
  }

  @Get('scores/:leadId')
  async getLeadScore(
    @Param('leadId', ParseIntPipe) leadId: number
  ) {
    try {
      const score = await this.leadScoreRepo.findOne({ 
        where: { leadId },
        relations: ['lead']
      });
      
      if (!score) {
        return {
          success: false,
          message: 'Lead score not found'
        };
      }

      return {
        success: true,
        data: {
          id: score.id,
          leadId: score.leadId,
          totalScore: score.totalScore,
          temperature: score.temperature,
          lastCalculatedAt: score.lastCalculatedAt,
          criteria: score.criteria,
          metadata: score.metadata
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get lead score'
      };
    }
  }

  @Get('hot-leads')
  async getHotLeads(
    @Query('limit') limit: number = 50
  ) {
    try {
      const hotLeads = await this.leadScoreRepo.find({
        where: { temperature: LeadTemperature.HOT },
        relations: ['lead'],
        order: { totalScore: 'DESC' },
        take: limit
      });
      
      return {
        success: true,
        data: hotLeads.map(score => ({
          leadId: score.leadId,
          leadName: score.lead?.name,
          leadEmail: score.lead?.email,
          leadPhone: score.lead?.phone,
          totalScore: score.totalScore,
          temperature: score.temperature,
          lastCalculatedAt: score.lastCalculatedAt
        })),
        count: hotLeads.length,
        message: `Found ${hotLeads.length} hot leads`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get hot leads'
      };
    }
  }

  @Post('track-activity')
  async trackActivity(
    @Body() activityData: {
      leadId: number;
      activityType: string;
      metadata?: Record<string, any>;
    }
  ) {
    try {
      const { leadId, activityType, metadata } = activityData;
      
      // Обновляем скор лида на основе активности
      const lead = await this.leadRepo.findOneBy({ id: leadId });
      if (!lead) {
        return {
          success: false,
          message: 'Lead not found'
        };
      }

      const score = await this.scoringService.calculateScore(leadId, { 
        lead,
        activity: {
          type: activityType as any,
          metadata
        }
      });
      
      return {
        success: true,
        data: { leadId, newScore: score },
        message: 'Activity tracked and score updated'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to track activity'
      };
    }
  }

  @Get('analytics/distribution')
  async getScoreDistribution() {
    try {
      const [cold, warm, hot, total] = await Promise.all([
        this.leadScoreRepo.count({ where: { temperature: LeadTemperature.COLD } }),
        this.leadScoreRepo.count({ where: { temperature: LeadTemperature.WARM } }),
        this.leadScoreRepo.count({ where: { temperature: LeadTemperature.HOT } }),
        this.leadScoreRepo.count()
      ]);
      
      return {
        success: true,
        data: {
          cold: { count: cold, percentage: total > 0 ? Math.round((cold / total) * 100) : 0 },
          warm: { count: warm, percentage: total > 0 ? Math.round((warm / total) * 100) : 0 },
          hot: { count: hot, percentage: total > 0 ? Math.round((hot / total) * 100) : 0 },
          total
        },
        message: 'Score distribution retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get score distribution'
      };
    }
  }
}
