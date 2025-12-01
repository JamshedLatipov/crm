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
  findAll(@Query('category') category?: string, @Query('active') active?: string, @Query('tree') tree?: string) {
    if (category) {
      return this.callScriptsService.findByCategory(category);
    }
    if (active === 'true' && tree === 'true') {
      // Return trees filtered by active flag (keeps nodes that are active or have active descendants)
      return this.callScriptsService.findTreesFiltered(true);
    }
    if (active === 'true') {
      return this.callScriptsService.findActive();
    }
    if (tree === 'true') {
      return this.callScriptsService.findTreesFiltered(false);
    }
    return this.callScriptsService.findAll();
  }

  @Get('roots')
  findRoots() {
    return this.callScriptsService.findRoots();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('children') children?: string) {
    if (children === 'true') {
      return this.callScriptsService.findOneWithChildren(id);
    }
    return this.callScriptsService.findOne(id);
  }

  @Get(':id/descendants')
  findDescendants(@Param('id') id: string) {
    return this.callScriptsService.findOne(id).then(script => {
      if (!script) return null;
      return this.callScriptsService.findDescendants(script);
    });
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