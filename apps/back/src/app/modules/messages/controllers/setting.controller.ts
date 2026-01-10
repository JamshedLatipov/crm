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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingService } from '../services/setting.service';
import { SettingCategory } from '../entities/setting.entity';
import {
  CreateSettingDto,
  UpdateSettingDto,
  BulkUpdateSettingDto,
  TestSettingDto,
} from '../dto/setting.dto';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages/settings')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все настройки' })
  @ApiResponse({ status: 200, description: 'Список всех настроек' })
  async findAll() {
    return this.settingService.findAll();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Получить настройки по категории' })
  @ApiResponse({ status: 200, description: 'Настройки категории' })
  async findByCategory(@Param('category') category: SettingCategory) {
    return this.settingService.findByCategory(category);
  }

  @Public()
  @Get('key/:key')
  @ApiOperation({ summary: 'Получить настройку по ключу' })
  @ApiResponse({ status: 200, description: 'Настройка найдена' })
  @ApiResponse({ status: 404, description: 'Настройка не найдена' })
  async findByKey(@Param('key') key: string) {
    return this.settingService.findByKey(key);
  }

  @Post()
  @ApiOperation({ summary: 'Создать новую настройку' })
  @ApiResponse({ status: 201, description: 'Настройка создана' })
  async create(@Body() dto: CreateSettingDto) {
    return this.settingService.create(dto);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Массовое обновление настроек' })
  @ApiResponse({ status: 200, description: 'Настройки обновлены' })
  async bulkUpdate(@Body() updates: BulkUpdateSettingDto[]) {
    return this.settingService.bulkUpdate(updates);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Обновить настройку' })
  @ApiResponse({ status: 200, description: 'Настройка обновлена' })
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingService.update(key, dto);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Удалить настройку' })
  @ApiResponse({ status: 200, description: 'Настройка удалена' })
  async delete(@Param('key') key: string) {
    await this.settingService.delete(key);
    return { message: 'Setting deleted successfully' };
  }

  @Public()
  @Post('initialize-defaults')
  @ApiOperation({ summary: 'Инициализировать настройки по умолчанию из .env' })
  @ApiResponse({ status: 200, description: 'Настройки инициализированы' })
  async initializeDefaults() {
    await this.settingService.initializeDefaults();
    return { message: 'Default settings initialized' };
  }

  @Post('test')
  @ApiOperation({ summary: 'Тестировать настройки канала' })
  @ApiResponse({ status: 200, description: 'Тест выполнен успешно' })
  @ApiResponse({ status: 400, description: 'Ошибка тестирования' })
  async test(@Body() dto: TestSettingDto) {
    // TODO: Implement testing logic for each channel
    return {
      success: true,
      message: `Test message sent via ${dto.category}`,
      recipient: dto.recipient,
    };
  }
}
