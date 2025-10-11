import { Controller, Get, Post, Body, Param, Patch, Delete, Query, BadRequestException, Req, UseGuards } from '@nestjs/common';
import { LeadService } from './lead.service';
import { Lead, LeadStatus, LeadSource, LeadPriority } from './lead.entity';
import { ChangeType } from './entities/lead-history.entity';
import { ApiTags, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
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
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../user/current-user.decorator';

// Helper function to parse array parameters
function parseArrayParam(param: string | string[] | undefined): string[] | undefined {
  if (!param) return undefined;
  if (Array.isArray(param)) return param;
  return param.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

// Type-safe enum parsing functions
function parseStatusArray(param: string | string[] | undefined): LeadStatus[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed ? parsed.filter(s => Object.values(LeadStatus).includes(s as LeadStatus)) as LeadStatus[] : undefined;
}

function parseSourceArray(param: string | string[] | undefined): LeadSource[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed ? parsed.filter(s => Object.values(LeadSource).includes(s as LeadSource)) as LeadSource[] : undefined;
}

function parsePriorityArray(param: string | string[] | undefined): LeadPriority[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed ? parsed.filter(s => Object.values(LeadPriority).includes(s as LeadPriority)) as LeadPriority[] : undefined;
}

function parseChangeTypeArray(param: string | string[] | undefined): ChangeType[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed ? parsed.filter(s => Object.values(ChangeType).includes(s as ChangeType)) as ChangeType[] : undefined;
}

@ApiTags('leads')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @ApiBody({ type: CreateLeadDto })
  async create(@Body() data: CreateLeadDto, @Req() req: unknown): Promise<Lead> {
    if (req && typeof req === 'object' && req !== null) {
      const r = req as { rawBody?: unknown; headers?: Record<string, unknown> };
      if (typeof r.rawBody === 'string') {
        console.log('Creating lead — rawBody from middleware:', r.rawBody);
      }
      const headers = r.headers || {};
      const contentType = (headers['content-type'] || headers['Content-Type']) as string | undefined;
      const contentLength = (headers['content-length'] || headers['Content-Length']) as string | undefined;
      const transferEncoding = (headers['transfer-encoding'] || headers['Transfer-Encoding']) as string | undefined;
      const xff = (headers['x-forwarded-for'] || headers['X-Forwarded-For']) as string | undefined;
      console.log('Creating lead — headers:', { contentType, contentLength, transferEncoding, xForwardedFor: xff });
    }
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

  @Get(':id/assignments')
  async getCurrentAssignments(@Param('id') id: number): Promise<any[]> {
    return this.leadService.getCurrentAssignments(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateLeadDto })
  async update(@Param('id') id: number, @Body() data: UpdateLeadDto): Promise<Lead> {
    return this.leadService.update(id, data);
  }

  @Patch(':id/assign')
  @ApiBody({ type: AssignLeadDto })
  async assignLead(@Param('id') id: number, @Body() body: AssignLeadDto, @CurrentUser() user: CurrentUserPayload): Promise<Lead> {
    const userOrManager = body.managerId ?? body.user;
    if (!userOrManager) {
      throw new BadRequestException('Missing user or managerId in request body');
    }
    return this.leadService.assignLead(id, userOrManager, parseInt(user.sub), user.username);
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

  @Post(':id/convert-to-deal')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Название сделки (опционально)' },
        amount: { type: 'number', description: 'Сумма сделки', minimum: 0 },
        currency: { type: 'string', description: 'Валюта (по умолчанию RUB)' },
        probability: { type: 'number', description: 'Вероятность закрытия в % (0-100)' },
        expectedCloseDate: { type: 'string', format: 'date', description: 'Ожидаемая дата закрытия' },
        stageId: { type: 'string', description: 'ID этапа воронки' },
        notes: { type: 'string', description: 'Заметки (опционально)' }
      },
      required: ['amount', 'expectedCloseDate', 'stageId']
    }
  })
  async convertToDeal(
    @Param('id') id: number,
    @Body() body: {
      title?: string;
      amount: number;
      currency?: string;
      probability?: number;
      expectedCloseDate: string;
      stageId: string;
      notes?: string;
    }
  ) {
    return this.leadService.convertToDeal(id, {
      ...body,
      expectedCloseDate: new Date(body.expectedCloseDate)
    });
  }

  /**
   * Получить историю изменений лида
   */
  @Get(':id/history')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество записей на странице' })
  @ApiQuery({ name: 'changeType', required: false, type: String, description: 'Тип изменения (можно несколько через запятую)' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'ID пользователя (можно несколько через запятую)' })
  @ApiQuery({ name: 'fieldName', required: false, type: String, description: 'Название поля (можно несколько через запятую)' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getLeadHistory(
    @Param('id') id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('changeType') changeType?: string | string[],
    @Query('userId') userId?: string | string[],
    @Query('fieldName') fieldName?: string | string[],
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    const filters = {
      changeType: parseChangeTypeArray(changeType),
      userId: parseArrayParam(userId),
      fieldName: parseArrayParam(fieldName),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    };

    return this.leadService.getLeadHistory(
      id,
      filters,
      page || 1,
      limit || 50
    );
  }

  /**
   * Получить статистику изменений лида
   */
  @Get(':id/history/stats')
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getLeadChangeStatistics(
    @Param('id') id: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.leadService.getLeadChangeStatistics(
      id,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }
}
