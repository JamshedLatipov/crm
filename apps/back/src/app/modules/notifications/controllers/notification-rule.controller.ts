import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch,
  Delete, 
  Param, 
  Body, 
  ParseIntPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { 
  NotificationRuleService, 
  CreateRuleDto, 
  RuleEvaluationContext 
} from '../../shared/services/notification-rule.service';
import { NotificationRule } from '../../shared/entities/notification-rule.entity';
import { NotificationType } from '../../shared/entities/notification.entity';

export class UpdateRuleDto {
  name?: string;
  description?: string;
  priority?: any;
  conditions?: any[];
  actions?: any;
  filters?: any;
  isActive?: boolean;
}

export class EvaluateRulesDto {
  context: RuleEvaluationContext;
}

export class CreateDefaultRulesDto {
  createdBy: string;
  includeDeals?: boolean;
}

@Controller('notification-rules')
export class NotificationRuleController {
  constructor(private readonly ruleService: NotificationRuleService) {}

  @Get()
  async getAllRules(): Promise<NotificationRule[]> {
    return this.ruleService.findAll();
  }

  @Get('active')
  async getActiveRules(): Promise<NotificationRule[]> {
    return this.ruleService.findActiveRules();
  }

  @Get('type/:type')
  async getRulesByType(@Param('type') type: NotificationType): Promise<NotificationRule[]> {
    return this.ruleService.findRulesByType(type);
  }

  @Get(':id')
  async getRule(@Param('id', ParseIntPipe) id: number): Promise<NotificationRule | null> {
    return this.ruleService.updateRule(id, {});
  }

  @Post()
  async createRule(@Body() dto: CreateRuleDto): Promise<NotificationRule> {
    return this.ruleService.createRule(dto);
  }

  @Post('default')
  async createDefaultRules(@Body() dto: CreateDefaultRulesDto): Promise<NotificationRule[]> {
    const leadRules = await this.ruleService.createDefaultRules(dto.createdBy);
    
    if (dto.includeDeals) {
      const dealRules = await this.ruleService.createDealRules(dto.createdBy);
      return [...leadRules, ...dealRules];
    }
    
    return leadRules;
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluateRules(@Body() dto: EvaluateRulesDto): Promise<{ message: string }> {
    await this.ruleService.evaluateRules(dto.context);
    return { message: 'Rules evaluated successfully' };
  }

  @Put(':id')
  async updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRuleDto
  ): Promise<NotificationRule | null> {
    return this.ruleService.updateRule(id, dto);
  }

  @Patch(':id/toggle')
  async toggleRule(@Param('id', ParseIntPipe) id: number): Promise<NotificationRule | null> {
    return this.ruleService.toggleRule(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const success = await this.ruleService.deleteRule(id);
    if (!success) {
      throw new Error('Rule not found');
    }
  }

  // Вспомогательные эндпоинты для тестирования
  @Post('test/lead-score-change')
  async testLeadScoreChange(
    @Body() body: {
      leadId: number;
      previousScore: number;
      currentScore: number;
      leadName?: string;
      assignedTo?: string;
    }
  ): Promise<{ message: string }> {
    const context: RuleEvaluationContext = {
      leadId: body.leadId,
      leadScore: {
        totalScore: body.currentScore,
        temperature: body.currentScore >= 71 ? 'hot' : body.currentScore >= 31 ? 'warm' : 'cold',
        scoreChange: body.currentScore - body.previousScore,
        previousScore: body.previousScore
      },
      leadData: {
        name: body.leadName || 'Test Lead',
        assignedTo: body.assignedTo
      },
      userId: body.assignedTo,
      timestamp: new Date()
    };

    await this.ruleService.evaluateRules(context);
    return { message: 'Test lead score change evaluated' };
  }

  @Post('test/deal-created')
  async testDealCreated(
    @Body() body: {
      dealId: number;
      dealTitle: string;
      dealValue: number;
      assignedTo?: string;
    }
  ): Promise<{ message: string }> {
    const context: RuleEvaluationContext = {
      dealId: body.dealId,
      dealData: {
        title: body.dealTitle,
        value: body.dealValue,
        stage: 'new',
        status: 'open',
        assignedTo: body.assignedTo
      },
      userId: body.assignedTo,
      timestamp: new Date()
    };

    await this.ruleService.evaluateRules(context);
    return { message: 'Test deal creation evaluated' };
  }

  // Информационные эндпоинты
  @Get('types/available')
  getAvailableTypes() {
    return {
      types: Object.values(NotificationType),
      description: 'Available notification types for rules'
    };
  }

  @Get('templates/available')
  getAvailableTemplates() {
    return {
      templates: [
        'hot_lead_detected',
        'score_increased',
        'high_score_threshold',
        'deal_won',
        'deal_high_value',
        'lead_became_warm',
        'lead_became_cold'
      ],
      description: 'Available message templates for notifications'
    };
  }
}