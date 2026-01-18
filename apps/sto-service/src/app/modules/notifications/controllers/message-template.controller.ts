import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoMessageTemplate } from '@libs/shared/sto-types';
import { TemplateRendererService } from '../services/template-renderer.service';

@Controller('admin/sto/message-templates')
export class MessageTemplateController {
  constructor(
    @InjectRepository(StoMessageTemplate)
    private templateRepository: Repository<StoMessageTemplate>,
    private templateRenderer: TemplateRendererService,
  ) {}

  @Post()
  create(@Body() createDto: Partial<StoMessageTemplate>) {
    const template = this.templateRepository.create(createDto);
    return this.templateRepository.save(template);
  }

  @Get()
  findAll() {
    return this.templateRepository.find({ order: { name: 'ASC' } });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templateRepository.findOne({ where: { id } });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: Partial<StoMessageTemplate>) {
    await this.templateRepository.update(id, updateDto);
    return this.templateRepository.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.templateRepository.delete(id);
    return { message: 'Message template deleted successfully' };
  }

  @Post(':id/preview')
  async preview(
    @Param('id') id: string,
    @Body() testData: any,
  ) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new Error('Template not found');
    }

    const rendered = this.templateRenderer.render(template.body, testData);
    return { rendered };
  }
}
