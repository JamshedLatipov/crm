import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TaskTypeService } from '../services/task-type.service';
import { TaskType } from '../entities/task-type.entity';
import { CreateTaskTypeDto, UpdateTaskTypeDto } from '../dto/task-type.dto';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';

@ApiTags('task-types')
@UseGuards(JwtAuthGuard)
@Controller('task-types')
export class TaskTypeController {
  constructor(private readonly taskTypeService: TaskTypeService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый тип задачи' })
  @ApiResponse({ status: 201, description: 'Тип задачи успешно создан', type: TaskType })
  @ApiResponse({ status: 409, description: 'Тип задачи с таким именем уже существует' })
  async create(@Body() dto: CreateTaskTypeDto): Promise<TaskType> {
    return this.taskTypeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все типы задач' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Список типов задач', type: [TaskType] })
  async findAll(@Query('includeInactive') includeInactive?: string): Promise<TaskType[]> {
    return this.taskTypeService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить тип задачи по ID' })
  @ApiResponse({ status: 200, description: 'Тип задачи найден', type: TaskType })
  @ApiResponse({ status: 404, description: 'Тип задачи не найден' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<TaskType> {
    return this.taskTypeService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить тип задачи' })
  @ApiResponse({ status: 200, description: 'Тип задачи успешно обновлен', type: TaskType })
  @ApiResponse({ status: 404, description: 'Тип задачи не найден' })
  @ApiResponse({ status: 409, description: 'Тип задачи с таким именем уже существует' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskTypeDto,
  ): Promise<TaskType> {
    return this.taskTypeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить тип задачи (деактивировать)' })
  @ApiResponse({ status: 200, description: 'Тип задачи успешно деактивирован' })
  @ApiResponse({ status: 404, description: 'Тип задачи не найден' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.taskTypeService.remove(id);
    return { message: 'Тип задачи успешно деактивирован' };
  }

  @Delete(':id/force')
  @ApiOperation({ summary: 'Полностью удалить тип задачи (если нет связанных задач)' })
  @ApiResponse({ status: 200, description: 'Тип задачи успешно удален' })
  @ApiResponse({ status: 404, description: 'Тип задачи не найден' })
  @ApiResponse({ status: 409, description: 'Невозможно удалить тип задачи, так как есть связанные задачи' })
  async forceRemove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.taskTypeService.forceRemove(id);
    return { message: 'Тип задачи успешно удален' };
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Изменить порядок сортировки типов задач' })
  @ApiResponse({ status: 200, description: 'Порядок успешно изменен', type: [TaskType] })
  async reorder(@Body('orderedIds') orderedIds: number[]): Promise<TaskType[]> {
    return this.taskTypeService.reorder(orderedIds);
  }

  @Post(':id/calculate-due-date')
  @ApiOperation({ summary: 'Рассчитать дедлайн на основе настроек типа задачи' })
  @ApiResponse({ status: 200, description: 'Дедлайн рассчитан' })
  async calculateDueDate(
    @Param('id', ParseIntPipe) id: number,
    @Body('startDate') startDate?: string,
  ): Promise<{ dueDate: Date | null }> {
    const taskType = await this.taskTypeService.findOne(id);
    const start = startDate ? new Date(startDate) : new Date();
    const dueDate = this.taskTypeService.calculateDueDate(taskType, start);
    return { dueDate };
  }

  @Post(':id/validate-timeframe')
  @ApiOperation({ summary: 'Проверить валидность временных рамок' })
  @ApiResponse({ status: 200, description: 'Результат валидации' })
  async validateTimeFrame(
    @Param('id', ParseIntPipe) id: number,
    @Body('duration') duration: number,
  ): Promise<{ valid: boolean; message?: string }> {
    const taskType = await this.taskTypeService.findOne(id);
    return this.taskTypeService.validateTimeFrame(taskType, duration);
  }
}
