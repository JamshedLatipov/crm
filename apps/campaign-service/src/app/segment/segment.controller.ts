import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  SegmentService,
  CreateSegmentDto,
  UpdateSegmentDto,
  SegmentFilterOptions,
} from './segment.service';
import { CAMPAIGN_PATTERNS } from '@crm/contracts';

@Controller('segments')
export class SegmentController {
  constructor(private readonly segmentService: SegmentService) {}

  // HTTP Endpoints
  @Get()
  findAll(
    @Query('isActive') isActive?: string,
    @Query('isDynamic') isDynamic?: string,
    @Query('search') search?: string,
  ) {
    const options: SegmentFilterOptions = {
      isActive: isActive ? isActive === 'true' : undefined,
      isDynamic: isDynamic ? isDynamic === 'true' : undefined,
      search,
    };
    return this.segmentService.findAll(options);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.segmentService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSegmentDto) {
    return this.segmentService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSegmentDto) {
    return this.segmentService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.segmentService.delete(id);
  }

  @Get(':id/contacts')
  getContacts(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.segmentService.getSegmentContacts(id, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id/phone-numbers')
  getPhoneNumbers(@Param('id', ParseIntPipe) id: number) {
    return this.segmentService.getSegmentPhoneNumbers(id);
  }

  @Post(':id/recalculate')
  async recalculate(@Param('id', ParseIntPipe) id: number) {
    const count = await this.segmentService.recalculate(id);
    return { message: 'Segment recalculated', contactsCount: count };
  }

  @Post('preview')
  preview(@Body() dto: CreateSegmentDto) {
    return this.segmentService.previewSegment(
      dto.filters,
      dto.filterLogic || 'AND',
      10,
    );
  }

  // RabbitMQ Message Handlers
  @MessagePattern(CAMPAIGN_PATTERNS.SEGMENT_GET_ALL)
  handleGetAll(@Payload() options: SegmentFilterOptions) {
    return this.segmentService.findAll(options);
  }

  @MessagePattern(CAMPAIGN_PATTERNS.SEGMENT_GET_ONE)
  handleGetOne(@Payload() data: { id: number }) {
    return this.segmentService.findOne(data.id);
  }

  @MessagePattern(CAMPAIGN_PATTERNS.SEGMENT_CREATE)
  handleCreate(@Payload() dto: CreateSegmentDto) {
    return this.segmentService.create(dto);
  }

  @MessagePattern(CAMPAIGN_PATTERNS.SEGMENT_UPDATE)
  handleUpdate(@Payload() data: { id: number; dto: UpdateSegmentDto }) {
    return this.segmentService.update(data.id, data.dto);
  }

  @MessagePattern(CAMPAIGN_PATTERNS.SEGMENT_DELETE)
  handleDelete(@Payload() data: { id: number }) {
    return this.segmentService.delete(data.id);
  }

  @MessagePattern(CAMPAIGN_PATTERNS.SEGMENT_GET_CONTACTS)
  handleGetContacts(
    @Payload() data: { id: number; limit?: number; offset?: number },
  ) {
    return this.segmentService.getSegmentContacts(data.id, {
      limit: data.limit,
      offset: data.offset,
    });
  }

  @MessagePattern(CAMPAIGN_PATTERNS.SEGMENT_RECALCULATE)
  handleRecalculate(@Payload() data: { id: number }) {
    return this.segmentService.recalculate(data.id);
  }
}
