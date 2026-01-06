import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateTelegramTemplateDto, UpdateTelegramTemplateDto } from '../dto/telegram-template.dto';
import { BulkSendDto } from '../dto/bulk-send.dto';
import { TelegramTemplateService } from '../services/telegram-template.service';
import { TemplateRenderService } from '../services/template-render.service';
import { MessageQueueService } from '../services/message-queue.service';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Telegram Templates')
@Controller('messages/telegram/templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelegramTemplateController {
  constructor(
    private readonly templateService: TelegramTemplateService,
    private readonly renderService: TemplateRenderService,
    private readonly queueService: MessageQueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Получить все Telegram шаблоны' })
  @ApiResponse({ status: 200, description: 'Список шаблонов' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: boolean,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const paginationDto: PaginationDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive;
    if (category) filters.category = category;
    if (search) filters.search = search;

    return this.templateService.findAll(paginationDto, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить Telegram шаблон по ID' })
  @ApiResponse({ status: 200, description: 'Шаблон найден' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый Telegram шаблон' })
  @ApiResponse({ status: 201, description: 'Шаблон создан' })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async create(@Body() dto: CreateTelegramTemplateDto, @Req() req: any) {
    // Валидация шаблона
    const validation = this.renderService.validateTemplate(dto.content);
    if (!validation.valid) {
      throw new Error(`Invalid variables: ${validation.invalidVariables.join(', ')}`);
    }

    return this.templateService.create(dto as any, req.user);
  }

  @Put(':id')
  @Patch(':id')
  @ApiOperation({ summary: 'Обновить Telegram шаблон' })
  @ApiResponse({ status: 200, description: 'Шаблон обновлен' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async update(@Param('id') id: string, @Body() dto: UpdateTelegramTemplateDto) {
    // Если обновляется контент, валидируем его
    if (dto.content) {
      const validation = this.renderService.validateTemplate(dto.content);
      if (!validation.valid) {
        throw new Error(`Invalid variables: ${validation.invalidVariables.join(', ')}`);
      }
    }

    return this.templateService.update(id, dto as any);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить Telegram шаблон' })
  @ApiResponse({ status: 200, description: 'Шаблон удален' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async remove(@Param('id') id: string) {
    await this.templateService.remove(id);
    return { success: true, message: 'Template deleted' };
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Переключить статус активности шаблона' })
  @ApiResponse({ status: 200, description: 'Статус изменен' })
  async toggleActive(@Param('id') id: string) {
    const template = await this.templateService.findOne(id);
    return this.templateService.update(id, { isActive: !template.isActive });
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Создать копию шаблона' })
  @ApiResponse({ status: 201, description: 'Копия создана' })
  async duplicate(@Param('id') id: string, @Req() req: any) {
    return this.templateService.duplicate(id, req.user);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Предпросмотр шаблона с тестовыми данными' })
  @ApiResponse({ status: 200, description: 'Рендеринг выполнен' })
  async preview(
    @Param('id') id: string,
    @Body() contextIds: { contactId?: string; leadId?: number; dealId?: string; companyId?: string },
  ) {
    const template = await this.templateService.findOne(id);

    // Загружаем контекст
    const context = await this.renderService.loadContext(contextIds);

    // Рендерим шаблон
    const rendered = await this.renderService.renderTemplate(template.content, context);

    return {
      template: template.content,
      rendered,
      context: {
        contact: context.contact?.name,
        lead: context.lead?.name,
        deal: context.deal?.title,
        company: context.company?.name,
      },
    };
  }

  @Post(':id/send-bulk')
  @ApiOperation({ summary: 'Массовая отправка Telegram сообщений' })
  @ApiResponse({ status: 200, description: 'Сообщения поставлены в очередь' })
  async sendBulk(@Param('id') id: string, @Body() dto: BulkSendDto) {
    const template = await this.templateService.findOne(id);

    if (!template.isActive) {
      throw new Error('Template is not active');
    }

    if (!dto.contactIds || dto.contactIds.length === 0) {
      throw new Error('No contacts specified');
    }

    // Отправляем в очередь
    const result = await this.queueService.queueTelegramBulk({
      templateId: id,
      contactIds: dto.contactIds,
      priority: dto.priority,
    });

    return {
      success: true,
      ...result,
    };
  }
}
