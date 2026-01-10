import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TASK_PATTERNS } from '@crm/contracts';
import { TaskTypeService } from './task-type.service';

@ApiTags('Task Types')
@Controller('task-types')
export class TaskTypeController {
  constructor(private readonly typeService: TaskTypeService) {}

  // ========== HTTP Endpoints ==========

  @Get()
  @ApiOperation({ summary: 'Get all task types' })
  getTypes() {
    return this.typeService.getTypes();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active task types' })
  getActiveTypes() {
    return this.typeService.getActiveTypes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task type by ID' })
  getType(@Param('id', ParseIntPipe) id: number) {
    return this.typeService.getType(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create task type' })
  createType(@Body() dto: any) {
    return this.typeService.createType(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task type' })
  updateType(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.typeService.updateType(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task type' })
  deleteType(@Param('id', ParseIntPipe) id: number) {
    return this.typeService.deleteType(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle task type active status' })
  toggleType(@Param('id', ParseIntPipe) id: number) {
    return this.typeService.toggleType(id);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder task types' })
  reorder(@Body() dto: { orderedIds: number[] }) {
    return this.typeService.reorder(dto.orderedIds);
  }

  @Post(':id/calculate-due-date')
  @ApiOperation({ summary: 'Calculate due date based on type settings' })
  calculateDueDate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { startDate?: string },
  ) {
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    return this.typeService.calculateDueDate(id, startDate);
  }

  @Get('defaults')
  @ApiOperation({ summary: 'Get default task types' })
  getDefaultTypes() {
    return this.typeService.getDefaultTypes();
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed default task types' })
  seedDefaultTypes() {
    return this.typeService.seedDefaultTypes();
  }

  // ========== RabbitMQ MessagePattern Handlers ==========

  @MessagePattern(TASK_PATTERNS.TYPE_GET_ALL)
  handleGetTypes() {
    return this.typeService.getTypes();
  }

  @MessagePattern(TASK_PATTERNS.TYPE_GET_ONE)
  handleGetType(@Payload() data: { id: number }) {
    return this.typeService.getType(data.id);
  }

  @MessagePattern(TASK_PATTERNS.TYPE_GET_ACTIVE)
  handleGetActiveTypes() {
    return this.typeService.getActiveTypes();
  }

  @MessagePattern(TASK_PATTERNS.TYPE_CREATE)
  handleCreateType(@Payload() dto: any) {
    return this.typeService.createType(dto);
  }

  @MessagePattern(TASK_PATTERNS.TYPE_UPDATE)
  handleUpdateType(@Payload() data: { id: number; dto: any }) {
    return this.typeService.updateType(data.id, data.dto);
  }

  @MessagePattern(TASK_PATTERNS.TYPE_DELETE)
  handleDeleteType(@Payload() data: { id: number }) {
    return this.typeService.deleteType(data.id);
  }

  @MessagePattern(TASK_PATTERNS.TYPE_TOGGLE)
  handleToggleType(@Payload() data: { id: number }) {
    return this.typeService.toggleType(data.id);
  }

  @MessagePattern(TASK_PATTERNS.TYPE_REORDER)
  handleReorder(@Payload() data: { orderedIds: number[] }) {
    return this.typeService.reorder(data.orderedIds);
  }

  @MessagePattern(TASK_PATTERNS.TYPE_CALCULATE_DUE)
  handleCalculateDueDate(@Payload() data: { id: number; startDate?: string }) {
    const startDate = data.startDate ? new Date(data.startDate) : undefined;
    return this.typeService.calculateDueDate(data.id, startDate);
  }
}
