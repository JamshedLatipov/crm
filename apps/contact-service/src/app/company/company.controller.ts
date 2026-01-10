import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompanyService, CreateCompanyDto, UpdateCompanyDto, CompanyFilterDto } from './company.service';
import { CONTACT_PATTERNS } from '@crm/contracts';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // ============ HTTP Endpoints ============

  @Get()
  findAll(@Query() filter: CompanyFilterDto) {
    return this.companyService.findAll(filter);
  }

  @Get('inactive')
  findInactive(@Query('days') days?: number) {
    return this.companyService.findInactive(days);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.companyService.search(query);
  }

  @Get('stats')
  getStats() {
    return this.companyService.getStats();
  }

  @Get('duplicates')
  findDuplicates() {
    return this.companyService.findDuplicates();
  }

  @Get('by-inn/:inn')
  findByInn(@Param('inn') inn: string) {
    return this.companyService.findByInn(inn);
  }

  @Get('by-industry/:industry')
  findByIndustry(@Param('industry') industry: string) {
    return this.companyService.findByIndustry(industry);
  }

  @Get('by-size/:size')
  findBySize(@Param('size') size: string) {
    return this.companyService.findBySize(size);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.remove(id);
  }

  @Patch(':id/blacklist')
  addToBlacklist(@Param('id', ParseUUIDPipe) id: string, @Body('reason') reason: string) {
    return this.companyService.addToBlacklist(id, reason);
  }

  @Patch(':id/unblacklist')
  removeFromBlacklist(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.removeFromBlacklist(id);
  }

  @Patch(':id/assign')
  assignOwner(@Param('id', ParseUUIDPipe) id: string, @Body('ownerId') ownerId: string) {
    return this.companyService.assignOwner(id, ownerId);
  }

  @Patch(':id/touch')
  touchActivity(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.touchActivity(id);
  }

  @Patch(':id/rating')
  updateRating(@Param('id', ParseUUIDPipe) id: string, @Body('rating') rating: number) {
    return this.companyService.updateRating(id, rating);
  }

  @Post(':id/tags')
  addTags(@Param('id', ParseUUIDPipe) id: string, @Body('tags') tags: string[]) {
    return this.companyService.addTags(id, tags);
  }

  @Delete(':id/tags')
  removeTags(@Param('id', ParseUUIDPipe) id: string, @Body('tags') tags: string[]) {
    return this.companyService.removeTags(id, tags);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANIES)
  handleGetCompanies(@Payload() filter: CompanyFilterDto) {
    return this.companyService.findAll(filter);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANY)
  handleGetCompany(@Payload() data: { id: string }) {
    return this.companyService.findOne(data.id);
  }

  @MessagePattern(CONTACT_PATTERNS.CREATE_COMPANY)
  handleCreate(@Payload() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @MessagePattern(CONTACT_PATTERNS.UPDATE_COMPANY)
  handleUpdate(@Payload() data: { id: string; dto: UpdateCompanyDto }) {
    return this.companyService.update(data.id, data.dto);
  }

  @MessagePattern(CONTACT_PATTERNS.DELETE_COMPANY)
  handleDelete(@Payload() data: { id: string }) {
    return this.companyService.remove(data.id);
  }

  @MessagePattern(CONTACT_PATTERNS.SEARCH_COMPANIES)
  handleSearch(@Payload() data: { query: string }) {
    return this.companyService.search(data.query);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANY_STATS)
  handleGetStats() {
    return this.companyService.getStats();
  }

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANY_DUPLICATES)
  handleGetDuplicates() {
    return this.companyService.findDuplicates();
  }

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANIES_INACTIVE)
  handleGetInactive(@Payload() data: { days?: number }) {
    return this.companyService.findInactive(data.days);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANIES_BY_INN)
  handleGetByInn(@Payload() data: { inn: string }) {
    return this.companyService.findByInn(data.inn);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANIES_BY_INDUSTRY)
  handleGetByIndustry(@Payload() data: { industry: string }) {
    return this.companyService.findByIndustry(data.industry);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANIES_BY_SIZE)
  handleGetBySize(@Payload() data: { size: string }) {
    return this.companyService.findBySize(data.size);
  }

  @MessagePattern(CONTACT_PATTERNS.BLACKLIST_COMPANY)
  handleBlacklist(@Payload() data: { id: string; reason: string }) {
    return this.companyService.addToBlacklist(data.id, data.reason);
  }

  @MessagePattern(CONTACT_PATTERNS.UNBLACKLIST_COMPANY)
  handleUnblacklist(@Payload() data: { id: string }) {
    return this.companyService.removeFromBlacklist(data.id);
  }

  @MessagePattern(CONTACT_PATTERNS.ASSIGN_COMPANY)
  handleAssign(@Payload() data: { id: string; ownerId: string }) {
    return this.companyService.assignOwner(data.id, data.ownerId);
  }

  @MessagePattern(CONTACT_PATTERNS.TOUCH_COMPANY)
  handleTouch(@Payload() data: { id: string }) {
    return this.companyService.touchActivity(data.id);
  }

  @MessagePattern(CONTACT_PATTERNS.UPDATE_COMPANY_RATING)
  handleUpdateRating(@Payload() data: { id: string; rating: number }) {
    return this.companyService.updateRating(data.id, data.rating);
  }

  @MessagePattern(CONTACT_PATTERNS.ADD_COMPANY_TAGS)
  handleAddTags(@Payload() data: { id: string; tags: string[] }) {
    return this.companyService.addTags(data.id, data.tags);
  }

  @MessagePattern(CONTACT_PATTERNS.REMOVE_COMPANY_TAGS)
  handleRemoveTags(@Payload() data: { id: string; tags: string[] }) {
    return this.companyService.removeTags(data.id, data.tags);
  }
}
