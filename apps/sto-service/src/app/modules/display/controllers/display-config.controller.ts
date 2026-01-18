import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { DisplayConfigService } from '../services/display-config.service';
import {
  CreateDisplayConfigDto,
  UpdateDisplayConfigDto,
} from '@libs/shared/sto-types';

@Controller('admin/sto/display-configs')
export class DisplayConfigController {
  constructor(private readonly displayConfigService: DisplayConfigService) {}

  @Post()
  create(@Body() createDto: CreateDisplayConfigDto) {
    return this.displayConfigService.create(createDto);
  }

  @Get()
  findAll() {
    return this.displayConfigService.findAll();
  }

  @Get('active')
  findActive() {
    return this.displayConfigService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.displayConfigService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateDisplayConfigDto) {
    return this.displayConfigService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.displayConfigService.remove(id);
    return { message: 'Display config deleted successfully' };
  }
}
