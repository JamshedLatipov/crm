import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskHistory } from './task-history.entity';
import { TaskComment } from './task-comment.entity';
import { User } from '../user/user.entity';
import { Lead } from '../leads/lead.entity';
import { Deal } from '../deals/deal.entity';
import { CreateTaskDto, UpdateTaskDto } from './task.dto';
import { TaskType } from './entities/task-type.entity';
import { TaskTypeService } from './services/task-type.service';
import { NotificationService } from '../shared/services/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../shared/entities/notification.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskHistory)
    private readonly historyRepo: Repository<TaskHistory>,
    @InjectRepository(TaskComment)
    private readonly commentRepo: Repository<TaskComment>,
    private readonly taskTypeService: TaskTypeService,
    private readonly notificationService: NotificationService,
  ) {}
  async addComment(taskId: number, authorId: number, text: string): Promise<TaskComment> {
    const comment = this.commentRepo.create({
      task: { id: taskId } as Task,
      author: { id: authorId } as User,
      text,
    });
    const savedComment = await this.commentRepo.save(comment);
    
    // Загружаем автора для возврата полной информации
    return this.commentRepo.findOne({
      where: { id: savedComment.id },
      relations: ['author']
    });
  }

  async getComments(taskId: number): Promise<TaskComment[]> {
    return this.commentRepo.find({ 
      where: { task: { id: taskId } }, 
      relations: ['author'],
      order: { createdAt: 'ASC' } 
    });
  }

  async create(data: CreateTaskDto, userId?: number): Promise<Task> {
    const taskData: any = {
      title: data.title,
      description: data.description,
      status: data.status || 'pending',
      dueDate: data.dueDate,
    };
    
    if (data.assignedToId) {
      taskData.assignedTo = { id: data.assignedToId } as User;
    }

    if (data.leadId) {
      taskData.lead = { id: data.leadId } as Lead;
      taskData.leadId = data.leadId;
    }

    if (data.dealId) {
      taskData.deal = { id: data.dealId } as Deal;
      taskData.dealId = data.dealId;
    }

    // Обработка типа задачи и автоматический расчет дедлайна
    if (data.taskTypeId) {
      taskData.taskType = { id: data.taskTypeId } as TaskType;
      taskData.taskTypeId = data.taskTypeId;

      // Если дедлайн не указан, рассчитываем его на основе настроек типа задачи
      if (!data.dueDate) {
        try {
          const taskType = await this.taskTypeService.findOne(data.taskTypeId);
          const calculatedDueDate = this.taskTypeService.calculateDueDate(taskType);
          if (calculatedDueDate) {
            taskData.dueDate = calculatedDueDate;
          }
        } catch (error) {
          // Игнорируем ошибку, если тип задачи не найден
          console.warn(`TaskType with id ${data.taskTypeId} not found, skipping due date calculation`);
        }
      }
    }
    
    const task = await this.taskRepo.save(taskData);
    
    await this.historyRepo.save({
      task,
      action: 'created',
      details: data,
      user: userId ? { id: userId } as User : null,
    });
    
    // Отправляем уведомление о создании задачи
    if (task.assignedTo?.id) {
      await this.notificationService.createTaskNotification(
        NotificationType.TASK_CREATED,
        `Новая задача: ${task.title}`,
        `Вам назначена новая задача: ${task.title}`,
        {
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          assignedTo: task.assignedTo?.id.toString(),
          assignedBy: userId?.toString(),
        },
        task.assignedTo.id.toString(),
        [NotificationChannel.IN_APP],
        NotificationPriority.MEDIUM
      );
    }
    
    return this.findById(task.id);
  }

  async findAll(): Promise<Task[]> {
    return this.taskRepo.find({ relations: ['assignedTo', 'lead', 'deal', 'taskType'] });
  }

  async findByLeadId(leadId: number): Promise<Task[]> {
    return this.taskRepo.find({ 
      where: { leadId },
      relations: ['assignedTo', 'lead', 'taskType'],
      order: { dueDate: 'ASC' }
    });
  }

  async findByDealId(dealId: string): Promise<Task[]> {
    return this.taskRepo.find({ 
      where: { dealId },
      relations: ['assignedTo', 'deal', 'taskType'],
      order: { dueDate: 'ASC' }
    });
  }

  async findById(id: number): Promise<Task | null> {
    return this.taskRepo.findOne({ 
      where: { id }, 
      relations: ['assignedTo', 'lead', 'deal', 'taskType'] 
    });
  }

  async update(id: number, data: UpdateTaskDto, userId?: number): Promise<Task> {
    // Загружаем оригинальную задачу ДО обновления
    const originalTask = await this.findById(id);
    
    const updateData: any = {};
    
    // Обновляем только те поля, которые были переданы
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
    }
    
    if (data.assignedToId !== undefined) {
      updateData.assignedTo = data.assignedToId ? { id: data.assignedToId } as User : null;
    }

    if (data.leadId !== undefined) {
      updateData.leadId = data.leadId;
      updateData.lead = data.leadId ? { id: data.leadId } as Lead : null;
    }

    if (data.dealId !== undefined) {
      updateData.dealId = data.dealId;
      updateData.deal = data.dealId ? { id: data.dealId } as Deal : null;
    }

    if (data.taskTypeId !== undefined) {
      updateData.taskTypeId = data.taskTypeId;
      updateData.taskType = data.taskTypeId ? { id: data.taskTypeId } as TaskType : null;
    }
    
    await this.taskRepo.update(id, updateData);
    const updated = await this.findById(id);
    
    // Формируем детали изменений в формате { field: { old: ..., new: ... } }
    const changes: Record<string, { old: any; new: any }> = {};
    
    if (originalTask) {
      if (data.title !== undefined && originalTask.title !== data.title) {
        changes.title = { old: originalTask.title, new: data.title };
      }
      if (data.description !== undefined && originalTask.description !== data.description) {
        changes.description = { old: originalTask.description || '', new: data.description || '' };
      }
      if (data.status !== undefined && originalTask.status !== data.status) {
        changes.status = { old: originalTask.status, new: data.status };
      }
      if (data.dueDate !== undefined) {
        const oldDate = originalTask.dueDate ? originalTask.dueDate.toISOString() : null;
        const newDate = data.dueDate ? new Date(data.dueDate).toISOString() : null;
        if (oldDate !== newDate) {
          changes.dueDate = { old: oldDate, new: newDate };
        }
      }
      if (data.assignedToId !== undefined && originalTask.assignedTo?.id !== data.assignedToId) {
        changes.assignedToId = { 
          old: originalTask.assignedTo?.id || null, 
          new: data.assignedToId || null 
        };
      }
      if (data.leadId !== undefined && originalTask.leadId !== data.leadId) {
        changes.leadId = { old: originalTask.leadId || null, new: data.leadId || null };
      }
      if (data.dealId !== undefined && originalTask.dealId !== data.dealId) {
        changes.dealId = { old: originalTask.dealId || null, new: data.dealId || null };
      }
      if (data.taskTypeId !== undefined && originalTask.taskTypeId !== data.taskTypeId) {
        changes.taskTypeId = { old: originalTask.taskTypeId || null, new: data.taskTypeId || null };
      }
    }
    
    // Сохраняем историю только если есть изменения
    if (Object.keys(changes).length > 0) {
      await this.historyRepo.save({
        task: updated,
        action: 'updated',
        details: changes,
        user: userId ? { id: userId } as User : null,
      });
    }
    
    // Отправляем уведомление об обновлении задачи
    if (Object.keys(changes).length > 0) {
      const recipientIds = new Set<string>();
      if (updated.assignedTo?.id) recipientIds.add(updated.assignedTo.id.toString());
      if (userId && userId !== updated.assignedTo?.id) recipientIds.add(userId.toString());
      
      for (const recipientId of recipientIds) {
        await this.notificationService.createTaskNotification(
          NotificationType.TASK_UPDATED,
          `Задача обновлена: ${updated.title}`,
          `Задача "${updated.title}" была обновлена`,
          {
            taskId: updated.id,
            taskTitle: updated.title,
            taskStatus: updated.status,
            assignedTo: updated.assignedTo?.id?.toString(),
            assignedBy: userId?.toString(),
            changes,
          },
          recipientId,
          [NotificationChannel.IN_APP],
          NotificationPriority.LOW
        );
      }
    }
    
    return updated;
  }

  async delete(id: number, userId?: number): Promise<void> {
    const task = await this.findById(id);
    await this.taskRepo.delete(id);
    await this.historyRepo.save({
      task,
      action: 'deleted',
      details: null,
      user: userId ? { id: userId } : null,
    });
    
    // Отправляем уведомление об удалении задачи
    const recipientIds = new Set<string>();
    if (task.assignedTo?.id) recipientIds.add(task.assignedTo.id.toString());
    if (userId && userId !== task.assignedTo?.id) recipientIds.add(userId.toString());
    
    for (const recipientId of recipientIds) {
      await this.notificationService.createTaskNotification(
        NotificationType.TASK_DELETED,
        `Задача удалена: ${task.title}`,
        `Задача "${task.title}" была удалена`,
        {
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          assignedTo: task.assignedTo?.id?.toString(),
          assignedBy: userId?.toString(),
        },
        recipientId,
        [NotificationChannel.IN_APP],
        NotificationPriority.MEDIUM
      );
    }
  }
  async addStatusChange(id: number, status: string, userId?: number): Promise<void> {
    const task = await this.findById(id);
    await this.historyRepo.save({
      task,
      action: 'status_changed',
      details: { status },
      user: userId ? { id: userId } : null,
    });
  }

  async getHistory(taskId: number): Promise<TaskHistory[]> {
    return this.historyRepo.find({
      where: { task: { id: taskId } },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }
}
