import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ForecastingService, CreateForecastDto, UpdateForecastDto, ForecastQueryDto } from './forecasting.service';
import { ForecastType, ForecastStatus } from './entities/forecast.entity';
import { ANALYTICS_PATTERNS } from '@crm/contracts';

@Controller('forecasting')
export class ForecastingController {
  constructor(private readonly service: ForecastingService) {}

  @Get()
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_GET_ALL)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: ForecastType,
    @Query('status') status?: ForecastStatus,
    @Query('ownerId') ownerId?: string,
    @Query('team') team?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      type,
      status,
      ownerId: ownerId ? parseInt(ownerId, 10) : undefined,
      team,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_GET_STATS)
  async getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_GET_ONE)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/periods')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_GET_PERIODS)
  async getPeriods(@Param('id') id: string) {
    return this.service.getPeriods(id);
  }

  @Post()
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_CREATE)
  async create(@Body() dto: CreateForecastDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateForecastDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_DELETE)
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':id/calculate')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_CALCULATE)
  async calculate(@Param('id') id: string) {
    return this.service.calculate(id);
  }

  @Post(':id/activate')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_ACTIVATE)
  async activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Post(':id/complete')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_COMPLETE)
  async complete(@Param('id') id: string) {
    return this.service.complete(id);
  }

  @Post(':id/archive')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_ARCHIVE)
  async archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Post(':id/duplicate')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_DUPLICATE)
  async duplicate(@Param('id') id: string) {
    return this.service.duplicate(id);
  }

  @Put('periods/:periodId/actual')
  @MessagePattern(ANALYTICS_PATTERNS.FORECAST_UPDATE_PERIOD)
  async updatePeriodActual(
    @Param('periodId') periodId: string,
    @Body() body: { actualValue: number; notes?: string }
  ) {
    return this.service.updatePeriodActual(periodId, body.actualValue, body.notes);
  }
}
