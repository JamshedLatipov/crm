import { Controller, Get, Post, Body, Param, Patch, Delete, Query, BadRequestException } from '@nestjs/common';
import { LeadService } from './lead.service';
import { Lead, LeadStatus, LeadSource, LeadPriority } from './lead.entity';
import { ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';
import { 
  CreateLeadDto, 
  UpdateLeadDto, 
  AssignLeadDto, 
  ScoreLeadDto, 
  StatusLeadDto,
  QualifyLeadDto,
  AddNoteDto,
  AddTagsDto,
  RemoveTagsDto,
  ScheduleFollowUpDto,
  LeadFiltersDto
} from './lead.dto';
import { LeadActivity } from './entities/lead-activity.entity';

// Helper function to parse array parameters
function parseArrayParam(param: string | string[]): string[] | undefined {
  if (!param) return undefined;
  if (Array.isArray(param)) return param;
  return param.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

// Type-safe enum parsing functions
function parseStatusArray(param: string | string[]): LeadStatus[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed ? parsed.filter(s => Object.values(LeadStatus).includes(s as LeadStatus)) as LeadStatus[] : undefined;
}

function parseSourceArray(param: string | string[]): LeadSource[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed ? parsed.filter(s => Object.values(LeadSource).includes(s as LeadSource)) as LeadSource[] : undefined;
}

function parsePriorityArray(param: string | string[]): LeadPriority[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed ? parsed.filter(s => Object.values(LeadPriority).includes(s as LeadPriority)) as LeadPriority[] : undefined;
}

@ApiTags('leads')
@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @ApiBody({ type: CreateLeadDto })
  async create(@Body() data: CreateLeadDto): Promise<Lead> {
    return this.leadService.create(data);
  }

  @Get()
  @ApiQuery({ type: LeadFiltersDto, required: false })
  async findAll(
    @Query() query: Record<string, string | string[]>,
    @Query('page') page = 1,
    @Query('limit') limit = 50
  ): Promise<{
    leads: Lead[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Transform string arrays to proper arrays
    const filters: LeadFiltersDto = {
      ...query,
      status: parseStatusArray(query.status),
      source: parseSourceArray(query.source),
      priority: parsePriorityArray(query.priority),
      assignedTo: parseArrayParam(query.assignedTo),
      tags: parseArrayParam(query.tags),
    };

    return this.leadService.findAll(filters, Number(page), Number(limit));
  }

  @Get('statistics')
  @ApiQuery({ type: LeadFiltersDto, required: false })
  async getStatistics(@Query() query: Record<string, string | string[]>) {
    // Transform string arrays to proper arrays
    const filters: LeadFiltersDto = {
      ...query,
      status: parseStatusArray(query.status),
      source: parseSourceArray(query.source),
      priority: parsePriorityArray(query.priority),
      assignedTo: parseArrayParam(query.assignedTo),
      tags: parseArrayParam(query.tags),
    };

    return this.leadService.getStatistics(filters);
  }

  @Get('search')
  @ApiQuery({ name: 'q', type: 'string' })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  async search(
    @Query('q') query: string,
    @Query('limit') limit = 20
  ): Promise<Lead[]> {
    return this.leadService.searchLeads(query, Number(limit));
  }

  @Get('high-value')
  @ApiQuery({ name: 'minValue', type: 'number', required: false })
  async getHighValueLeads(@Query('minValue') minValue = 10000): Promise<Lead[]> {
    return this.leadService.getHighValueLeads(Number(minValue));
  }

  @Get('stale')
  @ApiQuery({ name: 'days', type: 'number', required: false })
  async getStaleLeads(@Query('days') days = 30): Promise<Lead[]> {
    return this.leadService.getStaleLeads(Number(days));
  }

  @Get('manager/:managerId')
  async getLeadsByManager(@Param('managerId') managerId: string): Promise<Lead[]> {
    return this.leadService.getLeadsByManager(managerId);
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Lead | null> {
    return this.leadService.findById(id);
  }

  @Get(':id/activities')
  async getActivities(@Param('id') id: number): Promise<LeadActivity[]> {
    return this.leadService.getActivities(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateLeadDto })
  async update(@Param('id') id: number, @Body() data: UpdateLeadDto): Promise<Lead> {
    return this.leadService.update(id, data);
  }

  @Patch(':id/assign')
  @ApiBody({ type: AssignLeadDto })
  async assignLead(@Param('id') id: number, @Body() body: AssignLeadDto): Promise<Lead> {
    const userOrManager = body.managerId ?? body.user;
    if (!userOrManager) {
      throw new BadRequestException('Missing user or managerId in request body');
    }
    return this.leadService.assignLead(id, userOrManager);
  }

  @Post(':id/auto-assign')
  async autoAssignLead(
    @Param('id') id: number, 
    @Body() body: { 
      industry?: string; 
      territory?: string; 
      criteria: string[] 
    }
  ): Promise<Lead | null> {
    return this.leadService.autoAssignLead(id, body);
  }

  @Patch(':id/score')
  @ApiBody({ type: ScoreLeadDto })
  async scoreLead(@Param('id') id: number, @Body() body: ScoreLeadDto): Promise<Lead> {
    return this.leadService.scoreLead(id, body.score);
  }

  @Patch(':id/status')
  @ApiBody({ type: StatusLeadDto })
  async changeStatus(@Param('id') id: number, @Body() body: StatusLeadDto): Promise<Lead> {
    return this.leadService.changeStatus(id, body.status);
  }

  @Patch(':id/qualify')
  @ApiBody({ type: QualifyLeadDto })
  async qualifyLead(@Param('id') id: number, @Body() body: QualifyLeadDto): Promise<Lead> {
    return this.leadService.qualifyLead(id, body.isQualified);
  }

  @Post(':id/notes')
  @ApiBody({ type: AddNoteDto })
  async addNote(@Param('id') id: number, @Body() body: AddNoteDto): Promise<void> {
    return this.leadService.addNote(id, body.note);
  }

  @Post(':id/tags')
  @ApiBody({ type: AddTagsDto })
  async addTags(@Param('id') id: number, @Body() body: AddTagsDto): Promise<Lead> {
    return this.leadService.addTags(id, body.tags);
  }

  @Delete(':id/tags')
  @ApiBody({ type: RemoveTagsDto })
  async removeTags(@Param('id') id: number, @Body() body: RemoveTagsDto): Promise<Lead> {
    return this.leadService.removeTags(id, body.tags);
  }

  @Patch(':id/contact')
  async updateLastContact(@Param('id') id: number): Promise<void> {
    return this.leadService.updateLastContact(id);
  }

  @Post(':id/follow-up')
  @ApiBody({ type: ScheduleFollowUpDto })
  async scheduleFollowUp(@Param('id') id: number, @Body() body: ScheduleFollowUpDto): Promise<Lead> {
    return this.leadService.scheduleFollowUp(id, body.date, body.note);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<{ success: boolean }> {
    const success = await this.leadService.delete(id);
    return { success };
  }
}
