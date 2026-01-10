import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MessageAnalyticsService } from '../services/message-analytics.service';

@ApiTags('Message Analytics')
@Controller('messages/analytics')
export class MessageAnalyticsController {
  constructor(private readonly analyticsService: MessageAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Получить общую статистику панели управления' })
  @ApiResponse({ status: 200, description: 'Общая статистика уведомлений' })
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    return this.analyticsService.getDashboardStats(dateRange);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Получить статистику по каналам' })
  @ApiResponse({ status: 200, description: 'Статистика по каналам доставки' })
  async getChannels(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    return this.analyticsService.getChannelStats(dateRange);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Получить топ кампаний' })
  @ApiResponse({ status: 200, description: 'Статистика по кампаниям' })
  async getCampaigns(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;

    const limitNum = limit ? parseInt(limit, 10) : 5;

    return this.analyticsService.getTopCampaigns(limitNum, dateRange);
  }

  @Get('by-day')
  @ApiOperation({ summary: 'Получить статистику по дням' })
  @ApiResponse({ status: 200, description: 'Статистика по дням' })
  async getByDay(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.analyticsService.getStatsByDay({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }
}
