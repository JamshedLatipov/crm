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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SmsTemplateService } from '../services/sms-template.service';
import { SmsProviderService } from '../services/sms-provider.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TestTemplateDto,
} from '../dto/template.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('SMS Templates')
@ApiBearerAuth()
@Controller('sms/templates')
export class SmsTemplateController {
  constructor(
    private readonly templateService: SmsTemplateService,
    private readonly providerService: SmsProviderService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый шаблон СМС' })
  @ApiResponse({ status: 201, description: 'Шаблон успешно создан' })
  async create(@Body() createDto: CreateTemplateDto, @Req() req: any) {
    return this.templateService.create(createDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех шаблонов' })
  @ApiResponse({ status: 200, description: 'Список шаблонов с пагинацией' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string
  ) {
    const paginationDto: PaginationDto = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    };

    return this.templateService.findAll(paginationDto, {
      category,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('popular')
  @ApiOperation({ summary: 'Получить популярные шаблоны' })
  @ApiResponse({ status: 200, description: 'Список популярных шаблонов' })
  async getPopular(@Query('limit') limit?: string) {
    return this.templateService.getPopular(limit ? parseInt(limit) : 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить шаблон по ID' })
  @ApiResponse({ status: 200, description: 'Детали шаблона' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить шаблон' })
  @ApiResponse({ status: 200, description: 'Шаблон успешно обновлён' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateTemplateDto) {
    return this.templateService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить шаблон' })
  @ApiResponse({ status: 200, description: 'Шаблон успешно удалён' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async remove(@Param('id') id: string) {
    await this.templateService.remove(id);
    return { message: 'Template deleted successfully' };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Дублировать шаблон' })
  @ApiResponse({ status: 201, description: 'Шаблон успешно скопирован' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  async duplicate(@Param('id') id: string, @Req() req: any) {
    return this.templateService.duplicate(id, req.user);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Валидировать шаблон с переменными' })
  @ApiResponse({ status: 200, description: 'Результат валидации' })
  async validate(
    @Param('id') id: string,
    @Body('variables') variables: Record<string, any>
  ) {
    return this.templateService.validateTemplate(id, variables);
  }

  @Post('test')
  @ApiOperation({ summary: 'Отправить тестовое СМС' })
  @ApiResponse({ status: 200, description: 'СМС успешно отправлено' })
  async test(@Body() testDto: TestTemplateDto) {
    const template = await this.templateService.findOne(testDto.templateId);
    const content = this.templateService.renderTemplate(template, testDto.variables || {});
    
    const result = await this.providerService.sendSms(testDto.phoneNumber, content);
    
    return {
      success: result.success,
      message: result.success ? 'Test SMS sent successfully' : 'Failed to send test SMS',
      details: result,
    };
  }
}
