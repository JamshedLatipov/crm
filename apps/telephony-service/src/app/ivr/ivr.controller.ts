import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { IvrService, CreateIvrNodeDto, UpdateIvrNodeDto } from './ivr.service';
import { TELEPHONY_PATTERNS } from '@crm/contracts';

@Controller('ivr')
export class IvrController {
  constructor(private readonly ivrService: IvrService) {}

  @Get()
  @MessagePattern(TELEPHONY_PATTERNS.IVR_GET_TREE)
  async getTree() {
    return this.ivrService.getFullTree();
  }

  @Get('roots')
  @MessagePattern(TELEPHONY_PATTERNS.IVR_GET_ROOTS)
  async getRoots() {
    return this.ivrService.findRootTree();
  }

  @Get(':id')
  @MessagePattern(TELEPHONY_PATTERNS.IVR_GET_NODE)
  async getNode(@Param('id') id: string) {
    return this.ivrService.findOne(id);
  }

  @Get(':id/children')
  @MessagePattern(TELEPHONY_PATTERNS.IVR_GET_CHILDREN)
  async getChildren(@Param('id') id: string) {
    return this.ivrService.findChildren(id);
  }

  @Get(':id/subtree')
  @MessagePattern(TELEPHONY_PATTERNS.IVR_GET_SUBTREE)
  async getSubtree(@Param('id') id: string) {
    return this.ivrService.getSubtree(id);
  }

  @Post()
  @MessagePattern(TELEPHONY_PATTERNS.IVR_CREATE_NODE)
  async create(@Body() dto: CreateIvrNodeDto) {
    return this.ivrService.create(dto);
  }

  @Put(':id')
  @MessagePattern(TELEPHONY_PATTERNS.IVR_UPDATE_NODE)
  async update(@Param('id') id: string, @Body() dto: UpdateIvrNodeDto) {
    return this.ivrService.update(id, dto);
  }

  @Delete(':id')
  @MessagePattern(TELEPHONY_PATTERNS.IVR_DELETE_NODE)
  async remove(@Param('id') id: string) {
    return this.ivrService.remove(id);
  }

  @Post(':id/reorder')
  @MessagePattern(TELEPHONY_PATTERNS.IVR_REORDER_NODE)
  async reorder(@Param('id') id: string, @Body() body: { newOrder: number }) {
    return this.ivrService.reorder(id, body.newOrder);
  }

  @Post(':id/move')
  @MessagePattern(TELEPHONY_PATTERNS.IVR_MOVE_NODE)
  async move(@Param('id') id: string, @Body() body: { newParentId: string | null }) {
    return this.ivrService.moveNode(id, body.newParentId);
  }

  @Post(':id/duplicate')
  @MessagePattern(TELEPHONY_PATTERNS.IVR_DUPLICATE_NODE)
  async duplicate(@Param('id') id: string) {
    return this.ivrService.duplicateNode(id);
  }
}
