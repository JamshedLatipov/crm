import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CampaignService, CreateCampaignDto, UpdateCampaignDto, CampaignFilterDto } from './campaign.service';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  findAll(@Query() filter: CampaignFilterDto) {
    return this.campaignService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.findOne(id);
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.getStats(id);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCampaignDto) {
    return this.campaignService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.delete(id);
  }

  @Post(':id/schedule')
  schedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { scheduledAt: string },
  ) {
    return this.campaignService.schedule(id, new Date(body.scheduledAt));
  }

  @Post(':id/start')
  start(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.start(id);
  }

  @Post(':id/pause')
  pause(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.pause(id);
  }

  @Post(':id/resume')
  resume(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.resume(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.cancel(id);
  }

  // RabbitMQ handlers
  @MessagePattern('campaign.findAll')
  handleFindAll(@Payload() filter: CampaignFilterDto) {
    return this.campaignService.findAll(filter);
  }

  @MessagePattern('campaign.findOne')
  handleFindOne(@Payload() data: { id: number }) {
    return this.campaignService.findOne(data.id);
  }

  @MessagePattern('campaign.create')
  handleCreate(@Payload() dto: CreateCampaignDto) {
    return this.campaignService.create(dto);
  }

  @MessagePattern('campaign.start')
  handleStart(@Payload() data: { id: number }) {
    return this.campaignService.start(data.id);
  }

  @MessagePattern('campaign.health')
  handleHealthCheck() {
    return { status: 'ok', service: 'campaign-service' };
  }
}
