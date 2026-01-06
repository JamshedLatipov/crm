import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SmsAnalyticsService } from '../services/sms-analytics.service';
import { MetricType } from '../entities/sms-analytics.entity';

@ApiTags('SMS Analytics')
@ApiBearerAuth()
@Controller('sms/analytics')
export class SmsAnalyticsController {
  constructor(private readonly analyticsService: SmsAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Получить статистику панели управления' })
  @ApiResponse({ status: 200, description: 'Общая статистика' })
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    return this.analyticsService.getDashboardStats(dateRange);
  }

  @Get('campaigns/performance')
  @ApiOperation({ summary: 'Получить производительность кампаний' })
  @ApiResponse({ status: 200, description: 'Статистика по кампаниям' })
  async getCampaignPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    return this.analyticsService.getCampaignPerformance(dateRange);
  }

  @Get('messages/by-day')
  @ApiOperation({ summary: 'Получить статистику сообщений по дням' })
  @ApiResponse({ status: 200, description: 'Статистика по дням' })
  async getMessagesByDay(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.analyticsService.getMessageStatsByDay({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }

  @Get('messages/by-hour')
  @ApiOperation({ summary: 'Получить статистику сообщений по часам' })
  @ApiResponse({ status: 200, description: 'Статистика по часам дня' })
  async getMessagesByHour(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    return this.analyticsService.getMessageStatsByHour(dateRange);
  }

  @Get('failed/top')
  @ApiOperation({ summary: 'Получить топ неудачных номеров' })
  @ApiResponse({ status: 200, description: 'Список проблемных номеров' })
  async getTopFailedNumbers(@Query('limit') limit?: string) {
    return this.analyticsService.getTopFailedNumbers(limit ? parseInt(limit) : 10);
  }

  @Get('campaigns/compare')
  @ApiOperation({ summary: 'Сравнить кампании' })
  @ApiResponse({ status: 200, description: 'Сравнение кампаний' })
  async compareCampaigns(@Query('campaignIds') campaignIds: string) {
    const ids = campaignIds.split(',');
    return this.analyticsService.compareCampaigns(ids);
  }

  @Get('campaigns/:id/export')
  @ApiOperation({ summary: 'Экспортировать отчёт по кампании' })
  @ApiResponse({ status: 200, description: 'Отчёт кампании' })
  async exportCampaignReport(@Param('id') id: string) {
    return this.analyticsService.exportCampaignReport(id);
  }

  @Get('metrics/trends')
  @ApiOperation({ summary: 'Получить тренды метрик' })
  @ApiResponse({ status: 200, description: 'Тренды метрик' })
  async getMetricTrends(
    @Query('metricType') metricType: MetricType,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.analyticsService.getMetricTrends(metricType, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }
}
