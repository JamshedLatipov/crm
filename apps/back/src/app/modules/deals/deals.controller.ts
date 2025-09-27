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
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { DealStatus } from './deal.entity';

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  async listDeals(
    @Query('stageId') stageId?: string,
    @Query('status') status?: DealStatus,
    @Query('assignedTo') assignedTo?: string,
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

    return this.dealsService.listDeals();
  }

  @Get('overdue')
  async getOverdueDeals() {
    return this.dealsService.getOverdueDeals();
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

  @Post()
  async createDeal(@Body() dto: CreateDealDto) {
    return this.dealsService.createDeal(dto);
  }

  @Patch(':id')
  async updateDeal(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.updateDeal(id, dto);
  }

  @Delete(':id')
  async deleteDeal(@Param('id') id: string) {
    await this.dealsService.deleteDeal(id);
    return { message: 'Deal deleted successfully' };
  }

  // Специальные операции
  @Patch(':id/move-stage')
  async moveToStage(@Param('id') id: string, @Body('stageId') stageId: string) {
    return this.dealsService.moveToStage(id, stageId);
  }

  @Patch(':id/win')
  async winDeal(@Param('id') id: string, @Body('amount') actualAmount?: number) {
    return this.dealsService.winDeal(id, actualAmount);
  }

  @Patch(':id/lose')
  async loseDeal(@Param('id') id: string, @Body('notes') reason: string) {
    return this.dealsService.loseDeal(id, reason);
  }

  @Patch(':id/probability')
  async updateProbability(@Param('id') id: string, @Body('probability') probability: number) {
    return this.dealsService.updateProbability(id, probability);
  }

  @Patch(':id/assign')
  async assignDeal(@Param('id') id: string, @Body('assignedTo') managerId: string) {
    return this.dealsService.assignDeal(id, managerId);
  }
}
