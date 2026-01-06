import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramTemplate } from '../entities/telegram-template.entity';
import { CreateTelegramTemplateDto, UpdateTelegramTemplateDto } from '../dto/telegram-template.dto';
import { BulkSendDto } from '../dto/bulk-send.dto';
import { TemplateRenderService } from '../services/template-render.service';
import { MessageQueueService } from '../services/message-queue.service';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';

@ApiTags('Telegram Templates')
@Controller('messages/telegram/templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelegramTemplateController {
  constructor(
    @InjectRepository(TelegramTemplate)
    private readonly templateRepo: Repository<TelegramTemplate>,
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
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.templateRepo.findAndCount({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      hasMore: total > pageNum * limitNum,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить Telegram шаблон по ID' })
  @ApiResponse({ status: 200, description: 'Шаблон найден' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async findOne(@Param('id') id: string) {
    console.log('=== findAll called --=ф-ыв=фы0в=-фы0в=-фы0в=-фы0=в ===');
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый Telegram шаблон' })
  @ApiResponse({ status: 201, description: 'Шаблон создан' })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async create(@Body() dto: CreateTelegramTemplateDto) {
    // Валидация шаблона
    const validation = this.renderService.validateTemplate(dto.content);
    if (!validation.valid) {
      throw new Error(`Invalid variables: ${validation.invalidVariables.join(', ')}`);
    }

    // Извлекаем переменные
    const variables = this.renderService.extractVariables(dto.content);

    const template = this.templateRepo.create({
      ...dto,
      variables, // Теперь это отдельное поле
    });

    return this.templateRepo.save(template);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить Telegram шаблон' })
  @ApiResponse({ status: 200, description: 'Шаблон обновлен' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async update(@Param('id') id: string, @Body() dto: UpdateTelegramTemplateDto) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new Error('Template not found');
    }

    // Если обновляется контент, валидируем его
    if (dto.content) {
      const validation = this.renderService.validateTemplate(dto.content);
      if (!validation.valid) {
        throw new Error(`Invalid variables: ${validation.invalidVariables.join(', ')}`);
      }

      // Обновляем переменные (теперь отдельное поле)
      const variables = this.renderService.extractVariables(dto.content);
      template.variables = variables;
    }

    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить Telegram шаблон' })
  @ApiResponse({ status: 200, description: 'Шаблон удален' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async remove(@Param('id') id: string) {
    const result = await this.templateRepo.delete(id);
    if (result.affected === 0) {
      throw new Error('Template not found');
    }
    return { success: true, message: 'Template deleted' };
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Переключить статус активности шаблона' })
  @ApiResponse({ status: 200, description: 'Статус изменен' })
  async toggleActive(@Param('id') id: string) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new Error('Template not found');
    }

    template.isActive = !template.isActive;
    return this.templateRepo.save(template);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Предпросмотр шаблона с тестовыми данными' })
  @ApiResponse({ status: 200, description: 'Рендеринг выполнен' })
  async preview(
    @Param('id') id: string,
    @Body() contextIds: { contactId?: string; leadId?: number; dealId?: string; companyId?: string },
  ) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new Error('Template not found');
    }

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
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new Error('Template not found');
    }

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
