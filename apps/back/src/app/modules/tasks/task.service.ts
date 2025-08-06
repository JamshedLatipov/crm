import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskHistory } from './task-history.entity';
import { TaskComment } from './task-comment.entity';
import { User } from '../user/user.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskHistory)
    private readonly historyRepo: Repository<TaskHistory>,
    @InjectRepository(TaskComment)
    private readonly commentRepo: Repository<TaskComment>
  ) {}
  async addComment(taskId: number, authorId: number, text: string): Promise<TaskComment> {
    const comment = this.commentRepo.create({
      task: { id: taskId } as Task,
      author: { id: authorId } as User,
      text,
    });
    return this.commentRepo.save(comment);
  }

  async getComments(taskId: number): Promise<TaskComment[]> {
    return this.commentRepo.find({ where: { task: { id: taskId } }, order: { createdAt: 'ASC' } });
  }

  async create(data: Partial<Task>, userId?: number): Promise<Task> {
    const task = await this.taskRepo.save(data);
    await this.historyRepo.save({
      task,
      action: 'created',
      details: data,
      user: userId ? { id: userId } : null,
    });
    return task;
  }

  async findAll(): Promise<Task[]> {
    return this.taskRepo.find();
  }

  async findById(id: number): Promise<Task | null> {
    return this.taskRepo.findOneBy({ id });
  }

  async update(id: number, data: Partial<Task>, userId?: number): Promise<Task> {
    await this.taskRepo.update(id, data);
    const updated = await this.findById(id);
    await this.historyRepo.save({
      task: updated,
      action: 'updated',
      details: data,
      user: userId ? { id: userId } : null,
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
