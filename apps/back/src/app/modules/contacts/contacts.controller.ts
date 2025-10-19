import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ContactType, ContactSource } from './contact.entity';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  async listContacts(
    @Query('type') type?: ContactType,
    @Query('source') source?: ContactSource,
    @Query('assignedTo') assignedTo?: string,
    @Query('company') company?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const parsedIsActive = isActive === undefined ? undefined : isActive === 'true';
    if (type) {
      return this.contactsService.getContactsByType(type);
    }

    if (source) {
      return this.contactsService.getContactsBySource(source);
    }

    if (assignedTo) {
      return this.contactsService.getContactsByManager(assignedTo);
    }

    if (company) {
      return this.contactsService.getContactsByCompany(company);
    }

    if (tag) {
      return this.contactsService.getContactsByTag(tag);
    }

    if (search) {
      return this.contactsService.searchContacts(search, parsedIsActive);
    }

    return this.contactsService.listContacts(parsedIsActive);
  }

  @Get('recent')
  async getRecentContacts(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.contactsService.getRecentContacts(parsedLimit);
  }

  @Get('inactive')
  async getInactiveContacts(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.contactsService.getContactsWithoutActivity(parsedDays);
  }

  @Get('search')
  async searchContacts(@Query('q') query: string) {
    return this.contactsService.searchContacts(query);
  }

  @Get('stats')
  async getContactsStats() {
    return this.contactsService.getContactsStats();
  }

  @Get('duplicates')
  async findDuplicates() {
    return this.contactsService.findDuplicates();
  }

  @Get(':id')
  async getContactById(@Param('id') id: string) {
    return this.contactsService.getContactById(id);
  }

  @Post()
  async createContact(@Body() dto: CreateContactDto) {
    return this.contactsService.createContact(dto);
  }

  @Patch(':id')
  async updateContact(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.updateContact(id, dto);
  }

  @Delete(':id')
  async deleteContact(@Param('id') id: string) {
    await this.contactsService.deleteContact(id);
    return { message: 'Contact deleted successfully' };
  }

  // Специальные операции
  @Patch(':id/blacklist')
  async blacklistContact(@Param('id') id: string, @Body('reason') reason: string) {
    return this.contactsService.blacklistContact(id, reason);
  }

  @Patch(':id/unblacklist')
  async unblacklistContact(@Param('id') id: string) {
    return this.contactsService.unblacklistContact(id);
  }

  @Patch(':id/assign')
  async assignContact(@Param('id') id: string, @Body('assignedTo') managerId: string) {
    return this.contactsService.assignContact(id, managerId);
  }

  @Patch(':id/touch')
  async updateLastContactDate(@Param('id') id: string) {
    return this.contactsService.updateLastContactDate(id);
  }

  // Активность контактов
  @Get(':id/activity')
  async getContactActivity(@Param('id') id: string) {
    return this.contactsService.getContactActivity(id);
  }

  @Post(':id/activity')
  async addContactActivity(@Param('id') id: string, @Body() dto: CreateActivityDto) {
    return this.contactsService.addContactActivity(id, dto);
  }
}
