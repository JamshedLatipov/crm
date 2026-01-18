import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { QrCodeService } from '../services/qr-code.service';
import { StoOrderZone } from '@libs/shared/sto-types';

@Controller('admin/sto/qr-codes')
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Post()
  async generate(
    @Body() body: {
      zone: StoOrderZone;
      displayId?: string;
      ttlHours?: number;
      createdBy: string;
    },
  ) {
    return this.qrCodeService.generate(
      body.zone,
      body.displayId || null,
      body.ttlHours || 24,
      body.createdBy,
    );
  }

  @Get()
  findAll() {
    return this.qrCodeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.qrCodeService.findOne(id);
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string) {
    await this.qrCodeService.deactivate(id);
    return { message: 'QR code deactivated successfully' };
  }
}
