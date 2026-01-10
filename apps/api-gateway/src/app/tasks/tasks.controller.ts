import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  SERVICES,
  TASK_PATTERNS,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilterDto,
  AssignTaskDto,
  CompleteTaskDto,
} from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('tasks')
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(
    @Inject(SERVICES.TASK) private readonly taskClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks', description: 'Retrieve tasks with optional filtering' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async findAll(@Query() filter: TaskFilterDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.GET_TASKS, filter).pipe(timeout(5000)),
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics', description: 'Get aggregate statistics about tasks' })
  @ApiResponse({ status: 200, description: 'Task statistics' })
  async getStats() {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.GET_STATS, {}).pipe(timeout(5000)),
    );
  }

  @Get('types')
  @ApiOperation({ summary: 'Get task types', description: 'Get all available task types' })
  @ApiResponse({ status: 200, description: 'List of task types' })
  async getTypes() {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.GET_TYPES, {}).pipe(timeout(5000)),
    );
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue tasks', description: 'Get all tasks that are past their due date' })
  @ApiResponse({ status: 200, description: 'List of overdue tasks' })
  async getOverdue() {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.GET_OVERDUE, {}).pipe(timeout(5000)),
    );
  }

  @Get('assignee/:assigneeId')
  @ApiOperation({ summary: 'Get tasks by assignee', description: 'Get all tasks assigned to a specific user' })
  @ApiParam({ name: 'assigneeId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of tasks for assignee' })
  async getByAssignee(@Param('assigneeId') assigneeId: string) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.GET_BY_ASSIGNEE, { assigneeId: parseInt(assigneeId) }).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID', description: 'Retrieve a specific task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task found' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.GET_TASK, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create task', description: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  async create(@Body() dto: CreateTaskDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.CREATE_TASK, dto).pipe(timeout(5000)),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task', description: 'Update an existing task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.UPDATE_TASK, { id: parseInt(id), dto }).pipe(timeout(5000)),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task', description: 'Delete a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 204, description: 'Task deleted' })
  async remove(@Param('id') id: string) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.DELETE_TASK, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign task', description: 'Assign task to a user' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task assigned' })
  async assign(@Param('id') id: string, @Body() dto: AssignTaskDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.ASSIGN_TASK, { 
        id: parseInt(id), 
        assigneeId: dto.assigneeId 
      }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete task', description: 'Mark task as completed' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task completed' })
  async complete(@Param('id') id: string, @Body() dto: CompleteTaskDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.COMPLETE_TASK, { 
        id: parseInt(id), 
        dto 
      }).pipe(timeout(5000)),
    );
  }

  // ========== Task Types Management Endpoints ==========

  @Get('types/all')
  @ApiOperation({ summary: 'Get all task types including inactive' })
  async getAllTypes() {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.TYPE_GET_ALL, {}).pipe(timeout(5000)),
    );
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Get task type by ID' })
  async getType(@Param('id') id: string) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.TYPE_GET_ONE, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Post('types')
  @ApiOperation({ summary: 'Create task type' })
  async createType(@Body() dto: any) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.TYPE_CREATE, dto).pipe(timeout(5000)),
    );
  }

  @Patch('types/:id')
  @ApiOperation({ summary: 'Update task type' })
  async updateType(@Param('id') id: string, @Body() dto: any) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.TYPE_UPDATE, { id: parseInt(id), dto }).pipe(timeout(5000)),
    );
  }

  @Delete('types/:id')
  @ApiOperation({ summary: 'Delete task type' })
  async deleteType(@Param('id') id: string) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.TYPE_DELETE, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Patch('types/:id/toggle')
  @ApiOperation({ summary: 'Toggle task type active status' })
  async toggleType(@Param('id') id: string) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.TYPE_TOGGLE, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Patch('types/reorder')
  @ApiOperation({ summary: 'Reorder task types' })
  async reorderTypes(@Body() dto: { orderedIds: number[] }) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.TYPE_REORDER, dto).pipe(timeout(5000)),
    );
  }

  @Post('types/:id/calculate-due-date')
  @ApiOperation({ summary: 'Calculate due date for task type' })
  async calculateDueDate(@Param('id') id: string, @Body() dto: { startDate?: string }) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.TYPE_CALCULATE_DUE, { id: parseInt(id), startDate: dto.startDate }).pipe(timeout(5000)),
    );
  }
}
