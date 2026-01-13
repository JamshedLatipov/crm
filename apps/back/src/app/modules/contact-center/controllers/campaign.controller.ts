import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CampaignService } from '../services/campaign.service';
import { CreateCampaignDto } from '../dto/campaign/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/campaign/update-campaign.dto';
import { CampaignFiltersDto } from '../dto/campaign/campaign-filters.dto';
import { UploadContactsDto } from '../dto/campaign/upload-contacts.dto';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../user/current-user.decorator';

interface UploadedFileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Controller('contact-center/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  create(
    @Body() createDto: CreateCampaignDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.campaignService.create(createDto, +user.sub);
  }

  @Get()
  findAll(@Query() filters: CampaignFiltersDto) {
    return this.campaignService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCampaignDto
  ) {
    return this.campaignService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.remove(id);
  }

  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.start(id);
  }

  @Post(':id/stop')
  stop(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.stop(id);
  }

  @Post(':id/pause')
  pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.pause(id);
  }

  @Post(':id/resume')
  resume(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.resume(id);
  }

  @Post(':id/contacts')
  @UseInterceptors(FileInterceptor('file'))
  uploadContacts(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileType
  ) {
    return this.campaignService.uploadCsvFile(id, file);
  }

  @Post(':id/contacts/from-segment/:segmentId')
  loadContactsFromSegment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('segmentId', ParseUUIDPipe) segmentId: string
  ) {
    return this.campaignService.loadContactsFromSegment(id, segmentId);
  }

  @Post(':id/contacts/from-system')
  loadAllContacts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('search') search?: string,
    @Query('companyId') companyId?: number
  ) {
    return this.campaignService.loadAllContacts(id, { search, companyId });
  }

  @Get(':id/contacts')
  getContacts(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.getContacts(id);
  }

  @Get(':id/statistics')
  getStatistics(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.getStatistics(id);
  }
}
