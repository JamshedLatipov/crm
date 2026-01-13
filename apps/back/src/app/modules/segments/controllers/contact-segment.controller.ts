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
import { ContactSegmentService } from '../services/contact-segment.service';
import {
  CreateContactSegmentDto,
  UpdateContactSegmentDto,
  SegmentQueryDto,
} from '../dto/contact-segment.dto';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../user/current-user.decorator';
import { SegmentFilter } from '../entities/contact-segment.entity';

@Controller('segments')
@UseGuards(JwtAuthGuard)
export class ContactSegmentController {
  constructor(
    private readonly segmentService: ContactSegmentService
  ) {}

  /**
   * Создание нового сегмента
   */
  @Post()
  async create(
    @Body() createDto: CreateContactSegmentDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.segmentService.create(createDto, parseInt(user.sub));
  }

  /**
   * Получение списка сегментов с фильтрацией
   */
  @Get()
  async findAll(@Query() queryDto: SegmentQueryDto) {
    return this.segmentService.findAll(queryDto);
  }

  /**
   * Получение сегмента по ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.segmentService.findOne(id);
  }

  /**
   * Обновление сегмента
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateContactSegmentDto
  ) {
    return this.segmentService.update(id, updateDto);
  }

  /**
   * Удаление сегмента
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.segmentService.remove(id);
    return { message: 'Segment deleted successfully' };
  }

  /**
   * Дублирование сегмента
   */
  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.segmentService.duplicate(id, parseInt(user.sub));
  }

  /**
   * Получение контактов сегмента
   */
  @Get(':id/contacts')
  async getSegmentContacts(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.segmentService.getSegmentContacts(id, { page, limit });
  }

  /**
   * Получение номеров телефонов из сегмента
   */
  @Get(':id/phone-numbers')
  async getSegmentPhoneNumbers(@Param('id') id: string) {
    return this.segmentService.getSegmentPhoneNumbers(id);
  }

  /**
   * Получение email адресов из сегмента
   */
  @Get(':id/emails')
  async getSegmentEmails(@Param('id') id: string) {
    return this.segmentService.getSegmentEmails(id);
  }

  /**
   * Пересчёт количества контактов в сегменте
   */
  @Post(':id/recalculate')
  async recalculateSegment(@Param('id') id: string) {
    const count = await this.segmentService.recalculateSegment(id);
    return { 
      message: 'Segment recalculated successfully',
      contactsCount: count 
    };
  }

  /**
   * Предпросмотр сегмента без сохранения
   */
  @Post('preview')
  async previewSegment(
    @Body() body: {
      filters: SegmentFilter[];
      filterLogic?: 'AND' | 'OR';
      limit?: number;
    }
  ) {
    return this.segmentService.previewSegment(
      body.filters,
      body.filterLogic || 'AND',
      body.limit || 10
    );
  }

  /**
   * Пересчёт всех динамических сегментов
   */
  @Post('recalculate-all-dynamic')
  async recalculateAllDynamic() {
    await this.segmentService.recalculateAllDynamic();
    return { message: 'All dynamic segments recalculated successfully' };
  }

  /**
   * Получение всех контактов с телефонами
   */
  @Get('all/phone-numbers')
  async getAllPhoneNumbers() {
    return this.segmentService.getAllPhoneNumbers();
  }
}
