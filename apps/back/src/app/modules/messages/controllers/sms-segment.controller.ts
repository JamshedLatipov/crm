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
import { SmsSegmentService } from '../services/sms-segment.service';
import { CreateSegmentDto, UpdateSegmentDto } from '../dto/segment.dto';

@ApiTags('SMS Segments')
@ApiBearerAuth()
@Controller('sms/segments')
export class SmsSegmentController {
  constructor(private readonly segmentService: SmsSegmentService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый сегмент' })
  @ApiResponse({ status: 201, description: 'Сегмент успешно создан' })
  async create(@Body() createDto: CreateSegmentDto, @Req() req: any) {
    return this.segmentService.create(createDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех сегментов' })
  @ApiResponse({ status: 200, description: 'Список сегментов' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('isDynamic') isDynamic?: string,
    @Query('search') search?: string
  ) {
    return this.segmentService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      isActive: isActive ? isActive === 'true' : undefined,
      isDynamic: isDynamic ? isDynamic === 'true' : undefined,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить сегмент по ID' })
  @ApiResponse({ status: 200, description: 'Детали сегмента' })
  @ApiResponse({ status: 404, description: 'Сегмент не найден' })
  async findOne(@Param('id') id: string) {
    return this.segmentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить сегмент' })
  @ApiResponse({ status: 200, description: 'Сегмент успешно обновлён' })
  @ApiResponse({ status: 404, description: 'Сегмент не найден' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateSegmentDto) {
    return this.segmentService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить сегмент' })
  @ApiResponse({ status: 200, description: 'Сегмент успешно удалён' })
  @ApiResponse({ status: 404, description: 'Сегмент не найден' })
  async remove(@Param('id') id: string) {
    await this.segmentService.remove(id);
    return { message: 'Segment deleted successfully' };
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: 'Получить контакты сегмента' })
  @ApiResponse({ status: 200, description: 'Список контактов' })
  async getContacts(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.segmentService.getSegmentContacts(id, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id/phone-numbers')
  @ApiOperation({ summary: 'Получить номера телефонов сегмента' })
  @ApiResponse({ status: 200, description: 'Список номеров телефонов' })
  async getPhoneNumbers(@Param('id') id: string) {
    return this.segmentService.getSegmentPhoneNumbers(id);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: 'Пересчитать количество контактов в сегменте' })
  @ApiResponse({ status: 200, description: 'Сегмент пересчитан' })
  async recalculate(@Param('id') id: string) {
    const count = await this.segmentService.recalculateSegment(id);
    return { message: 'Segment recalculated', contactsCount: count };
  }

  @Post('preview')
  @ApiOperation({ summary: 'Предпросмотр сегмента без сохранения' })
  @ApiResponse({ status: 200, description: 'Предпросмотр контактов' })
  async preview(@Body() createDto: CreateSegmentDto) {
    return this.segmentService.previewSegment(
      createDto.filters,
      createDto.filterLogic || 'AND',
      10
    );
  }
}
