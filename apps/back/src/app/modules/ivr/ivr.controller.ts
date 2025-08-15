import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IvrService, CreateIvrNodeDto, UpdateIvrNodeDto } from './ivr.service';

@Controller('ivr')
export class IvrController {
  constructor(private readonly svc: IvrService) {}

  @Post('nodes')
  create(@Body() dto: CreateIvrNodeDto) { return this.svc.create(dto); }

  @Get('nodes/root')
  roots() { return this.svc.findRootTree(); }

  @Get('nodes/:id')
  node(@Param('id') id: string) { return this.svc.getSubtree(id); }

  @Get('nodes/:id/children')
  children(@Param('id') id: string) { return this.svc.findChildren(id); }

  @Put('nodes/:id')
  update(@Param('id') id: string, @Body() dto: UpdateIvrNodeDto) { return this.svc.update(id, dto); }

  @Delete('nodes/:id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
