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

@Controller('contacts')
@UseGuards(AuthGuard)
export class ContactsController {
  constructor(
    @Inject(SERVICES.CONTACT) private readonly contactClient: ClientProxy,
  ) {}

  @Get()
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

@Controller('companies')
@UseGuards(AuthGuard)
export class CompaniesController {
  constructor(
    @Inject(SERVICES.CONTACT) private readonly contactClient: ClientProxy,
  ) {}

  @Get()
  async findAll(@Query() filter: any) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANIES, filter).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.GET_COMPANY, { id }).pipe(timeout(5000)),
    );
  }

  @Post()
  async create(@Body() dto: any) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.CREATE_COMPANY, dto).pipe(timeout(5000)),
    );
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.UPDATE_COMPANY, { id, dto }).pipe(timeout(5000)),
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return firstValueFrom(
      this.contactClient.send(CONTACT_PATTERNS.DELETE_COMPANY, { id }).pipe(timeout(5000)),
    );
  }
}
