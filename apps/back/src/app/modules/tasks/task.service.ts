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
    
    await this.historyRepo.save({
      task: updated,
      action: 'updated',
      details: data,
      user: userId ? { id: userId } as User : null,
    });
    
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
}
