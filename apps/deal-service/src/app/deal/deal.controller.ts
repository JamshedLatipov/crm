import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DealService } from './deal.service';
import {
  CreateDealDto,
  UpdateDealDto,
  DealFilterDto,
  DEAL_PATTERNS,
} from '@crm/contracts';

@Controller('deals')
export class DealController {
  constructor(private readonly dealService: DealService) {}

  // HTTP Endpoints
  @Get()
  findAll(@Query() filter: DealFilterDto) {
    return this.dealService.findAll(filter);
  }

  @Get('stats')
  getStats() {
    return this.dealService.getStats();
  }

  @Get('forecast')
  getForecast(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dealService.getForecast(new Date(startDate), new Date(endDate));
  }

  @Get('by-stage/:stageId')
  getByStage(@Param('stageId') stageId: string) {
    return this.dealService.getByStage(stageId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealService.findOne(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.dealService.getHistory(id);
  }

  @Post()
  create(@Body() dto: CreateDealDto) {
    return this.dealService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.dealService.remove(id);
  }

  @Post(':id/win')
  winDeal(@Param('id') id: string) {
    return this.dealService.winDeal(id);
  }

  @Post(':id/lose')
  loseDeal(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.dealService.loseDeal(id, reason);
  }

  @Post(':id/reopen')
  reopenDeal(@Param('id') id: string) {
    return this.dealService.reopenDeal(id);
  }

  @Post(':id/move-to-stage')
  moveToStage(@Param('id') id: string, @Body('stageId') stageId: string) {
    return this.dealService.moveToStage(id, stageId);
  }

  @Post(':id/link-contact')
  linkContact(@Param('id') id: string, @Body('contactId') contactId: string) {
    return this.dealService.linkContact(id, contactId);
  }

  @Post(':id/link-company')
  linkCompany(@Param('id') id: string, @Body('companyId') companyId: string) {
    return this.dealService.linkCompany(id, companyId);
  }

  @Post(':id/link-lead')
  linkLead(@Param('id') id: string, @Body('leadId') leadId: string) {
    return this.dealService.linkLead(id, leadId);
  }

  // RabbitMQ Message Handlers
  @MessagePattern(DEAL_PATTERNS.FIND_ALL)
  handleFindAll(@Payload() filter: DealFilterDto) {
    return this.dealService.findAll(filter);
  }

  @MessagePattern(DEAL_PATTERNS.FIND_ONE)
  handleFindOne(@Payload() data: { id: string }) {
    return this.dealService.findOne(data.id);
  }

  @MessagePattern(DEAL_PATTERNS.CREATE)
  handleCreate(@Payload() data: { dto: CreateDealDto; userId?: string }) {
    return this.dealService.create(data.dto, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.UPDATE)
  handleUpdate(@Payload() data: { id: string; dto: UpdateDealDto; userId?: string }) {
    return this.dealService.update(data.id, data.dto, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.REMOVE)
  handleRemove(@Payload() data: { id: string; userId?: string }) {
    return this.dealService.remove(data.id, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.GET_STATS)
  handleGetStats() {
    return this.dealService.getStats();
  }

  @MessagePattern(DEAL_PATTERNS.GET_FORECAST)
  handleGetForecast(@Payload() data: { startDate: string; endDate: string }) {
    return this.dealService.getForecast(new Date(data.startDate), new Date(data.endDate));
  }

  @MessagePattern(DEAL_PATTERNS.WIN)
  handleWin(@Payload() data: { id: string; userId?: string }) {
    return this.dealService.winDeal(data.id, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.LOSE)
  handleLose(@Payload() data: { id: string; reason?: string; userId?: string }) {
    return this.dealService.loseDeal(data.id, data.reason, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.REOPEN)
  handleReopen(@Payload() data: { id: string; userId?: string }) {
    return this.dealService.reopenDeal(data.id, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.MOVE_STAGE)
  handleMoveStage(@Payload() data: { id: string; stageId: string; userId?: string }) {
    return this.dealService.moveToStage(data.id, data.stageId, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.GET_BY_STAGE)
  handleGetByStage(@Payload() data: { stageId: string }) {
    return this.dealService.getByStage(data.stageId);
  }

  @MessagePattern(DEAL_PATTERNS.GET_HISTORY)
  handleGetHistory(@Payload() data: { dealId: string }) {
    return this.dealService.getHistory(data.dealId);
  }

  @MessagePattern(DEAL_PATTERNS.LINK_CONTACT)
  handleLinkContact(@Payload() data: { id: string; contactId: string; userId?: string }) {
    return this.dealService.linkContact(data.id, data.contactId, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.LINK_COMPANY)
  handleLinkCompany(@Payload() data: { id: string; companyId: string; userId?: string }) {
    return this.dealService.linkCompany(data.id, data.companyId, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.LINK_LEAD)
  handleLinkLead(@Payload() data: { id: string; leadId: string; userId?: string }) {
    return this.dealService.linkLead(data.id, data.leadId, data.userId);
  }
}
