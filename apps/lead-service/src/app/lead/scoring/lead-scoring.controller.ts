import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LEAD_PATTERNS } from '@crm/contracts';
import { LeadScoringService } from './lead-scoring.service';
import { LeadScoringRule, ScoringRuleType } from '../entities/lead-scoring-rule.entity';

export class CreateScoringRuleDto {
  name!: string;
  description?: string;
  type?: ScoringRuleType;
  points!: number;
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

@Controller('lead-scoring')
export class LeadScoringController {
  constructor(private readonly scoringService: LeadScoringService) {}

  // HTTP Endpoints
  @Get('rules')
  getRules() {
    return this.scoringService.getRules();
  }

  @Get('rules/default')
  getDefaultRules() {
    return this.scoringService.getDefaultRules();
  }

  @Get('rules/:id')
  getRule(@Param('id', ParseIntPipe) id: number) {
    return this.scoringService.getRule(id);
  }

  @Post('rules')
  createRule(@Body() dto: CreateScoringRuleDto) {
    return this.scoringService.createRule(dto);
  }

  @Patch('rules/:id')
  updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScoringRuleDto) {
    return this.scoringService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id', ParseIntPipe) id: number) {
    return this.scoringService.deleteRule(id);
  }

  @Post('rules/:id/toggle')
  toggleRule(@Param('id', ParseIntPipe) id: number) {
    return this.scoringService.toggleRule(id);
  }

  @Post('leads/:leadId/calculate')
  calculateScore(@Param('leadId', ParseIntPipe) leadId: number) {
    return this.scoringService.calculateScore(leadId);
  }

  @Post('bulk-calculate')
  bulkCalculate(@Body() dto: { leadIds?: number[]; forceRecalculate?: boolean }) {
    return this.scoringService.bulkCalculate(dto.leadIds, dto.forceRecalculate);
  }

  @Get('scores/:leadId')
  getScore(@Param('leadId', ParseIntPipe) leadId: number) {
    return this.scoringService.getScore(leadId);
  }

  @Get('hot-leads')
  getHotLeads(@Query('limit') limit = 50) {
    return this.scoringService.getHotLeads(limit);
  }

  // RabbitMQ Message Handlers
  @MessagePattern(LEAD_PATTERNS.SCORING_GET_RULES)
  handleGetRules() {
    return this.scoringService.getRules();
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_GET_RULE)
  handleGetRule(@Payload() data: { id: number }) {
    return this.scoringService.getRule(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_CREATE_RULE)
  handleCreateRule(@Payload() data: CreateScoringRuleDto) {
    return this.scoringService.createRule(data);
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_UPDATE_RULE)
  handleUpdateRule(@Payload() data: { id: number; dto: UpdateScoringRuleDto }) {
    return this.scoringService.updateRule(data.id, data.dto);
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_DELETE_RULE)
  handleDeleteRule(@Payload() data: { id: number }) {
    return this.scoringService.deleteRule(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_TOGGLE_RULE)
  handleToggleRule(@Payload() data: { id: number }) {
    return this.scoringService.toggleRule(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_CALCULATE)
  handleCalculate(@Payload() data: { leadId: number }) {
    return this.scoringService.calculateScore(data.leadId);
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_BULK_CALCULATE)
  handleBulkCalculate(@Payload() data: { leadIds?: number[]; forceRecalculate?: boolean }) {
    return this.scoringService.bulkCalculate(data.leadIds, data.forceRecalculate);
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_GET_SCORE)
  handleGetScore(@Payload() data: { leadId: number }) {
    return this.scoringService.getScore(data.leadId);
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_GET_HOT_LEADS)
  handleGetHotLeads(@Payload() data: { limit?: number }) {
    return this.scoringService.getHotLeads(data.limit || 50);
  }

  @MessagePattern(LEAD_PATTERNS.SCORING_GET_DEFAULT_RULES)
  handleGetDefaultRules() {
    return this.scoringService.getDefaultRules();
  }
}
