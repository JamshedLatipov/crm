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
import { TemplateService, CreateTemplateDto, UpdateTemplateDto } from './template.service';
import { TemplateType } from '../campaign/entities/template.entity';

@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  findAll(@Query('type') type?: TemplateType) {
    return this.templateService.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.delete(id);
  }

  @Post(':id/preview')
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Record<string, string>,
  ) {
    return this.templateService.preview(id, data);
  }

  @Post(':id/duplicate')
  duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string },
  ) {
    return this.templateService.duplicate(id, body.name);
  }
}
