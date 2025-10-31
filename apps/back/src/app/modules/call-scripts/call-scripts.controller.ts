import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CallScriptsService } from './call-scripts.service';
import { CreateCallScriptDto, UpdateCallScriptDto } from './call-script.dto';

@Controller('call-scripts')
export class CallScriptsController {
  constructor(private readonly callScriptsService: CallScriptsService) {}

  @Post()
  create(@Body() createCallScriptDto: CreateCallScriptDto) {
    return this.callScriptsService.create(createCallScriptDto);
  }

  @Get()
  findAll(@Query('category') category?: string, @Query('active') active?: string) {
    if (category) {
      return this.callScriptsService.findByCategory(category);
    }
    if (active === 'true') {
      return this.callScriptsService.findActive();
    }
    return this.callScriptsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.callScriptsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCallScriptDto: UpdateCallScriptDto) {
    return this.callScriptsService.update(id, updateCallScriptDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.callScriptsService.remove(id);
  }
}