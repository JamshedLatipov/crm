import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NOTIFICATION_PATTERNS } from '@crm/contracts';
import { NotificationRuleService } from './notification-rule.service';
import { NotificationRuleTrigger } from '../entities/notification-rule.entity';

@ApiTags('Notification Rules')
@Controller('notification-rules')
export class NotificationRuleController {
  constructor(private readonly ruleService: NotificationRuleService) {}

  // ========== HTTP Endpoints ==========

  @Get()
  @ApiOperation({ summary: 'Get all notification rules' })
  getRules() {
    return this.ruleService.getRules();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification rule by ID' })
  getRule(@Param('id', ParseIntPipe) id: number) {
    return this.ruleService.getRule(id);
  }

  @Get('by-trigger/:trigger')
  @ApiOperation({ summary: 'Get rules by trigger' })
  getRulesByTrigger(@Param('trigger') trigger: NotificationRuleTrigger) {
    return this.ruleService.getRulesByTrigger(trigger);
  }

  @Post()
  @ApiOperation({ summary: 'Create notification rule' })
  createRule(@Body() dto: any) {
    return this.ruleService.createRule(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update notification rule' })
  updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.ruleService.updateRule(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification rule' })
  deleteRule(@Param('id', ParseIntPipe) id: number) {
    return this.ruleService.deleteRule(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle notification rule active status' })
  toggleRule(@Param('id', ParseIntPipe) id: number) {
    return this.ruleService.toggleRule(id);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate rules for a trigger' })
  evaluate(@Body() dto: { trigger: NotificationRuleTrigger; context: Record<string, any> }) {
    return this.ruleService.evaluate(dto.trigger, dto.context);
  }

  @Patch('bulk-toggle')
  @ApiOperation({ summary: 'Bulk toggle rules' })
  bulkToggle(@Body() dto: { ids: number[]; isActive: boolean }) {
    return this.ruleService.bulkToggle(dto.ids, dto.isActive);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder rules' })
  reorderRules(@Body() dto: { orderedIds: number[] }) {
    return this.ruleService.reorderRules(dto.orderedIds);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get rule statistics' })
  getStats() {
    return this.ruleService.getStats();
  }

  @Get('defaults')
  @ApiOperation({ summary: 'Get default rules' })
  getDefaultRules() {
    return this.ruleService.getDefaultRules();
  }

  // ========== RabbitMQ MessagePattern Handlers ==========

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_GET_ALL)
  handleGetRules() {
    return this.ruleService.getRules();
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_GET_ONE)
  handleGetRule(@Payload() data: { id: number }) {
    return this.ruleService.getRule(data.id);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_GET_BY_TRIGGER)
  handleGetByTrigger(@Payload() data: { trigger: NotificationRuleTrigger }) {
    return this.ruleService.getRulesByTrigger(data.trigger);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_CREATE)
  handleCreateRule(@Payload() dto: any) {
    return this.ruleService.createRule(dto);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_UPDATE)
  handleUpdateRule(@Payload() data: { id: number; dto: any }) {
    return this.ruleService.updateRule(data.id, data.dto);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_DELETE)
  handleDeleteRule(@Payload() data: { id: number }) {
    return this.ruleService.deleteRule(data.id);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_TOGGLE)
  handleToggleRule(@Payload() data: { id: number }) {
    return this.ruleService.toggleRule(data.id);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_EVALUATE)
  handleEvaluate(@Payload() data: { trigger: NotificationRuleTrigger; context: Record<string, any> }) {
    return this.ruleService.evaluate(data.trigger, data.context);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_BULK_TOGGLE)
  handleBulkToggle(@Payload() data: { ids: number[]; isActive: boolean }) {
    return this.ruleService.bulkToggle(data.ids, data.isActive);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_REORDER)
  handleReorder(@Payload() data: { orderedIds: number[] }) {
    return this.ruleService.reorderRules(data.orderedIds);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_GET_STATS)
  handleGetStats() {
    return this.ruleService.getStats();
  }

  @MessagePattern(NOTIFICATION_PATTERNS.RULES_GET_DEFAULTS)
  handleGetDefaults() {
    return this.ruleService.getDefaultRules();
  }
}
