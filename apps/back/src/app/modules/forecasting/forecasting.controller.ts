import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ForecastingService } from './forecasting.service';
import { CreateForecastDto, UpdateForecastDto, ForecastQueryDto, UpdatePeriodActualDto } from './dto/forecasting.dto';

@ApiTags('forecasting')
@Controller('forecasting')
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new forecast' })
  @ApiResponse({ status: 201, description: 'Forecast created successfully' })
  async create(@Body() createDto: CreateForecastDto) {
    return this.forecastingService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all forecasts with filtering' })
  @ApiResponse({ status: 200, description: 'Forecasts retrieved successfully' })
  async findAll(@Query() query: ForecastQueryDto) {
    return this.forecastingService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get forecast by ID' })
  @ApiResponse({ status: 200, description: 'Forecast retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async findOne(@Param('id') id: string) {
    return this.forecastingService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update forecast' })
  @ApiResponse({ status: 200, description: 'Forecast updated successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateForecastDto) {
    return this.forecastingService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete forecast' })
  @ApiResponse({ status: 204, description: 'Forecast deleted successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async delete(@Param('id') id: string) {
    await this.forecastingService.delete(id);
  }

  @Post(':id/calculate')
  @ApiOperation({ summary: 'Calculate forecast predictions' })
  @ApiResponse({ status: 200, description: 'Forecast calculated successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async calculate(@Param('id') id: string, @Query('includeHistorical') includeHistorical?: boolean) {
    return this.forecastingService.calculate(id, includeHistorical);
  }

  @Get(':id/periods')
  @ApiOperation({ summary: 'Get forecast periods' })
  @ApiResponse({ status: 200, description: 'Periods retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async getPeriods(@Param('id') id: string) {
    return this.forecastingService.getPeriods(id);
  }

  @Put('periods/:periodId/actual')
  @ApiOperation({ summary: 'Update period actual value' })
  @ApiResponse({ status: 200, description: 'Period updated successfully' })
  @ApiResponse({ status: 404, description: 'Period not found' })
  async updatePeriodActual(
    @Param('periodId') periodId: string,
    @Body() updateDto: UpdatePeriodActualDto
  ) {
    return this.forecastingService.updatePeriodActual(periodId, updateDto);
  }

  @Get(':id/comparison')
  @ApiOperation({ summary: 'Get forecast comparison (target vs predicted vs actual)' })
  @ApiResponse({ status: 200, description: 'Comparison retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async getComparison(@Param('id') id: string) {
    return this.forecastingService.getComparison(id);
  }
}
