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
} from '@nestjs/common';
import { ApiTags, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { SearchDealsAdvancedDto } from './dto/search-deals-advanced.dto';
import { DealStatus } from './deal.entity';
import { DealChangeType } from './entities/deal-history.entity';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../user/current-user.decorator';
import { AutomationService } from '../pipeline/automation.service';

// Helper function to parse array parameters
function parseArrayParam(param: string | string[]): string[] | undefined {
  if (!param) return undefined;
  if (Array.isArray(param)) return param;
  return param.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

function parseDealChangeTypeArray(param: string | string[]): DealChangeType[] | undefined {
  const parsed = parseArrayParam(param);
  return parsed ? parsed.filter(s => Object.values(DealChangeType).includes(s as DealChangeType)) as DealChangeType[] : undefined;
}

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly automationService: AutomationService
  ) {}

  @Get()
  async listDeals(
    @Query('stageId') stageId?: string,
    @Query('status') status?: DealStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    if (stageId) {
      return this.dealsService.getDealsByStage(stageId);
    }

    if (status) {
      return this.dealsService.getDealsByStatus(status);
    }

    if (assignedTo) {
      return this.dealsService.getDealsByManager(assignedTo);
    }

    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;
    return this.dealsService.listDeals(pageNum, limitNum, {
      q,
      sortBy,
      sortDir: sortDir as any
    });
  }

  @Get('overdue')
  async getOverdueDeals() {
    return this.dealsService.getOverdueDeals();
  }

  @Post('search/advanced')
  async searchDealsAdvanced(@Body() dto: SearchDealsAdvancedDto) {
    return this.dealsService.searchDealsWithFilters(dto);
  }

  @Get('search')
  async searchDeals(@Query('q') query: string) {
    return this.dealsService.searchDeals(query);
  }

  @Get('forecast')
  async getSalesForecast(@Query('period') period: 'month' | 'quarter' | 'year' = 'month') {
    return this.dealsService.getSalesForecast(period);
  }

  @Get(':id')
  async getDealById(@Param('id') id: string) {
    return this.dealsService.getDealById(id);
  }

   @Get(':id/assignments')
  async getCurrentAssignments(@Param('id') id: string) {
    return this.dealsService.getCurrentAssignments(id);
  }

  @Post()
  async createDeal(
    @Body() dto: CreateDealDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    const deal = await this.dealsService.createDeal(dto, user.sub, user.username);
    
    // Trigger automation asynchronously
    setImmediate(() => {
      this.automationService.onDealCreated(deal, user.sub, user.username).catch(error => {
        console.error('Error in deal creation automation:', error);
      });
    });
    
    return deal;
  }

  @Patch(':id')
  async updateDeal(
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    const existingDeal = await this.dealsService.getDealById(id);
    const updatedDeal = await this.dealsService.updateDeal(id, dto, user.sub, user.username);
    
    // Trigger automation asynchronously
    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(dto).forEach(key => {
      if (existingDeal[key as keyof typeof existingDeal] !== updatedDeal[key as keyof typeof updatedDeal]) {
        changes[key] = {
          old: existingDeal[key as keyof typeof existingDeal],
          new: updatedDeal[key as keyof typeof updatedDeal]
        };
      }
    });
    
    if (Object.keys(changes).length > 0) {
      setImmediate(() => {
        this.automationService.onDealUpdated(updatedDeal, changes, user.sub, user.username).catch(error => {
          console.error('Error in deal update automation:', error);
        });
      });
    }
    
    return updatedDeal;
  }

  @Delete(':id')
  async deleteDeal(@Param('id') id: string) {
    await this.dealsService.deleteDeal(id);
    return { message: 'Deal deleted successfully' };
  }

  // Специальные операции
  @Patch(':id/move-stage')
  async moveToStage(
    @Param('id') id: string,
    @Body('stageId') stageId: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.dealsService.moveToStage(id, stageId, user.sub, user.username);
  }

  @Patch(':id/win')
  async winDeal(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('amount') actualAmount?: number
  ) {
    return this.dealsService.winDeal(id, actualAmount, user.sub, user.username);
  }

  @Patch(':id/lose')
  async loseDeal(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('reason') reason?: string
  ) {
    return this.dealsService.loseDeal(id, reason, user.sub, user.username);
  }

  @Patch(':id/probability')
  async updateProbability(@Param('id') id: string, @Body('probability') probability: number) {
    return this.dealsService.updateProbability(id, probability);
  }

  // Связи с компаниями, контактами и лидами
  @Patch(':id/link-company')
  async linkToCompany(@Param('id') id: string, @Body('companyId') companyId: string) {
    return this.dealsService.linkDealToCompany(id, companyId);
  }

  @Patch(':id/link-contact')
  async linkToContact(@Param('id') id: string, @Body('contactId') contactId: string) {
    return this.dealsService.linkDealToContact(id, contactId);
  }

  @Patch(':id/link-lead')
  async linkToLead(@Param('id') id: string, @Body('leadId') leadId: number) {
    return this.dealsService.linkDealToLead(id, leadId);
  }

  @Get('by-company/:companyId')
  async getDealsByCompany(@Param('companyId') companyId: string) {
    return this.dealsService.getDealsByCompany(companyId);
  }

  @Get('by-contact/:contactId')
  async getDealsByContact(@Param('contactId') contactId: string) {
    const result = await this.dealsService.getDealsByContact(contactId);
    return result;
  }

  @Get('by-lead/:leadId')
  async getDealsByLead(@Param('leadId') leadId: number) {
    return this.dealsService.getDealsByLead(leadId);
  }

  /**
   * Получить историю изменений сделки
   */
  @Get(':id/history')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество записей на странице' })
  @ApiQuery({ name: 'changeType', required: false, type: String, description: 'Тип изменения (можно несколько через запятую)' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'ID пользователя (можно несколько через запятую)' })
  @ApiQuery({ name: 'fieldName', required: false, type: String, description: 'Название поля (можно несколько через запятую)' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getDealHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('changeType') changeType?: string | string[],
    @Query('userId') userId?: string | string[],
    @Query('fieldName') fieldName?: string | string[],
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    const filters = {
      changeType: parseDealChangeTypeArray(changeType),
      userId: parseArrayParam(userId),
      fieldName: parseArrayParam(fieldName),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    };

    return this.dealsService.getDealHistory(
      id,
      filters,
      page || 1,
      limit || 50
    );
  }

  /**
   * Получить статистику изменений сделки
   */
  @Get(':id/history/stats')
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getDealChangeStatistics(
    @Param('id') id: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.dealsService.getDealChangeStatistics(
      id,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }

  /**
   * Получить статистику движения по этапам
   */
  @Get('history/stage-movement-stats')
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getStageMovementStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.dealsService.getStageMovementStats(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }

  /**
   * Получить самые активные сделки
   */
  @Get('history/most-active')
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество сделок' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getMostActiveDeals(
    @Query('limit') limit?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.dealsService.getMostActiveDeals(
      limit || 10,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }
}
