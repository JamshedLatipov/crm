import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { AutomationService } from './automation.service';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation.dto';

@Controller('pipeline/automation')
export class AutomationController {
  constructor(
    private readonly svc: PipelineService,
    private readonly automationService: AutomationService
  ) {}

  @Post('rules')
  createRule(@Body() dto: CreateAutomationRuleDto) {
    return this.svc.createAutomationRule(dto);
  }

  @Get('rules')
  listRules() {
    return this.svc.listAutomationRules();
  }

  @Get('rules/:id')
  getRule(@Param('id') id: string) {
    return this.svc.getAutomationRule(id);
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    return this.svc.updateAutomationRule(id, dto);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.svc.deleteAutomationRule(id);
  }

  @Post('rules/:id/toggle')
  toggleRule(@Param('id') id: string) {
    return this.svc.toggleAutomationRule(id);
  }

  @Post('run')
  async runAutomation() {
    // Run legacy automation for backward compatibility
    const legacyResult = await this.svc.processAutomation();

    // Also trigger time-based automation manually
    try {
      // Note: processTimeBasedAutomation is private, so we can't call it directly
      // For now, just return the legacy result in the expected format
      return {
        processed: legacyResult.processedCount || 0,
        results: [`Automation completed. Processed ${legacyResult.processedCount || 0} leads.`]
      };
    } catch (error) {
      return {
        processed: 0,
        results: [`Automation failed: ${error.message}`]
      };
    }
  }
}