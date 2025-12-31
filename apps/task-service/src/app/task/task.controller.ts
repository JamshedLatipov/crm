import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TaskService } from './task.service';
import {
  TASK_PATTERNS,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilterDto,
  AssignTaskDto,
  CompleteTaskDto,
} from '@crm/contracts';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  // ============ HTTP Endpoints ============

  @Get()
  findAll(@Query() filter: TaskFilterDto) {
    return this.taskService.findAll(filter);
  }

  @Get('stats')
  getStats() {
    return this.taskService.getStats();
  }

  @Get('types')
  getTaskTypes() {
    return this.taskService.getTaskTypes();
  }

  @Get('overdue')
  getOverdue() {
    return this.taskService.getOverdue();
  }

  @Get('assignee/:assigneeId')
  getByAssignee(@Param('assigneeId', ParseIntPipe) assigneeId: number) {
    return this.taskService.getByAssignee(assigneeId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.taskService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.taskService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.remove(id);
  }

  @Patch(':id/assign')
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTaskDto) {
    return this.taskService.assign(id, dto.assigneeId);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number, @Body() dto: CompleteTaskDto) {
    return this.taskService.complete(id, dto);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(TASK_PATTERNS.GET_TASKS)
  handleGetTasks(@Payload() filter: TaskFilterDto) {
    return this.taskService.findAll(filter);
  }

  @MessagePattern(TASK_PATTERNS.GET_TASK)
  handleGetTask(@Payload() data: { id: number }) {
    return this.taskService.findOne(data.id);
  }

  @MessagePattern(TASK_PATTERNS.CREATE_TASK)
  handleCreate(@Payload() dto: CreateTaskDto) {
    return this.taskService.create(dto);
  }

  @MessagePattern(TASK_PATTERNS.UPDATE_TASK)
  handleUpdate(@Payload() data: { id: number; dto: UpdateTaskDto }) {
    return this.taskService.update(data.id, data.dto);
  }

  @MessagePattern(TASK_PATTERNS.DELETE_TASK)
  handleDelete(@Payload() data: { id: number }) {
    return this.taskService.remove(data.id);
  }

  @MessagePattern(TASK_PATTERNS.ASSIGN_TASK)
  handleAssign(@Payload() data: { id: number; assigneeId: number; assignedBy?: number }) {
    return this.taskService.assign(data.id, data.assigneeId, data.assignedBy);
  }

  @MessagePattern(TASK_PATTERNS.COMPLETE_TASK)
  handleComplete(@Payload() data: { id: number; dto: CompleteTaskDto; completedBy?: number }) {
    return this.taskService.complete(data.id, data.dto, data.completedBy);
  }

  @MessagePattern(TASK_PATTERNS.HEALTH_CHECK)
  handleHealthCheck() {
    return { status: 'ok', service: 'task-service' };
  }
}
