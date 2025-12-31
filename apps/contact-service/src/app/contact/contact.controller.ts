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
import { ContactService } from './contact.service';
import {
  CONTACT_PATTERNS,
  CreateContactDto,
  UpdateContactDto,
  ContactFilterDto,
  BlacklistContactDto,
  AssignContactDto,
  CreateContactActivityDto,
} from '@crm/contracts';

@Controller('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // ============ HTTP Endpoints ============

  @Get()
  findAll(@Query() filter: ContactFilterDto) {
    return this.contactService.findAll(filter);
  }

  @Get('recent')
  getRecent(@Query('limit') limit?: number) {
    return this.contactService.findRecent(limit);
  }

  @Get('inactive')
  getInactive(@Query('days') days: number = 30) {
    return this.contactService.findInactive(days);
  }

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contactService.search(query, page, limit);
  }

  @Get('stats')
  getStats() {
    return this.contactService.getStats();
  }

  @Get('duplicates')
  getDuplicates() {
    return this.contactService.getDuplicates();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.remove(id);
  }

  @Patch(':id/blacklist')
  blacklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlacklistContactDto,
  ) {
    return this.contactService.blacklist(id, dto.reason);
  }

  @Patch(':id/unblacklist')
  unblacklist(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.unblacklist(id);
  }

  @Patch(':id/assign')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignContactDto,
  ) {
    return this.contactService.assign(id, dto.managerId);
  }

  @Patch(':id/touch')
  touch(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.touch(id);
  }

  @Get(':id/activity')
  getActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contactService.getActivity(id, page, limit);
  }

  @Post(':id/activity')
  addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactActivityDto,
  ) {
    return this.contactService.addActivity(id, dto);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(CONTACT_PATTERNS.GET_CONTACTS)
  handleGetContacts(@Payload() filter: ContactFilterDto) {
    return this.contactService.findAll(filter);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_CONTACT)
  handleGetContact(@Payload() data: { id: string }) {
    return this.contactService.findOne(data.id);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_BY_PHONE)
  handleGetByPhone(@Payload() data: { phone: string }) {
    return this.contactService.findByPhone(data.phone);
  }

  @MessagePattern(CONTACT_PATTERNS.SEARCH_CONTACTS)
  handleSearch(@Payload() data: { query: string; page?: number; limit?: number }) {
    return this.contactService.search(data.query, data.page, data.limit);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_RECENT)
  handleGetRecent(@Payload() data: { limit?: number }) {
    return this.contactService.findRecent(data.limit);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_INACTIVE)
  handleGetInactive(@Payload() data: { days: number }) {
    return this.contactService.findInactive(data.days);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_STATS)
  handleGetStats() {
    return this.contactService.getStats();
  }

  @MessagePattern(CONTACT_PATTERNS.GET_DUPLICATES)
  handleGetDuplicates() {
    return this.contactService.getDuplicates();
  }

  @MessagePattern(CONTACT_PATTERNS.CREATE_CONTACT)
  handleCreate(@Payload() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  @MessagePattern(CONTACT_PATTERNS.UPDATE_CONTACT)
  handleUpdate(@Payload() data: { id: string; dto: UpdateContactDto }) {
    return this.contactService.update(data.id, data.dto);
  }

  @MessagePattern(CONTACT_PATTERNS.DELETE_CONTACT)
  handleDelete(@Payload() data: { id: string }) {
    return this.contactService.remove(data.id);
  }

  @MessagePattern(CONTACT_PATTERNS.BLACKLIST)
  handleBlacklist(@Payload() data: { id: string; reason: string }) {
    return this.contactService.blacklist(data.id, data.reason);
  }

  @MessagePattern(CONTACT_PATTERNS.UNBLACKLIST)
  handleUnblacklist(@Payload() data: { id: string }) {
    return this.contactService.unblacklist(data.id);
  }

  @MessagePattern(CONTACT_PATTERNS.ASSIGN)
  handleAssign(@Payload() data: { id: string; managerId: string }) {
    return this.contactService.assign(data.id, data.managerId);
  }

  @MessagePattern(CONTACT_PATTERNS.TOUCH)
  handleTouch(@Payload() data: { id: string }) {
    return this.contactService.touch(data.id);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_ACTIVITY)
  handleGetActivity(@Payload() data: { contactId: string; page?: number; limit?: number }) {
    return this.contactService.getActivity(data.contactId, data.page, data.limit);
  }

  @MessagePattern(CONTACT_PATTERNS.ADD_ACTIVITY)
  handleAddActivity(@Payload() data: { contactId: string; dto: CreateContactActivityDto }) {
    return this.contactService.addActivity(data.contactId, data.dto);
  }

  @MessagePattern(CONTACT_PATTERNS.HEALTH_CHECK)
  handleHealthCheck() {
    return { status: 'ok', service: 'contact-service' };
  }
}
