import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { TaskService } from './task.service';
import { Task } from './task.entity';
import { CreateTaskDto, UpdateTaskDto } from './task.dto';
import { ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';
import { TaskComment } from './task-comment.entity';
import { TaskHistory } from './task-history.entity';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../user/current-user.decorator';

@ApiTags('tasks')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiBody({ type: CreateTaskDto })
  async create(@Body() data: CreateTaskDto, @CurrentUser() user?: CurrentUserPayload): Promise<Task> {
    const userId = user?.sub != null ? Number(user.sub) : undefined;
    return this.taskService.create(data, userId);
  }

  @Get()
  @ApiQuery({ name: 'leadId', required: false, description: 'Фильтр по ID лида' })
  @ApiQuery({ name: 'dealId', required: false, description: 'Фильтр по ID сделки' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество записей на странице' })
  @ApiQuery({ name: 'status', required: false, description: 'Статус задачи' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск' })
  @ApiQuery({ name: 'from', required: false, description: 'Начальная дата диапазона (ISO)' })
  @ApiQuery({ name: 'to', required: false, description: 'Конечная дата диапазона (ISO)' })
  async findAll(
    @Query('leadId') leadId?: string,
    @Query('dealId') dealId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<any> {
    if (leadId) {
      return this.taskService.findByLeadId(Number(leadId));
    }
    if (dealId) {
      return this.taskService.findByDealId(dealId);
    }
    
    // If from/to are provided, fetch tasks in date range
    if (from && to) {
      return this.taskService.findByDateRange(from, to);
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.taskService.findAll(pageNum, limitNum, { status, search });
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Task | null> {
    return this.taskService.findById(Number(id));
  }

  @Patch(':id')
  @ApiBody({ type: UpdateTaskDto })
  async update(@Param('id') id: number, @Body() data: UpdateTaskDto, @CurrentUser() user?: CurrentUserPayload): Promise<Task> {
    const userId = user?.sub != null ? Number(user.sub) : undefined;
    return this.taskService.update(Number(id), data, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.taskService.delete(Number(id));
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

  @Get(':id/history')
  async getHistory(@Param('id') id: number): Promise<TaskHistory[]> {
    return this.taskService.getHistory(id);
  }
}

