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
  Inject,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  SERVICES,
  CONTACT_PATTERNS,
  CreateContactDto,
  UpdateContactDto,
  ContactFilterDto,
  BlacklistContactDto,
  AssignContactDto,
  CreateContactActivityDto,
} from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('contacts')
@ApiBearerAuth('JWT-auth')
@Controller('contacts')
@UseGuards(AuthGuard)
export class ContactsController {
  constructor(
    @Inject(SERVICES.CONTACT) private readonly contactClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all contacts', description: 'Retrieve contacts with filtering' })
  async findAll(@Query() filter: ContactFilterDto) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_CONTACTS, filter).pipe(timeout(5000)),
    );
  }

  @Get('stats')
  async getStats() {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_STATS, {}).pipe(timeout(5000)),
    );
  }

  @Get('search')
  async search(@Query('q') query: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.SEARCH_CONTACTS, { query, page, limit }).pipe(timeout(5000)),
    );
  }

  @Get('recent')
  async getRecent(@Query('limit') limit?: number) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_RECENT, { limit: limit || 10 }).pipe(timeout(5000)),
    );
  }

  @Get('inactive')
  async getInactive(@Query('days') days?: number, @Query('page') page?: number, @Query('limit') limit?: number) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_INACTIVE, { days: days || 30, page, limit }).pipe(timeout(5000)),
    );
  }

  @Get('duplicates')
  async getDuplicates(@Query('email') email?: string, @Query('phone') phone?: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_DUPLICATES, { email, phone }).pipe(timeout(5000)),
    );
  }

  @Get('by-phone/:phone')
  async getByPhone(@Param('phone') phone: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_BY_PHONE, { phone }).pipe(timeout(5000)),
    );
  }

  @Get('by-manager/:managerId')
  async getByManager(@Param('managerId') managerId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_BY_MANAGER, { managerId, page, limit }).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_CONTACT, { id }).pipe(timeout(5000)),
    );
  }

  @Get(':id/activity')
  async getActivity(@Param('id') id: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_ACTIVITY, { contactId: id, page, limit }).pipe(timeout(5000)),
    );
  }

  @Post()
  async create(@Body() dto: CreateContactDto) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.CREATE_CONTACT, dto).pipe(timeout(5000)),
    );
  }

  @Post(':id/activity')
  async addActivity(@Param('id') id: string, @Body() dto: CreateContactActivityDto) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.ADD_ACTIVITY, { contactId: id, ...dto }).pipe(timeout(5000)),
    );
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.UPDATE_CONTACT, { id, dto }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/assign')
  async assign(@Param('id') id: string, @Body() dto: AssignContactDto) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.ASSIGN, { id, ...dto }).pipe(timeout(5000)),
    );
  }

  @Post(':id/blacklist')
  @HttpCode(HttpStatus.OK)
  async blacklist(@Param('id') id: string, @Body() dto: BlacklistContactDto) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.BLACKLIST, { id, ...dto }).pipe(timeout(5000)),
    );
  }

  @Post(':id/unblacklist')
  @HttpCode(HttpStatus.OK)
  async unblacklist(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.UNBLACKLIST, { id }).pipe(timeout(5000)),
    );
  }

  @Post(':id/touch')
  @HttpCode(HttpStatus.OK)
  async touch(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.TOUCH, { id }).pipe(timeout(5000)),
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.DELETE_CONTACT, { id }).pipe(timeout(5000)),
    );
  }
}

@ApiTags('companies')
@ApiBearerAuth('JWT-auth')
@Controller('companies')
@UseGuards(AuthGuard)
export class CompaniesController {
  constructor(
    @Inject(SERVICES.CONTACT) private readonly contactClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all companies', description: 'Retrieve companies with filtering' })
  async findAll(@Query() filter: any) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANIES, filter).pipe(timeout(5000)),
    );
  }

  @Get('inactive')
  @ApiOperation({ summary: 'Get inactive companies' })
  @ApiQuery({ name: 'days', required: false, description: 'Days since last activity (default: 90)' })
  async findInactive(@Query('days') days?: number) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANIES_INACTIVE, { days }).pipe(timeout(5000)),
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search companies' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  async search(@Query('q') query: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.SEARCH_COMPANIES, { query }).pipe(timeout(5000)),
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get company statistics' })
  async getStats() {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANY_STATS, {}).pipe(timeout(5000)),
    );
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'Find duplicate companies' })
  async findDuplicates() {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANY_DUPLICATES, {}).pipe(timeout(5000)),
    );
  }

  @Get('by-inn/:inn')
  @ApiOperation({ summary: 'Find companies by INN' })
  @ApiParam({ name: 'inn', description: 'Company INN' })
  async findByInn(@Param('inn') inn: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANIES_BY_INN, { inn }).pipe(timeout(5000)),
    );
  }

  @Get('by-industry/:industry')
  @ApiOperation({ summary: 'Get companies by industry' })
  @ApiParam({ name: 'industry', description: 'Industry name' })
  async findByIndustry(@Param('industry') industry: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANIES_BY_INDUSTRY, { industry }).pipe(timeout(5000)),
    );
  }

  @Get('by-size/:size')
  @ApiOperation({ summary: 'Get companies by size' })
  @ApiParam({ name: 'size', description: 'Company size' })
  async findBySize(@Param('size') size: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANIES_BY_SIZE, { size }).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANY, { id }).pipe(timeout(5000)),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create company' })
  async create(@Body() dto: any) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.CREATE_COMPANY, dto).pipe(timeout(5000)),
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.UPDATE_COMPANY, { id, dto }).pipe(timeout(5000)),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async delete(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.DELETE_COMPANY, { id }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/blacklist')
  @ApiOperation({ summary: 'Add company to blacklist' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async addToBlacklist(@Param('id') id: string, @Body('reason') reason: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.BLACKLIST_COMPANY, { id, reason }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/unblacklist')
  @ApiOperation({ summary: 'Remove company from blacklist' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async removeFromBlacklist(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.UNBLACKLIST_COMPANY, { id }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign owner to company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async assignOwner(@Param('id') id: string, @Body('ownerId') ownerId: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.ASSIGN_COMPANY, { id, ownerId }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/touch')
  @ApiOperation({ summary: 'Update last activity date' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async touchActivity(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.TOUCH_COMPANY, { id }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/rating')
  @ApiOperation({ summary: 'Update company rating' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async updateRating(@Param('id') id: string, @Body('rating') rating: number) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.UPDATE_COMPANY_RATING, { id, rating }).pipe(timeout(5000)),
    );
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Add tags to company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async addTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.ADD_COMPANY_TAGS, { id, tags }).pipe(timeout(5000)),
    );
  }

  @Delete(':id/tags')
  @ApiOperation({ summary: 'Remove tags from company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  async removeTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.REMOVE_COMPANY_TAGS, { id, tags }).pipe(timeout(5000)),
    );
  }
}
