import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LEAD_PATTERNS } from '@crm/contracts';
import { LeadDistributionService } from './lead-distribution.service';

@ApiTags('Lead Distribution')
@Controller('lead-distribution')
export class LeadDistributionController {
  constructor(private readonly distributionService: LeadDistributionService) {}

  // ========== HTTP Endpoints ==========

  @Get('rules')
  @ApiOperation({ summary: 'Get all distribution rules' })
  getRules() {
    return this.distributionService.getRules();
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get distribution rule by ID' })
  getRule(@Param('id', ParseIntPipe) id: number) {
    return this.distributionService.getRule(id);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create distribution rule' })
  createRule(@Body() dto: any) {
    return this.distributionService.createRule(dto);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update distribution rule' })
  updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.distributionService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete distribution rule' })
  deleteRule(@Param('id', ParseIntPipe) id: number) {
    return this.distributionService.deleteRule(id);
  }

  @Patch('rules/:id/toggle')
  @ApiOperation({ summary: 'Toggle distribution rule active status' })
  toggleRule(@Param('id', ParseIntPipe) id: number) {
    return this.distributionService.toggleRule(id);
  }

  @Post('auto-assign')
  @ApiOperation({ summary: 'Auto-assign lead to user based on rules' })
  autoAssign(@Body() dto: { leadId: number }) {
    return this.distributionService.autoAssign(dto.leadId);
  }

  @Post('reassign')
  @ApiOperation({ summary: 'Reassign lead to different user' })
  reassign(@Body() dto: { leadId: number; userId: number; reason?: string }) {
    return this.distributionService.reassign(dto.leadId, dto.userId, dto.reason);
  }

  @Post('bulk-assign')
  @ApiOperation({ summary: 'Bulk assign leads' })
  bulkAssign(@Body() dto: { leadIds: number[]; userId: number }) {
    return this.distributionService.bulkAssign(dto.leadIds, dto.userId);
  }

  @Get('workload')
  @ApiOperation({ summary: 'Get user workload distribution' })
  getWorkload() {
    return this.distributionService.getWorkload();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get distribution statistics' })
  getStats() {
    return this.distributionService.getStats();
  }

  // ========== RabbitMQ MessagePattern Handlers ==========

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_GET_RULES)
  handleGetRules() {
    return this.distributionService.getRules();
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_GET_RULE)
  handleGetRule(@Payload() data: { id: number }) {
    return this.distributionService.getRule(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_CREATE_RULE)
  handleCreateRule(@Payload() dto: any) {
    return this.distributionService.createRule(dto);
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_UPDATE_RULE)
  handleUpdateRule(@Payload() data: { id: number; dto: any }) {
    return this.distributionService.updateRule(data.id, data.dto);
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_DELETE_RULE)
  handleDeleteRule(@Payload() data: { id: number }) {
    return this.distributionService.deleteRule(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_TOGGLE_RULE)
  handleToggleRule(@Payload() data: { id: number }) {
    return this.distributionService.toggleRule(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_AUTO_ASSIGN)
  handleAutoAssign(@Payload() data: { leadId: number }) {
    return this.distributionService.autoAssign(data.leadId);
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_REASSIGN)
  handleReassign(@Payload() data: { leadId: number; userId: number; reason?: string }) {
    return this.distributionService.reassign(data.leadId, data.userId, data.reason);
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_BULK_ASSIGN)
  handleBulkAssign(@Payload() data: { leadIds: number[]; userId: number }) {
    return this.distributionService.bulkAssign(data.leadIds, data.userId);
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_GET_WORKLOAD)
  handleGetWorkload() {
    return this.distributionService.getWorkload();
  }

  @MessagePattern(LEAD_PATTERNS.DISTRIBUTION_GET_STATS)
  handleGetStats() {
    return this.distributionService.getStats();
  }
}
