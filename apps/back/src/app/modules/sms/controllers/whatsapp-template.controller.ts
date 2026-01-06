import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { CreateWhatsAppTemplateDto, UpdateWhatsAppTemplateDto } from '../dto/whatsapp-template.dto';
import { TemplateRenderService } from '../services/template-render.service';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';

@ApiTags('WhatsApp Templates')
@Controller('notifications/whatsapp-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WhatsAppTemplateController {
  constructor(
    @InjectRepository(WhatsAppTemplate)
    private readonly templateRepo: Repository<WhatsAppTemplate>,
    private readonly renderService: TemplateRenderService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Получить все WhatsApp шаблоны' })
  @ApiResponse({ status: 200, description: 'Список шаблонов' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('isActive') isActive?: boolean,
  ) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.templateRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      hasMore: total > page * limit,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить WhatsApp шаблон по ID' })
  @ApiResponse({ status: 200, description: 'Шаблон найден' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async findOne(@Param('id') id: string) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый WhatsApp шаблон' })
  @ApiResponse({ status: 201, description: 'Шаблон создан' })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async create(@Body() dto: CreateWhatsAppTemplateDto) {
    // Валидация шаблона
    const validation = this.renderService.validateTemplate(dto.content);
    if (!validation.valid) {
      throw new Error(`Invalid variables: ${validation.invalidVariables.join(', ')}`);
    }

    // Извлекаем переменные для метаданных
    const variables = this.renderService.extractVariables(dto.content);

    const template = this.templateRepo.create({
      ...dto,
      metadata: { variables },
    });

    return this.templateRepo.save(template);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить WhatsApp шаблон' })
  @ApiResponse({ status: 200, description: 'Шаблон обновлен' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async update(@Param('id') id: string, @Body() dto: UpdateWhatsAppTemplateDto) {
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

      // Обновляем переменные в метаданных
      const variables = this.renderService.extractVariables(dto.content);
      template.metadata = { ...template.metadata, variables };
    }

    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить WhatsApp шаблон' })
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
}
