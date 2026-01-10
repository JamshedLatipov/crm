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
import { LeadService } from './lead.service';
import { LeadStatus } from './entities/lead.entity';
import {
  LEAD_PATTERNS,
  CreateLeadDto,
  UpdateLeadDto,
  LeadFilterDto,
  AssignLeadDto,
  BulkAssignLeadsDto,
  ChangeLeadStatusDto,
  UpdateLeadScoreDto,
  AddLeadTagsDto,
  ScheduleFollowUpDto,
} from '@crm/contracts';

@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  // ============ HTTP Endpoints ============

  @Get()
  findAll(@Query() filter: LeadFilterDto) {
    return this.leadService.findAll(filter);
  }

  @Get('stats')
  getStats() {
    return this.leadService.getStats();
  }

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.leadService.search(query, page, limit);
  }

  @Get('high-value')
  getHighValueLeads(@Query('minValue') minValue?: number) {
    return this.leadService.getHighValueLeads(minValue);
  }

  @Get('stale')
  getStaleLeads(@Query('days') days?: number) {
    return this.leadService.getStaleLeads(days);
  }

  @Patch('bulk-assign')
  bulkAssign(@Body() dto: BulkAssignLeadsDto) {
    return this.leadService.bulkAssign(dto.leadIds, dto.assigneeId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leadService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.leadService.remove(id);
  }

  @Patch(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignLeadDto,
  ) {
    return this.leadService.assign(id, dto.assigneeId);
  }

  @Patch(':id/score')
  updateScore(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadScoreDto,
  ) {
    return this.leadService.updateScore(id, dto.score);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeLeadStatusDto,
  ) {
    return this.leadService.changeStatus(id, dto.status as LeadStatus);
  }

  @Patch(':id/qualify')
  qualify(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { qualified: boolean },
  ) {
    return this.leadService.qualify(id, body.qualified);
  }

  @Patch(':id/contact')
  updateLastContact(@Param('id', ParseIntPipe) id: number) {
    return this.leadService.updateLastContact(id);
  }

  @Post(':id/tags')
  addTags(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddLeadTagsDto,
  ) {
    return this.leadService.addTags(id, dto.tags);
  }

  @Delete(':id/tags')
  removeTags(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddLeadTagsDto,
  ) {
    return this.leadService.removeTags(id, dto.tags);
  }

  @Post(':id/follow-up')
  scheduleFollowUp(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleFollowUpDto,
  ) {
    return this.leadService.scheduleFollowUp(id, dto.followUpDate);
  }

  @Get('manager/:managerId')
  getByManager(@Param('managerId') managerId: string) {
    return this.leadService.getByManager(managerId);
  }

  @Get(':id/activities')
  getActivities(@Param('id', ParseIntPipe) id: number) {
    return this.leadService.getActivities(id);
  }

  @Get(':id/assignments')
  getAssignments(@Param('id', ParseIntPipe) id: number) {
    return this.leadService.getAssignments(id);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { text: string },
  ) {
    return this.leadService.addNote(id, body.text);
  }

  @Post(':id/convert-to-deal')
  convertToDeal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dealData?: any,
  ) {
    return this.leadService.convertToDeal(id, dealData);
  }

  @Post(':id/auto-assign')
  autoAssign(@Param('id', ParseIntPipe) id: number) {
    return this.leadService.autoAssign(id);
  }

  @Get(':id/history')
  getHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.leadService.getHistory(id, page, limit);
  }

  @Get(':id/history/stats')
  getHistoryStats(@Param('id', ParseIntPipe) id: number) {
    return this.leadService.getHistoryStats(id);
  }

  @Patch(':id/promo-company')
  setPromoCompany(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { companyId: number },
  ) {
    return this.leadService.setPromoCompany(id, body.companyId);
  }

  @Delete(':id/promo-company')
  removePromoCompany(@Param('id', ParseIntPipe) id: number) {
    return this.leadService.removePromoCompany(id);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(LEAD_PATTERNS.GET_LEADS)
  handleGetLeads(@Payload() filter: LeadFilterDto) {
    return this.leadService.findAll(filter);
  }

  @MessagePattern(LEAD_PATTERNS.GET_LEAD)
  handleGetLead(@Payload() data: { id: number }) {
    return this.leadService.findOne(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.CREATE_LEAD)
  handleCreate(@Payload() dto: CreateLeadDto) {
    return this.leadService.create(dto);
  }

  @MessagePattern(LEAD_PATTERNS.UPDATE_LEAD)
  handleUpdate(@Payload() data: { id: number; dto: UpdateLeadDto }) {
    return this.leadService.update(data.id, data.dto);
  }

  @MessagePattern(LEAD_PATTERNS.DELETE_LEAD)
  handleDelete(@Payload() data: { id: number }) {
    return this.leadService.remove(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.ASSIGN_LEAD)
  handleAssign(@Payload() data: { id: number; assigneeId: number }) {
    return this.leadService.assign(data.id, data.assigneeId);
  }

  @MessagePattern(LEAD_PATTERNS.SCORE_LEAD)
  handleScore(@Payload() data: { id: number; score: number }) {
    return this.leadService.updateScore(data.id, data.score);
  }

  @MessagePattern(LEAD_PATTERNS.SEARCH)
  handleSearch(@Payload() data: { query: string; page?: number; limit?: number }) {
    return this.leadService.search(data.query, data.page, data.limit);
  }

  @MessagePattern(LEAD_PATTERNS.GET_STATS)
  handleGetStats() {
    return this.leadService.getStats();
  }

  @MessagePattern(LEAD_PATTERNS.GET_HIGH_VALUE)
  handleGetHighValue(@Payload() data: { minValue?: number }) {
    return this.leadService.getHighValueLeads(data.minValue);
  }

  @MessagePattern(LEAD_PATTERNS.GET_STALE)
  handleGetStale(@Payload() data: { days?: number }) {
    return this.leadService.getStaleLeads(data.days);
  }

  @MessagePattern(LEAD_PATTERNS.BULK_ASSIGN)
  handleBulkAssign(@Payload() data: { leadIds: number[]; assigneeId: number }) {
    return this.leadService.bulkAssign(data.leadIds, data.assigneeId);
  }

  @MessagePattern(LEAD_PATTERNS.CHANGE_STATUS)
  handleChangeStatus(@Payload() data: { id: number; status: string }) {
    return this.leadService.changeStatus(data.id, data.status as LeadStatus);
  }

  @MessagePattern(LEAD_PATTERNS.QUALIFY)
  handleQualify(@Payload() data: { id: number; qualified: boolean }) {
    return this.leadService.qualify(data.id, data.qualified);
  }

  @MessagePattern(LEAD_PATTERNS.UPDATE_LAST_CONTACT)
  handleUpdateLastContact(@Payload() data: { id: number }) {
    return this.leadService.updateLastContact(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.ADD_TAGS)
  handleAddTags(@Payload() data: { id: number; tags: string[] }) {
    return this.leadService.addTags(data.id, data.tags);
  }

  @MessagePattern(LEAD_PATTERNS.REMOVE_TAGS)
  handleRemoveTags(@Payload() data: { id: number; tags: string[] }) {
    return this.leadService.removeTags(data.id, data.tags);
  }

  @MessagePattern(LEAD_PATTERNS.SCHEDULE_FOLLOW_UP)
  handleScheduleFollowUp(@Payload() data: { id: number; followUpDate: Date }) {
    return this.leadService.scheduleFollowUp(data.id, data.followUpDate);
  }

  @MessagePattern(LEAD_PATTERNS.GET_BY_MANAGER)
  handleGetByManager(@Payload() data: { managerId: string }) {
    return this.leadService.getByManager(data.managerId);
  }

  @MessagePattern(LEAD_PATTERNS.GET_ACTIVITIES)
  handleGetActivities(@Payload() data: { id: number }) {
    return this.leadService.getActivities(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.GET_ASSIGNMENTS)
  handleGetAssignments(@Payload() data: { id: number }) {
    return this.leadService.getAssignments(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.ADD_NOTE)
  handleAddNote(@Payload() data: { id: number; text: string; userId?: number }) {
    return this.leadService.addNote(data.id, data.text, data.userId);
  }

  @MessagePattern(LEAD_PATTERNS.CONVERT_TO_DEAL)
  handleConvertToDeal(@Payload() data: { id: number; dealData?: any }) {
    return this.leadService.convertToDeal(data.id, data.dealData);
  }

  @MessagePattern(LEAD_PATTERNS.GET_HISTORY)
  handleGetHistory(@Payload() data: { id: number; page?: number; limit?: number }) {
    return this.leadService.getHistory(data.id, data.page, data.limit);
  }

  @MessagePattern(LEAD_PATTERNS.GET_HISTORY_STATS)
  handleGetHistoryStats(@Payload() data: { id: number }) {
    return this.leadService.getHistoryStats(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.AUTO_ASSIGN)
  handleAutoAssign(@Payload() data: { id: number }) {
    return this.leadService.autoAssign(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.HEALTH_CHECK)
  handleHealthCheck() {
    return { status: 'ok', service: 'lead-service' };
  }
}
