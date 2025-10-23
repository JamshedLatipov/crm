import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskType } from '../entities/task-type.entity';
import { CreateTaskTypeDto, UpdateTaskTypeDto } from '../dto/task-type.dto';

@Injectable()
export class TaskTypeService {
  constructor(
    @InjectRepository(TaskType)
    private readonly taskTypeRepository: Repository<TaskType>,
  ) {}

  /**
   * Создать новый тип задачи
   */
  async create(dto: CreateTaskTypeDto): Promise<TaskType> {
    // Проверка уникальности имени
    const existing = await this.taskTypeRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Тип задачи с именем "${dto.name}" уже существует`);
    }

    const taskType = this.taskTypeRepository.create({
      ...dto,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : 0,
    });

    return this.taskTypeRepository.save(taskType);
  }

  /**
   * Получить все типы задач
   */
  async findAll(includeInactive = false): Promise<TaskType[]> {
    const query = this.taskTypeRepository.createQueryBuilder('taskType');

    if (!includeInactive) {
      query.where('taskType.isActive = :isActive', { isActive: true });
    }

    return query.orderBy('taskType.sortOrder', 'ASC').getMany();
  }

  /**
   * Получить тип задачи по ID
   */
  async findOne(id: number): Promise<TaskType> {
    const taskType = await this.taskTypeRepository.findOne({
      where: { id },
      relations: ['tasks'],
    });

    if (!taskType) {
      throw new NotFoundException(`Тип задачи с ID ${id} не найден`);
    }

    return taskType;
  }

  /**
   * Обновить тип задачи
   */
  async update(id: number, dto: UpdateTaskTypeDto): Promise<TaskType> {
    const taskType = await this.findOne(id);

    // Проверка уникальности имени при изменении
    if (dto.name && dto.name !== taskType.name) {
      const existing = await this.taskTypeRepository.findOne({
        where: { name: dto.name },
      });

      if (existing) {
        throw new ConflictException(`Тип задачи с именем "${dto.name}" уже существует`);
      }
    }

    Object.assign(taskType, dto);
    return this.taskTypeRepository.save(taskType);
  }

  /**
   * Удалить тип задачи (мягкое удаление - деактивация)
   */
  async remove(id: number): Promise<void> {
    const taskType = await this.findOne(id);
    
    // Мягкое удаление - просто деактивируем
    taskType.isActive = false;
    await this.taskTypeRepository.save(taskType);
  }

  /**
   * Полное удаление типа задачи (только если нет связанных задач)
   */
  async forceRemove(id: number): Promise<void> {
    const taskType = await this.findOne(id);

    if (taskType.tasks && taskType.tasks.length > 0) {
      throw new ConflictException(
        `Невозможно удалить тип задачи, так как с ним связано ${taskType.tasks.length} задач(и)`
      );
    }

    await this.taskTypeRepository.remove(taskType);
  }

  /**
   * Вычислить дедлайн на основе настроек типа задачи
   */
  calculateDueDate(taskType: TaskType, startDate: Date = new Date()): Date | null {
    if (!taskType.timeFrameSettings?.defaultDuration) {
      return null;
    }

    const dueDate = new Date(startDate);
    const { defaultDuration, skipWeekends, workingDays, workingHours } = taskType.timeFrameSettings;

    // Для коротких интервалов (меньше 60 минут) просто добавляем время без проверки рабочих часов
    if (defaultDuration < 60) {
      dueDate.setMinutes(dueDate.getMinutes() + defaultDuration);
      return dueDate;
    }

    // Для длинных интервалов применяем логику рабочих часов и дней
    dueDate.setMinutes(dueDate.getMinutes() + defaultDuration);

    // Если включен skip weekends и есть рабочие дни
    if (skipWeekends && workingDays && workingDays.length > 0) {
      while (!this.isWorkingDay(dueDate, workingDays)) {
        dueDate.setDate(dueDate.getDate() + 1);
        dueDate.setHours(0, 0, 0, 0);
      }
    }

    // Проверка рабочих часов только для интервалов >= 60 минут
    if (workingHours) {
      const [startHour, startMinute] = workingHours.start.split(':').map(Number);
      const [endHour, endMinute] = workingHours.end.split(':').map(Number);

      const hour = dueDate.getHours();
      const minute = dueDate.getMinutes();

      // Если время выходит за рамки рабочего дня, переносим на следующий рабочий день
      if (hour < startHour || (hour === startHour && minute < startMinute)) {
        dueDate.setHours(startHour, startMinute, 0, 0);
      } else if (hour > endHour || (hour === endHour && minute > endMinute)) {
        dueDate.setDate(dueDate.getDate() + 1);
        dueDate.setHours(startHour, startMinute, 0, 0);

        // Снова проверяем, не выходной ли день
        if (skipWeekends && workingDays) {
          while (!this.isWorkingDay(dueDate, workingDays)) {
            dueDate.setDate(dueDate.getDate() + 1);
          }
        }
      }
    }

    return dueDate;
  }

  /**
   * Проверить, является ли день рабочим
   */
  private isWorkingDay(date: Date, workingDays: number[]): boolean {
    const dayOfWeek = date.getDay(); // 0 = воскресенье, 1 = понедельник
    const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Преобразуем в ISO (1 = понедельник, 7 = воскресенье)
    return workingDays.includes(isoDay);
  }

  /**
   * Проверить валидность временных рамок
   */
  validateTimeFrame(taskType: TaskType, duration: number): { valid: boolean; message?: string } {
    const settings = taskType.timeFrameSettings;

    if (!settings) {
      return { valid: true };
    }

    if (settings.minDuration !== undefined && duration < settings.minDuration) {
      return {
        valid: false,
        message: `Длительность задачи не может быть меньше ${settings.minDuration} минут`,
      };
    }

    if (settings.maxDuration !== undefined && duration > settings.maxDuration) {
      return {
        valid: false,
        message: `Длительность задачи не может быть больше ${settings.maxDuration} минут`,
      };
    }

    return { valid: true };
  }

  /**
   * Получить время для напоминания
   */
  getReminderDate(taskType: TaskType, dueDate: Date): Date | null {
    if (!taskType.timeFrameSettings?.reminderBeforeDeadline || !dueDate) {
      return null;
    }

    const reminderDate = new Date(dueDate);
    reminderDate.setMinutes(reminderDate.getMinutes() - taskType.timeFrameSettings.reminderBeforeDeadline);

    // Напоминание не должно быть в прошлом
    if (reminderDate < new Date()) {
      return null;
    }

    return reminderDate;
  }

  /**
   * Изменить порядок сортировки типов задач
   */
  async reorder(orderedIds: number[]): Promise<TaskType[]> {
    const taskTypes = await this.taskTypeRepository.findByIds(orderedIds);

    for (let i = 0; i < orderedIds.length; i++) {
      const taskType = taskTypes.find(tt => tt.id === orderedIds[i]);
      if (taskType) {
        taskType.sortOrder = i;
      }
    }

    return this.taskTypeRepository.save(taskTypes);
  }
}
