import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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

  @Get('overdue')
  getOverdue() {
    return this.dealService.getOverdue();
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.dealService.search(query);
  }

  @Get('by-stage/:stageId')
  getByStage(@Param('stageId') stageId: string) {
    return this.dealService.getByStage(stageId);
  }

  @Get('by-company/:companyId')
  getByCompany(@Param('companyId') companyId: string) {
    return this.dealService.getByCompany(companyId);
  }

  @Get('by-contact/:contactId')
  getByContact(@Param('contactId') contactId: string) {
    return this.dealService.getByContact(contactId);
  }

  @Get('by-lead/:leadId')
  getByLead(@Param('leadId') leadId: string) {
    return this.dealService.getByLead(leadId);
  }

  @Get('history/stage-movement-stats')
  getStageMovementStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.dealService.getStageMovementStats(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  @Get('history/most-active')
  getMostActiveDeals(
    @Query('limit') limit?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.dealService.getMostActiveDeals(
      limit || 10,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  @Get('history/user-activity')
  getUserActivity(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: number,
  ) {
    return this.dealService.getUserActivity(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      limit || 10,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealService.findOne(id);
  }

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.dealService.getHistory(id, page, limit);
  }

  @Get(':id/history/stats')
  getHistoryStats(
    @Param('id') id: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.dealService.getHistoryStats(
      id,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  @Get(':id/assignments')
  getAssignments(@Param('id') id: string) {
    return this.dealService.getAssignments(id);
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
  winDeal(@Param('id') id: string, @Body('amount') amount?: number) {
    return this.dealService.winDeal(id, amount);
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
  @Patch(':id/move-stage')
  moveToStage(@Param('id') id: string, @Body('stageId') stageId: string) {
    return this.dealService.moveToStage(id, stageId);
  }

  @Patch(':id/probability')
  updateProbability(@Param('id') id: string, @Body('probability') probability: number) {
    return this.dealService.updateProbability(id, probability);
  }

  @Post(':id/link-contact')
  @Patch(':id/link-contact')
  linkContact(@Param('id') id: string, @Body('contactId') contactId: string) {
    return this.dealService.linkContact(id, contactId);
  }

  @Post(':id/link-company')
  @Patch(':id/link-company')
  linkCompany(@Param('id') id: string, @Body('companyId') companyId: string) {
    return this.dealService.linkCompany(id, companyId);
  }

  @Post(':id/link-lead')
  @Patch(':id/link-lead')
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
  handleWin(@Payload() data: { id: string; amount?: number; userId?: string }) {
    return this.dealService.winDeal(data.id, data.amount, data.userId);
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
  handleGetHistory(@Payload() data: { dealId: string; page?: number; limit?: number }) {
    return this.dealService.getHistory(data.dealId, data.page, data.limit);
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

  // New message handlers
  @MessagePattern(DEAL_PATTERNS.SEARCH)
  handleSearch(@Payload() data: { query: string }) {
    return this.dealService.search(data.query);
  }

  @MessagePattern(DEAL_PATTERNS.GET_OVERDUE)
  handleGetOverdue() {
    return this.dealService.getOverdue();
  }

  @MessagePattern(DEAL_PATTERNS.GET_BY_COMPANY)
  handleGetByCompany(@Payload() data: { companyId: string }) {
    return this.dealService.getByCompany(data.companyId);
  }

  @MessagePattern(DEAL_PATTERNS.GET_BY_CONTACT)
  handleGetByContact(@Payload() data: { contactId: string }) {
    return this.dealService.getByContact(data.contactId);
  }

  @MessagePattern(DEAL_PATTERNS.GET_BY_LEAD)
  handleGetByLead(@Payload() data: { leadId: string }) {
    return this.dealService.getByLead(data.leadId);
  }

  @MessagePattern(DEAL_PATTERNS.GET_BY_MANAGER)
  handleGetByManager(@Payload() data: { managerId: string }) {
    return this.dealService.getByManager(data.managerId);
  }

  @MessagePattern(DEAL_PATTERNS.GET_ASSIGNMENTS)
  handleGetAssignments(@Payload() data: { id: string }) {
    return this.dealService.getAssignments(data.id);
  }

  @MessagePattern(DEAL_PATTERNS.UPDATE_PROBABILITY)
  handleUpdateProbability(@Payload() data: { id: string; probability: number; userId?: string }) {
    return this.dealService.updateProbability(data.id, data.probability, data.userId);
  }

  @MessagePattern(DEAL_PATTERNS.GET_HISTORY_STATS)
  handleGetHistoryStats(@Payload() data: { id: string; dateFrom?: string; dateTo?: string }) {
    return this.dealService.getHistoryStats(
      data.id,
      data.dateFrom ? new Date(data.dateFrom) : undefined,
      data.dateTo ? new Date(data.dateTo) : undefined,
    );
  }

  @MessagePattern(DEAL_PATTERNS.GET_STAGE_MOVEMENT_STATS)
  handleGetStageMovementStats(@Payload() data: { dateFrom?: string; dateTo?: string }) {
    return this.dealService.getStageMovementStats(
      data.dateFrom ? new Date(data.dateFrom) : undefined,
      data.dateTo ? new Date(data.dateTo) : undefined,
    );
  }

  @MessagePattern(DEAL_PATTERNS.GET_MOST_ACTIVE)
  handleGetMostActive(@Payload() data: { limit?: number; dateFrom?: string; dateTo?: string }) {
    return this.dealService.getMostActiveDeals(
      data.limit || 10,
      data.dateFrom ? new Date(data.dateFrom) : undefined,
      data.dateTo ? new Date(data.dateTo) : undefined,
    );
  }

  @MessagePattern(DEAL_PATTERNS.GET_USER_ACTIVITY)
  handleGetUserActivity(@Payload() data: { dateFrom?: string; dateTo?: string; limit?: number }) {
    return this.dealService.getUserActivity(
      data.dateFrom ? new Date(data.dateFrom) : undefined,
      data.dateTo ? new Date(data.dateTo) : undefined,
      data.limit || 10,
    );
  }
}
