import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PsEndpointService } from '../services/ps-endpoint.service';

@Controller('ps-endpoints')
export class PsEndpointController {
  constructor(private readonly service: PsEndpointService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
