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
import { AssignmentService } from '../shared/services/assignment.service';

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
    private readonly assignmentService: AssignmentService,
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
    
    // Assignments are now handled via AssignmentService. We'll create assignment after task is saved.

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
    
    // Отправляем нотификацию о создании задачи
    try {
      const assignedUserId = data.assignedToId || userId || null;
      if (assignedUserId) {
        await this.notificationService.createTaskNotification(
          NotificationType.TASK_CREATED,
          'Новая задача',
          `Создана новая задача: ${task.title}`,
          { taskId: task.id, taskTitle: task.title, dueDate: task.dueDate },
          String(assignedUserId),
          [NotificationChannel.IN_APP],
          NotificationPriority.MEDIUM
        );
      }
    } catch (err) {
      console.warn('Failed to send TASK_CREATED notification:', err?.message || err);
    }
    
    // If an assignee was provided, create centralized assignment (AssignmentService will handle notifications)
    if (data.assignedToId) {
      try {
        await this.assignmentService.createAssignment({
          entityType: 'task',
          entityId: task.id,
          assignedTo: [data.assignedToId],
          assignedBy: userId || null,
          reason: data['assignReason'] || undefined,
          notifyAssignees: true
        });
      } catch (e) {
        // don't block task creation on assignment failure
        console.warn('Failed to create assignment for task during create:', e?.message || e);
      }
    }
    
    return this.findById(task.id);
  }

  /**
   * Attach current assignment info to a Task or array of Tasks.
   * This centralizes the logic for batch lookup + per-entity fallback.
   */
  private async attachAssignments(tasksOrTask: Task[] | Task | null): Promise<void> {
    if (!tasksOrTask) return;
    const tasks = Array.isArray(tasksOrTask) ? tasksOrTask : [tasksOrTask];
    if (tasks.length === 0) return;

    try {
      const ids = tasks.map(t => t.id);
      const map = await this.assignmentService.getCurrentAssignmentsForEntities('task', ids);

      for (const t of tasks) {
        let a = map.get(String(t.id));
        if (!a) {
          try {
            const single = await this.assignmentService.getCurrentAssignments('task', String(t.id));
            if (single && single.length > 0) a = single[0];
          } catch (e) {
            // ignore per-entity lookup errors
          }
        }

        if (a) {
          (t as any).assignedTo = a.user || { id: a.userId, fullName: a.userName, email: a.userEmail };
          (t as any).assignedToId = a.userId;
        } else {
          (t as any).assignedTo = null;
          (t as any).assignedToId = null;
        }
      }
    } catch (e) {
      // ignore assignment lookup errors
      for (const t of tasks) {
        (t as any).assignedTo = null;
        (t as any).assignedToId = null;
      }
    }
  }

  async findAll(page = 1, limit = 50, filters?: { status?: string, search?: string }): Promise<{ data: Task[]; total: number }> {
    const qb = this.taskRepo.createQueryBuilder('task')
      .leftJoinAndSelect('task.lead', 'lead')
      .leftJoinAndSelect('task.deal', 'deal')
      .leftJoinAndSelect('task.taskType', 'taskType')
      .take(limit)
      .skip((page - 1) * limit);

    if (filters?.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      qb.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', { search: `%${filters.search}%` });
    }

    const [tasks, total] = await qb.getManyAndCount();
    await this.attachAssignments(tasks);
    return { data: tasks, total };
  }

  async findByLeadId(leadId: number): Promise<Task[]> {
    const tasks = await this.taskRepo.find({ 
      where: { leadId },
      relations: ['lead', 'taskType'],
      order: { dueDate: 'ASC' }
    });
    await this.attachAssignments(tasks);
    return tasks;
  }

  async findByDealId(dealId: string): Promise<Task[]> {
    const tasks = await this.taskRepo.find({ 
      where: { dealId },
      relations: ['deal', 'taskType'],
      order: { dueDate: 'ASC' }
    });
    await this.attachAssignments(tasks);
    return tasks;
  }

  async findById(id: number): Promise<Task | null> {
    const task = await this.taskRepo.findOne({ where: { id }, relations: ['lead', 'deal', 'taskType'] });
    if (!task) return null;
    await this.attachAssignments(task);
    return task;
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
    
    // Assignments are handled by AssignmentService; we'll manage them after updating the task record

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
        if (data.assignedToId !== undefined) {
          // Determine previous assigned user via AssignmentService
          try {
            const prev = await this.assignmentService.getCurrentAssignments('task', String(id));
            const prevId = (prev && prev.length) ? prev[0].userId : null;
            if (prevId !== data.assignedToId) {
              changes.assignedToId = { old: prevId || null, new: data.assignedToId || null };
            }
          } catch (e) {
            // ignore assignment lookup errors
            changes.assignedToId = { old: null, new: data.assignedToId || null };
          }
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
      try {
        const current = await this.assignmentService.getCurrentAssignments('task', String(updated.id));
        if (current && current.length) {
          recipientIds.add(String(current[0].userId));
        }
      } catch (e) {
        // ignore
      }
      if (userId) recipientIds.add(userId.toString());

      // Отправляем специальную нотификацию при изменении статуса
      if (changes.status) {
        for (const recipientId of recipientIds) {
          try {
            await this.notificationService.createTaskNotification(
              NotificationType.TASK_STATUS_CHANGED,
              `Статус задачи изменён: ${updated.title}`,
              `Статус задачи "${updated.title}" изменён с "${changes.status.old}" на "${changes.status.new}"`,
              {
                taskId: updated.id,
                taskTitle: updated.title,
                oldStatus: changes.status.old,
                newStatus: changes.status.new,
              },
              recipientId,
              [NotificationChannel.IN_APP],
              NotificationPriority.MEDIUM
            );
          } catch (err) {
            console.warn('Failed to send TASK_STATUS_CHANGED notification:', err?.message || err);
          }
        }
      }

      for (const recipientId of recipientIds) {
        await this.notificationService.createTaskNotification(
          NotificationType.TASK_UPDATED,
          `Задача обновлена: ${updated.title}`,
          `Задача "${updated.title}" была обновлена`,
          {
            taskId: updated.id,
            taskTitle: updated.title,
            taskStatus: updated.status,
            assignedTo: Array.from(recipientIds).join(','),
            assignedBy: userId?.toString(),
            changes,
          },
          recipientId,
          [NotificationChannel.IN_APP],
          NotificationPriority.LOW
        );
      }
    }

    // If status changed to done/completed, complete assignments for this task
    if (data.status !== undefined && (data.status === 'done' || data.status === 'completed')) {
      try {
        await this.assignmentService.completeAssignment('task', id, 'Task completed');
      } catch (err) {
        console.warn('Failed to complete assignments for task:', err?.message || err);
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
    try {
      const current = await this.assignmentService.getCurrentAssignments('task', String(task.id));
      if (current && current.length) recipientIds.add(String(current[0].userId));
    } catch (e) {
      // ignore
    }
    if (userId) recipientIds.add(String(userId));

    for (const recipientId of recipientIds) {
      await this.notificationService.createTaskNotification(
        NotificationType.TASK_DELETED,
        `Задача удалена: ${task.title}`,
        `Задача "${task.title}" была удалена`,
        {
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          assignedTo: Array.from(recipientIds).join(','),
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
