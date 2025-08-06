import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PsDomainAliasService } from '../services/ps-domain-alias.service';

@Controller('ps-domain-aliases')
export class PsDomainAliasController {
  constructor(private readonly service: PsDomainAliasService) {}

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
