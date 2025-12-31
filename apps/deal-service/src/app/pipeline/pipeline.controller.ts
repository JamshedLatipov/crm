import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PipelineService, CreateStageDto, UpdateStageDto } from './pipeline.service';
import { PIPELINE_PATTERNS } from '@crm/contracts';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  // HTTP Endpoints
  @Get('stages')
  findAll() {
    return this.pipelineService.findAll();
  }

  @Get('stages/:id')
  findOne(@Param('id') id: string) {
    return this.pipelineService.findOne(id);
  }

  @Post('stages')
  create(@Body() dto: CreateStageDto) {
    return this.pipelineService.create(dto);
  }

  @Put('stages/:id')
  update(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.pipelineService.update(id, dto);
  }

  @Delete('stages/:id')
  remove(@Param('id') id: string) {
    return this.pipelineService.remove(id);
  }

  @Post('stages/reorder')
  reorder(@Body() body: { stageIds: string[] }) {
    return this.pipelineService.reorder(body.stageIds);
  }

  // RabbitMQ Message Handlers
  @MessagePattern(PIPELINE_PATTERNS.FIND_ALL_STAGES)
  handleFindAll() {
    return this.pipelineService.findAll();
  }

  @MessagePattern(PIPELINE_PATTERNS.FIND_ONE_STAGE)
  handleFindOne(@Payload() data: { id: string }) {
    return this.pipelineService.findOne(data.id);
  }

  @MessagePattern(PIPELINE_PATTERNS.CREATE_STAGE)
  handleCreate(@Payload() dto: CreateStageDto) {
    return this.pipelineService.create(dto);
  }

  @MessagePattern(PIPELINE_PATTERNS.UPDATE_STAGE)
  handleUpdate(@Payload() data: { id: string; dto: UpdateStageDto }) {
    return this.pipelineService.update(data.id, data.dto);
  }

  @MessagePattern(PIPELINE_PATTERNS.REMOVE_STAGE)
  handleRemove(@Payload() data: { id: string }) {
    return this.pipelineService.remove(data.id);
  }

  @MessagePattern(PIPELINE_PATTERNS.REORDER_STAGES)
  handleReorder(@Payload() data: { stageIds: string[] }) {
    return this.pipelineService.reorder(data.stageIds);
  }
}
