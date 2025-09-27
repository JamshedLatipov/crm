import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly svc: PipelineService) {}

  @Post('stages')
  createStage(@Body() dto: CreateStageDto) {
    return this.svc.createStage(dto);
  }

  @Get('stages')
  listStages() {
    return this.svc.listStages();
  }

  @Patch('stages/:id')
  updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.svc.updateStage(id, dto);
  }

  @Post('leads')
  createLead(@Body() dto: CreateLeadDto) {
    return this.svc.createLead(dto);
  }

  @Get('leads')
  listLeads() {
    return this.svc.listLeads();
  }

  @Patch('leads/:id')
  updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.svc.updateLead(id, dto);
  }

  @Post('automation/run')
  runAutomation() {
    return this.svc.processAutomation();
  }

  @Get('analytics')
  analytics() {
    return this.svc.analytics();
  }
}
