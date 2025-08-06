import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { TaskService } from './task.service';
import { Task } from './task.entity';
import { CreateTaskDto, UpdateTaskDto } from './task.dto';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { TaskComment } from './task-comment.entity';

@ApiTags('tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiBody({ type: CreateTaskDto })
  async create(@Body() data: CreateTaskDto): Promise<Task> {
    return this.taskService.create(data);
  }

  @Get()
  async findAll(): Promise<Task[]> {
    return this.taskService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Task | null> {
    return this.taskService.findById(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateTaskDto })
  async update(@Param('id') id: number, @Body() data: UpdateTaskDto): Promise<Task> {
    return this.taskService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.taskService.delete(id);
  }

  @Post(':id/comment')
  async addComment(
    @Param('id') id: number,
    @Body('authorId') authorId: number,
    @Body('text') text: string
  ): Promise<TaskComment> {
    return this.taskService.addComment(id, authorId, text);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: number): Promise<TaskComment[]> {
    return this.taskService.getComments(id);
  }
}
