import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { DealHistoryService } from '../services/deal-history.service';
import { DealChangeType } from '../entities/deal-history.entity';

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
@Controller('deals/history')
export class DealHistoryController {
  constructor(private readonly historyService: DealHistoryService) {}

  /**
   * Получить последние изменения по всем сделкам
   */
  @Get('recent')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество записей на странице' })
  @ApiQuery({ name: 'changeType', required: false, type: String, description: 'Тип изменения (можно несколько через запятую)' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'ID пользователя (можно несколько через запятую)' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getRecentChanges(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('changeType') changeType?: string | string[],
    @Query('userId') userId?: string | string[],
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    const filters = {
      changeType: parseDealChangeTypeArray(changeType),
      userId: parseArrayParam(userId),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    };

    return this.historyService.getRecentChanges(
      filters,
      page || 1,
      limit || 20
    );
  }

  /**
   * Получить общую статистику изменений
   */
  @Get('stats')
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getGlobalChangeStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.historyService.getChangeStatistics(
      undefined, // dealId не указан = общая статистика
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }

  /**
   * Получить активность пользователей по сделкам
   */
  @Get('user-activity')
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество пользователей' })
  async getUserActivity(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: number
  ) {
    return this.historyService.getUserActivity(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      limit || 10
    );
  }

  /**
   * Получить статистику движения по этапам
   */
  @Get('stage-movement')
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getStageMovementStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.historyService.getStageMovementStats(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }

  /**
   * Получить самые активные сделки
   */
  @Get('most-active-deals')
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество сделок' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Дата начала (ISO формат)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Дата окончания (ISO формат)' })
  async getMostActiveDeals(
    @Query('limit') limit?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.historyService.getMostActiveDays(
      limit || 10,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }
}