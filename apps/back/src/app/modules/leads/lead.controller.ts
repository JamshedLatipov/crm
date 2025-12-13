import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { Lead } from './lead.entity';
import {
  CreateLeadDto,
  UpdateLeadDto,
  AssignLeadDto,
  ScoreLeadDto,
  QualifyLeadDto,
  AddNoteDto,
  AddTagsDto,
  RemoveTagsDto,
  ScheduleFollowUpDto,
  LeadFiltersDto,
} from './lead.dto';
import { LeadStatus, LeadSource, LeadPriority } from './lead.entity';
import { LeadActivity } from './entities/lead-activity.entity';
import { ChangeType } from './entities/lead-history.entity';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../user/current-user.decorator';
import { AutomationService } from '../pipeline/automation.service';

// Helper function to parse array parameters
function parseArrayParam(
  param: string | string[] | undefined
): string[] | undefined {
  if (!param) return undefined;
  if (Array.isArray(param)) return param;
  return param
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Type-safe enum parsing functions
function parseStatusArray(
  param: string | string[] | undefined
): LeadStatus[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed
    ? (parsed.filter((s) =>
        Object.values(LeadStatus).includes(s as LeadStatus)
      ) as LeadStatus[])
    : undefined;
}

function parseSourceArray(
  param: string | string[] | undefined
): LeadSource[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed
    ? (parsed.filter((s) =>
        Object.values(LeadSource).includes(s as LeadSource)
      ) as LeadSource[])
    : undefined;
}

function parsePriorityArray(
  param: string | string[] | undefined
): LeadPriority[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed
    ? (parsed.filter((s) =>
        Object.values(LeadPriority).includes(s as LeadPriority)
      ) as LeadPriority[])
    : undefined;
}

function parseChangeTypeArray(
  param: string | string[] | undefined
): ChangeType[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed
    ? (parsed.filter((s) =>
        Object.values(ChangeType).includes(s as ChangeType)
      ) as ChangeType[])
    : undefined;
}

@ApiTags('leads')
// @ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadController {
  constructor(
    private readonly leadService: LeadService,
    private readonly automationService: AutomationService
  ) {}

  @Post()
  @ApiBody({ type: CreateLeadDto })
  async create(
    @Body() data: CreateLeadDto,
    @Req() req: unknown,
    @CurrentUser() user?: CurrentUserPayload
  ): Promise<Lead> {
    if (req && typeof req === 'object' && req !== null) {
      const r = req as { rawBody?: unknown; headers?: Record<string, unknown> };
      if (typeof r.rawBody === 'string') {
        console.log('Creating lead — rawBody from middleware:', r.rawBody);
      }
      const headers = r.headers || {};
      const contentType = (headers['content-type'] ||
        headers['Content-Type']) as string | undefined;
      const contentLength = (headers['content-length'] ||
        headers['Content-Length']) as string | undefined;
      const transferEncoding = (headers['transfer-encoding'] ||
        headers['Transfer-Encoding']) as string | undefined;
      const xff = (headers['x-forwarded-for'] || headers['X-Forwarded-For']) as
        | string
        | undefined;
      console.log('Creating lead — headers:', {
        contentType,
        contentLength,
        transferEncoding,
        xForwardedFor: xff,
      });
    }
    const userId = user?.sub ? String(user.sub) : undefined;
    const userName = user?.username;
    const lead = await this.leadService.create(data, userId, userName);

    // Trigger automation asynchronously
    setImmediate(() => {
      this.automationService.onLeadCreated(lead).catch((error) => {
        console.error('Error in lead creation automation:', error);
      });
    });

    return lead;
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
  async getHighValueLeads(
    @Query('minValue') minValue = 10000
  ): Promise<Lead[]> {
    return this.leadService.getHighValueLeads(Number(minValue));
  }

  // Bulk assign endpoint should be declared before routes with :id to avoid route collision
  @Patch('bulk-assign')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        leadIds: { type: 'array', items: { type: 'string' } },
        managerId: { type: 'string' },
      },
      required: ['leadIds', 'managerId'],
    },
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async bulkAssign(
    @Body() body: { leadIds: string[]; managerId: string },
    @CurrentUser() user?: CurrentUserPayload
  ): Promise<Lead[]> {
    const { leadIds, managerId } = body || ({} as any);
    if (!Array.isArray(leadIds) || !leadIds.length || !managerId) {
      throw new BadRequestException(
        'leadIds (array) and managerId are required'
      );
    }

    const operatorId =
      typeof user?.sub === 'string' || typeof user?.sub === 'number'
        ? parseInt(String(user.sub))
        : undefined;
    const operatorName = user?.username;

    return this.leadService.bulkAssign(
      leadIds,
      managerId,
      operatorId,
      operatorName
    );
  }

  @Get('stale')
  @ApiQuery({ name: 'days', type: 'number', required: false })
  async getStaleLeads(@Query('days') days = 30): Promise<Lead[]> {
    return this.leadService.getStaleLeads(Number(days));
  }

  @Get('manager/:managerId')
  async getLeadsByManager(
    @Param('managerId') managerId: string
  ): Promise<Lead[]> {
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
  async update(
    @Param('id') id: number,
    @Body() data: UpdateLeadDto,
    @CurrentUser() user?: CurrentUserPayload
  ): Promise<Lead> {
    const existingLead = await this.leadService.findById(id);
    const updatedLead = await this.leadService.update(id, data, user.sub || String(1));

    // Trigger automation asynchronously
    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(data).forEach((key) => {
      if (
        existingLead &&
        existingLead[key as keyof Lead] !== updatedLead[key as keyof Lead]
      ) {
        changes[key] = {
          old: existingLead[key as keyof Lead],
          new: updatedLead[key as keyof Lead],
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      setImmediate(() => {
        this.automationService
          .onLeadUpdated(updatedLead, changes)
          .catch((error) => {
            console.error('Error in lead update automation:', error);
          });
      });
    }

    // Return freshest data for the lead (ensure assignments and relations attached)
    const fresh = await this.leadService.findById(updatedLead.id);
    return fresh || updatedLead;
  }

  @Patch(':id/assign')
  @ApiBody({ type: AssignLeadDto })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async assignLead(
    @Param('id') id: number,
    @Body() body: AssignLeadDto,
    @CurrentUser() user?: CurrentUserPayload
  ): Promise<Lead> {
    const userOrManager = body.managerId ?? body.user;
    if (!userOrManager) {
      throw new BadRequestException(
        'Missing user or managerId in request body'
      );
    }
    if (!user) {
      throw new UnauthorizedException(
        'Authenticated user required to assign leads'
      );
    }
    // Ensure user.sub is present and numeric
    const operatorId =
      typeof user.sub === 'string' || typeof user.sub === 'number'
        ? parseInt(String(user.sub))
        : NaN;
    if (Number.isNaN(operatorId)) {
      throw new UnauthorizedException('Invalid user id in token payload');
    }
    const operatorName = user.username ?? 'unknown';
    return this.leadService.assignLead(
      id,
      userOrManager,
      operatorId,
      operatorName
    );
  }

  @Post(':id/auto-assign')
  async autoAssignLead(
    @Param('id') id: number,
    @Body()
    body: {
      industry?: string;
      territory?: string;
      criteria: string[];
    }
  ): Promise<Lead | null> {
    return this.leadService.autoAssignLead(id, body);
  }

  @Patch(':id/score')
  @ApiBody({ type: ScoreLeadDto })
  async scoreLead(
    @Param('id') id: number,
    @Body() body: ScoreLeadDto
  ): Promise<Lead> {
    return this.leadService.scoreLead(id, body.score);
  }

  @Patch(':id/status')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        autoConvert: {
          type: 'boolean',
          description:
            'If true and status==converted, convert lead to deal automatically',
        },
        convertPayload: {
          type: 'object',
          description: 'Optional payload for create deal when auto converting',
        },
      },
      required: ['status'],
    },
  })
  async changeStatus(
    @Param('id') id: number,
    @Body() body: any,
    @CurrentUser() user?: CurrentUserPayload
  ): Promise<Lead> {
    const status = body.status as any;
    const userId = user?.sub ? String(user.sub) : undefined;
    const userName = user?.username;

    const updated = await this.leadService.changeStatus(
      id,
      status,
      userId,
      userName
    );

    // If status is converted and caller requested auto-convert, perform conversion
    if (
      status === 'converted' ||
      status === 'CONVERTED' ||
      status === (LeadStatus.CONVERTED as any)
    ) {
      if (body.autoConvert) {
        // body.convertPayload may contain deal creation fields
        const payload = body.convertPayload || {};
        try {
          await this.leadService.convertToDeal(
            id,
            {
              title: payload.title,
              amount: payload.amount || updated.estimatedValue || 0,
              currency: payload.currency || 'RUB',
              probability:
                payload.probability || updated.conversionProbability || 50,
              expectedCloseDate: payload.expectedCloseDate
                ? new Date(payload.expectedCloseDate)
                : new Date(),
              stageId: payload.stageId || undefined,
              notes: payload.notes || undefined,
            },
            userId,
            userName
          );
        } catch (err) {
          // log and continue — status already changed
          console.error('Auto-convert failed:', err?.message || err);
        }
      }
    }

    return updated;
  }

  @Patch(':id/qualify')
  @ApiBody({ type: QualifyLeadDto })
  async qualifyLead(
    @Param('id') id: number,
    @Body() body: QualifyLeadDto
  ): Promise<Lead> {
    return this.leadService.qualifyLead(id, body.isQualified);
  }

  @Post(':id/notes')
  @ApiBody({ type: AddNoteDto })
  async addNote(
    @Param('id') id: number,
    @Body() body: AddNoteDto
  ): Promise<void> {
    return this.leadService.addNote(id, body.note);
  }

  @Post(':id/tags')
  @ApiBody({ type: AddTagsDto })
  async addTags(
    @Param('id') id: number,
    @Body() body: AddTagsDto
  ): Promise<Lead> {
    return this.leadService.addTags(id, body.tags);
  }

  @Delete(':id/tags')
  @ApiBody({ type: RemoveTagsDto })
  async removeTags(
    @Param('id') id: number,
    @Body() body: RemoveTagsDto
  ): Promise<Lead> {
    return this.leadService.removeTags(id, body.tags);
  }

  @Patch(':id/contact')
  async updateLastContact(@Param('id') id: number): Promise<void> {
    return this.leadService.updateLastContact(id);
  }

  @Post(':id/follow-up')
  @ApiBody({ type: ScheduleFollowUpDto })
  async scheduleFollowUp(
    @Param('id') id: number,
    @Body() body: ScheduleFollowUpDto
  ): Promise<Lead> {
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
        probability: {
          type: 'number',
          description: 'Вероятность закрытия в % (0-100)',
        },
        expectedCloseDate: {
          type: 'string',
          format: 'date',
          description: 'Ожидаемая дата закрытия',
        },
        stageId: { type: 'string', description: 'ID этапа воронки' },
        notes: { type: 'string', description: 'Заметки (опционально)' },
      },
      required: ['amount', 'expectedCloseDate', 'stageId'],
    },
  })
  async convertToDeal(
    @Param('id') id: number,
    @Body()
    body: {
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
      expectedCloseDate: new Date(body.expectedCloseDate),
    });
  }

  @Patch(':id/promo-company')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        promoCompanyId: { type: 'number', description: 'ID промо-компании' },
      },
      required: ['promoCompanyId'],
    },
  })
  async assignPromoCompany(
    @Param('id') id: number,
    @Body() body: { promoCompanyId: number }
  ): Promise<Lead> {
    return this.leadService.assignPromoCompany(id, body.promoCompanyId);
  }

  @Delete(':id/promo-company')
  async removePromoCompany(@Param('id') id: number): Promise<Lead> {
    return this.leadService.removePromoCompany(id);
  }

  /**
   * Получить историю изменений лида
   */
  @Get(':id/history')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Номер страницы',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Количество записей на странице',
  })
  @ApiQuery({
    name: 'changeType',
    required: false,
    type: String,
    description: 'Тип изменения (можно несколько через запятую)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'ID пользователя (можно несколько через запятую)',
  })
  @ApiQuery({
    name: 'fieldName',
    required: false,
    type: String,
    description: 'Название поля (можно несколько через запятую)',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Дата начала (ISO формат)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Дата окончания (ISO формат)',
  })
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
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    return this.leadService.getLeadHistory(id, filters, page || 1, limit || 50);
  }

  /**
   * Получить статистику изменений лида
   */
  @Get(':id/history/stats')
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Дата начала (ISO формат)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Дата окончания (ISO формат)',
  })
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
