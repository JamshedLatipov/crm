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
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import { CampaignSegmentService } from '../services/campaign-segment.service';
import {
  CreateCampaignSegmentDto,
  UpdateCampaignSegmentDto,
  CampaignSegmentFiltersDto,
} from '../dto/campaign/campaign-segment.dto';

@Controller('contact-center/campaign-segments')
@UseGuards(JwtAuthGuard)
export class CampaignSegmentController {
  constructor(
    private readonly campaignSegmentService: CampaignSegmentService,
  ) {}

  @Post()
  async create(
    @Body() createDto: CreateCampaignSegmentDto,
    @Req() req: any,
  ) {
    return this.campaignSegmentService.create(createDto, req.user.id);
  }

  @Get()
  async findAll(@Query() filters: CampaignSegmentFiltersDto) {
    return this.campaignSegmentService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.campaignSegmentService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCampaignSegmentDto,
  ) {
    return this.campaignSegmentService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.campaignSegmentService.remove(id);
    return { message: 'Segment deleted successfully' };
  }

  @Get(':id/contacts')
  async getSegmentContacts(@Param('id') id: string) {
    return this.campaignSegmentService.getSegmentContacts(id);
  }

  @Get(':id/phone-numbers')
  async getSegmentPhoneNumbers(@Param('id') id: string) {
    return this.campaignSegmentService.getSegmentPhoneNumbers(id);
  }

  @Post(':id/recalculate')
  async recalculateSegment(@Param('id') id: string) {
    const count = await this.campaignSegmentService.recalculateSegment(id);
    return { count };
  }
}
