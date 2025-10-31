import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CallScriptCategoryService } from './call-script-category.service';
import { CreateCallScriptCategoryDto, UpdateCallScriptCategoryDto } from './dto/call-script-category.dto';

@Controller('call-script-categories')
export class CallScriptCategoryController {
  constructor(private readonly categoryService: CallScriptCategoryService) {}

  @Post()
  create(@Body() createDto: CreateCallScriptCategoryDto) {
    return this.categoryService.create(createDto);
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get('active')
  findActive() {
    return this.categoryService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateCallScriptCategoryDto) {
    return this.categoryService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}