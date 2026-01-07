import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessageCampaignService } from '../services/message-campaign.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  StartCampaignDto,
  PauseCampaignDto,
  ResumeCampaignDto,
  CancelCampaignDto,
} from '../dto/campaign.dto';
import { CampaignStatus, CampaignType } from '../entities/sms-campaign.entity';

@ApiTags('SMS Campaigns')
@ApiBearerAuth()
@Controller('messages/campaigns')
export class SmsCampaignController {
  constructor(private readonly campaignService: MessageCampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую кампанию' })
  @ApiResponse({ status: 201, description: 'Кампания успешно создана' })
  async create(@Body() createDto: CreateCampaignDto, @Req() req: any) {
    return this.campaignService.create(createDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех кампаний' })
  @ApiResponse({ status: 200, description: 'Список кампаний' })
  async findAll(
    @Query('status') status?: CampaignStatus,
    @Query('type') type?: CampaignType,
    @Query('search') search?: string
  ) {
    return this.campaignService.findAll({ status, type, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить кампанию по ID' })
  @ApiResponse({ status: 200, description: 'Детали кампании' })
  @ApiResponse({ status: 404, description: 'Кампания не найдена' })
  async findOne(@Param('id') id: string) {
    return this.campaignService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить кампанию' })
  @ApiResponse({ status: 200, description: 'Кампания успешно обновлена' })
  @ApiResponse({ status: 404, description: 'Кампания не найдена' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateCampaignDto) {
    return this.campaignService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить кампанию' })
  @ApiResponse({ status: 200, description: 'Кампания успешно удалена' })
  @ApiResponse({ status: 404, description: 'Кампания не найдена' })
  async remove(@Param('id') id: string) {
    await this.campaignService.remove(id);
    return { message: 'Campaign deleted successfully' };
  }

  @Post(':id/prepare')
  @ApiOperation({ summary: 'Подготовить сообщения для кампании' })
  @ApiResponse({ status: 200, description: 'Сообщения подготовлены' })
  async prepare(@Param('id') id: string) {
    await this.campaignService.prepareCampaignMessages(id);
    return { message: 'Campaign messages prepared successfully' };
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Запустить кампанию' })
  @ApiResponse({ status: 200, description: 'Кампания запущена' })
  async start(@Param('id') id: string) {
    return this.campaignService.startCampaign(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Приостановить кампанию' })
  @ApiResponse({ status: 200, description: 'Кампания приостановлена' })
  async pause(@Param('id') id: string) {
    return this.campaignService.pauseCampaign(id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Возобновить кампанию' })
  @ApiResponse({ status: 200, description: 'Кампания возобновлена' })
  async resume(@Param('id') id: string) {
    return this.campaignService.resumeCampaign(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Отменить кампанию' })
  @ApiResponse({ status: 200, description: 'Кампания отменена' })
  async cancel(@Param('id') id: string) {
    return this.campaignService.cancelCampaign(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Получить статистику кампании' })
  @ApiResponse({ status: 200, description: 'Статистика кампании' })
  async getStats(@Param('id') id: string) {
    return this.campaignService.getCampaignStats(id);
  }
}
