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

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(
    @Inject(SERVICES.TASK) private readonly taskClient: ClientProxy,
  ) {}

  @Get()
  async findAll(@Query() filter: TaskFilterDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.GET_TASKS, filter).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.GET_TASK, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Post()
  async create(@Body() dto: CreateTaskDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.CREATE_TASK, dto).pipe(timeout(5000)),
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.UPDATE_TASK, { id: parseInt(id), dto }).pipe(timeout(5000)),
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.DELETE_TASK, { id: parseInt(id) }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/assign')
  async assign(@Param('id') id: string, @Body() dto: AssignTaskDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.ASSIGN_TASK, { 
        id: parseInt(id), 
        assigneeId: dto.assigneeId 
      }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string, @Body() dto: CompleteTaskDto) {
    return firstValueFrom(
      this.taskClient.send(TASK_PATTERNS.COMPLETE_TASK, { 
        id: parseInt(id), 
        dto 
      }).pipe(timeout(5000)),
    );
  }
}
