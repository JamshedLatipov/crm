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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  EmailTemplateService,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from '../services/email-template.service';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';

export class RenderTemplateDto {
  variables: Record<string, any>;
}

export class ValidateTemplateDto {
  htmlContent: string;
}

@ApiTags('Email Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages/email/templates')
export class EmailTemplateController {
  constructor(
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать шаблон email' })
  @ApiResponse({ status: 201, description: 'Шаблон создан' })
  async create(@Body() dto: CreateEmailTemplateDto, @Request() req) {
    return this.emailTemplateService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все шаблоны email' })
  @ApiResponse({ status: 200, description: 'Список шаблонов' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.emailTemplateService.findAll(
      Number(page),
      Number(limit),
      category,
      isActive
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить шаблон email по ID' })
  @ApiResponse({ status: 200, description: 'Шаблон найден' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async findOne(@Param('id') id: string) {
    return this.emailTemplateService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить шаблон email' })
  @ApiResponse({ status: 200, description: 'Шаблон обновлён' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplateService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить шаблон email (мягкое удаление)' })
  @ApiResponse({ status: 200, description: 'Шаблон удалён' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async delete(@Param('id') id: string) {
    await this.emailTemplateService.delete(id);
    return { message: 'Template deleted successfully' };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Дублировать шаблон email' })
  @ApiResponse({ status: 201, description: 'Шаблон дублирован' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async duplicate(@Param('id') id: string, @Request() req) {
    return this.emailTemplateService.duplicate(id, req.user.id);
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Рендеринг шаблона с переменными (предпросмотр)' })
  @ApiResponse({ status: 200, description: 'Шаблон отрендерен' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async render(
    @Param('id') id: string,
    @Body() dto: RenderTemplateDto,
  ) {
    const template = await this.emailTemplateService.findOne(id);
    return this.emailTemplateService.renderTemplate(template, dto.variables);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Валидация HTML шаблона' })
  @ApiResponse({ status: 200, description: 'Результат валидации' })
  async validate(@Body() dto: ValidateTemplateDto) {
    return this.emailTemplateService.validateTemplate(dto.htmlContent);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Получить статистику по шаблону' })
  @ApiResponse({ status: 200, description: 'Статистика шаблона' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async getStatistics(@Param('id') id: string) {
    return this.emailTemplateService.getStatistics(id);
  }
}
