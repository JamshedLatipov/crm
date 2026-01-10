import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CallScriptsService, CreateCallScriptDto, UpdateCallScriptDto, CreateCategoryDto, UpdateCategoryDto } from './call-scripts.service';
import { TELEPHONY_PATTERNS } from '@crm/contracts';

@Controller('call-scripts')
export class CallScriptsController {
  constructor(private readonly service: CallScriptsService) {}

  // Scripts
  @Get()
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_GET_ALL)
  async findAllScripts(
    @Query('activeOnly') activeOnly?: string,
    @Query('categoryId') categoryId?: string
  ) {
    return this.service.findAllScripts(activeOnly === 'true', categoryId);
  }

  @Get('trees')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_GET_TREES)
  async findScriptTrees() {
    return this.service.findScriptTrees();
  }

  @Get('search')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_SEARCH)
  async searchScripts(
    @Query('q') query: string,
    @Query('activeOnly') activeOnly?: string
  ) {
    return this.service.searchScripts(query, activeOnly === 'true');
  }

  @Get(':id')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_GET_ONE)
  async findScript(@Param('id') id: string) {
    return this.service.findScript(id);
  }

  @Post()
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_CREATE)
  async createScript(@Body() dto: CreateCallScriptDto) {
    return this.service.createScript(dto);
  }

  @Put(':id')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_UPDATE)
  async updateScript(@Param('id') id: string, @Body() dto: UpdateCallScriptDto) {
    return this.service.updateScript(id, dto);
  }

  @Delete(':id')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_DELETE)
  async deleteScript(@Param('id') id: string) {
    return this.service.deleteScript(id);
  }

  @Post(':id/toggle')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_TOGGLE)
  async toggleScript(@Param('id') id: string) {
    return this.service.toggleScript(id);
  }

  @Post('reorder')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_REORDER)
  async reorderScripts(@Body() body: { orderedIds: string[] }) {
    return this.service.reorderScripts(body.orderedIds);
  }

  // Categories
  @Get('categories/all')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_CATEGORY_GET_ALL)
  async findAllCategories() {
    return this.service.findAllCategories();
  }

  @Get('categories/:id')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_CATEGORY_GET_ONE)
  async findCategory(@Param('id') id: string) {
    return this.service.findCategory(id);
  }

  @Post('categories')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_CATEGORY_CREATE)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Put('categories/:id')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_CATEGORY_UPDATE)
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @MessagePattern(TELEPHONY_PATTERNS.SCRIPT_CATEGORY_DELETE)
  async deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }
}
