import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Task, TaskType, Assignment, AssignmentStatus } from './entities';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilterDto,
  CompleteTaskDto,
  TaskResponseDto,
  TaskListResponseDto,
  TaskStatsDto,
  TaskStatus,
  SERVICES,
  NOTIFICATION_PATTERNS,
  NotificationType,
  NotificationChannel,
  TASK_EVENTS,
} from '@crm/contracts';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskType)
    private readonly taskTypeRepository: Repository<TaskType>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @Inject(SERVICES.NOTIFICATION)
    private readonly notificationClient: ClientProxy,
  ) {}

  async findAll(filter: TaskFilterDto): Promise<TaskListResponseDto> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.taskType', 'taskType');

    if (filter.status) {
      queryBuilder.andWhere('task.status = :status', { status: filter.status });
    }

    if (filter.leadId) {
      queryBuilder.andWhere('task.leadId = :leadId', { leadId: filter.leadId });
    }

    if (filter.dealId) {
      queryBuilder.andWhere('task.dealId = :dealId', { dealId: filter.dealId });
    }

    if (filter.taskTypeId) {
      queryBuilder.andWhere('task.taskTypeId = :taskTypeId', { taskTypeId: filter.taskTypeId });
    }

    if (filter.dueBefore) {
      queryBuilder.andWhere('task.dueDate < :dueBefore', { dueBefore: new Date(filter.dueBefore) });
    }

    if (filter.dueAfter) {
      queryBuilder.andWhere('task.dueDate > :dueAfter', { dueAfter: new Date(filter.dueAfter) });
    }

    if (filter.overdue) {
      queryBuilder.andWhere('task.dueDate < :now', { now: new Date() })
        .andWhere('task.status != :completed', { completed: TaskStatus.COMPLETED });
    }

    if (filter.assigneeId) {
      queryBuilder.innerJoin(
        Assignment,
        'assignment',
        'assignment.taskId = task.id AND assignment.userId = :assigneeId AND assignment.status = :activeStatus',
        { assigneeId: filter.assigneeId, activeStatus: AssignmentStatus.ACTIVE }
      );
    }

    queryBuilder.orderBy('task.dueDate', 'ASC', 'NULLS LAST')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const taskIds = items.map(t => t.id);
    const assignments = taskIds.length > 0 
      ? await this.assignmentRepository.find({
          where: { taskId: taskIds as unknown as number, entityType: 'task', status: AssignmentStatus.ACTIVE },
        })
      : [];

    const assigneeMap = new Map<number, number>();
    assignments.forEach(a => assigneeMap.set(a.taskId, a.userId));

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map(task => this.toResponseDto(task, assigneeMap.get(task.id))),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: number): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['taskType'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { taskId: id, entityType: 'task', status: AssignmentStatus.ACTIVE },
    });

    return this.toResponseDto(task, assignment?.userId);
  }

  async create(dto: CreateTaskDto): Promise<TaskResponseDto> {
    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description,
      leadId: dto.leadId,
      dealId: dto.dealId,
      taskTypeId: dto.taskTypeId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: TaskStatus.PENDING,
    });

    const savedTask = await this.taskRepository.save(task);

    let assigneeId: number | undefined;
    if (dto.assigneeId) {
      const assignment = this.assignmentRepository.create({
        entityType: 'task',
        taskId: savedTask.id,
        userId: dto.assigneeId,
        assignedBy: dto.assigneeId, // TODO: get from context
        status: AssignmentStatus.ACTIVE,
      });
      await this.assignmentRepository.save(assignment);
      assigneeId = dto.assigneeId;

      // Send notification
      this.sendNotification({
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assigned',
        message: `Task "${savedTask.title}" has been assigned to you`,
        channel: NotificationChannel.IN_APP,
        recipientId: String(dto.assigneeId),
        data: { taskId: savedTask.id, title: savedTask.title },
      });
    }

    // Emit event
    this.emitEvent(TASK_EVENTS.CREATED, {
      taskId: savedTask.id,
      title: savedTask.title,
      assigneeId,
      dueDate: savedTask.dueDate?.toISOString(),
    });

    return this.findOne(savedTask.id);
  }

  async update(id: number, dto: UpdateTaskDto): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.taskTypeId !== undefined) task.taskTypeId = dto.taskTypeId;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;

    await this.taskRepository.save(task);

    this.emitEvent(TASK_EVENTS.UPDATED, {
      taskId: task.id,
      changes: dto,
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await this.taskRepository.remove(task);

    this.emitEvent(TASK_EVENTS.DELETED, { taskId: id });
  }

  async assign(id: number, assigneeId: number, assignedBy?: number): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Remove previous assignment
    await this.assignmentRepository.update(
      { taskId: id, entityType: 'task', status: AssignmentStatus.ACTIVE },
      { status: AssignmentStatus.REMOVED, removedAt: new Date() }
    );

    // Create new assignment
    const assignment = this.assignmentRepository.create({
      entityType: 'task',
      taskId: id,
      userId: assigneeId,
      assignedBy: assignedBy || assigneeId,
      status: AssignmentStatus.ACTIVE,
    });
    await this.assignmentRepository.save(assignment);

    // Send notification
    this.sendNotification({
      type: NotificationType.TASK_ASSIGNED,
      title: 'Task Assigned',
      message: `Task "${task.title}" has been assigned to you`,
      channel: NotificationChannel.IN_APP,
      recipientId: String(assigneeId),
      data: { taskId: id, title: task.title },
    });

    this.emitEvent(TASK_EVENTS.ASSIGNED, {
      taskId: id,
      assigneeId,
      assignedBy: assignedBy || assigneeId,
    });

    return this.findOne(id);
  }

  async complete(id: number, dto: CompleteTaskDto, completedBy?: number): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    task.status = TaskStatus.COMPLETED;
    await this.taskRepository.save(task);

    // Update assignment
    if (completedBy) {
      await this.assignmentRepository.update(
        { taskId: id, entityType: 'task', status: AssignmentStatus.ACTIVE },
        { status: AssignmentStatus.COMPLETED, completedAt: new Date() }
      );
    }

    this.emitEvent(TASK_EVENTS.COMPLETED, {
      taskId: id,
      completedBy,
      completedAt: new Date().toISOString(),
      outcome: dto.outcome,
    });

    return this.findOne(id);
  }

  async getStats(): Promise<TaskStatsDto> {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const [total, pending, inProgress, completed, overdue, dueToday, dueThisWeek] = await Promise.all([
      this.taskRepository.count(),
      this.taskRepository.count({ where: { status: TaskStatus.PENDING } }),
      this.taskRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.taskRepository.count({ where: { status: TaskStatus.COMPLETED } }),
      this.taskRepository.count({
        where: {
          dueDate: LessThan(now),
          status: TaskStatus.PENDING,
        },
      }),
      this.taskRepository.count({
        where: {
          dueDate: Between(now, endOfDay),
          status: TaskStatus.PENDING,
        },
      }),
      this.taskRepository.count({
        where: {
          dueDate: Between(now, endOfWeek),
          status: TaskStatus.PENDING,
        },
      }),
    ]);

    return { total, pending, inProgress, completed, overdue, dueToday, dueThisWeek };
  }

  async getTaskTypes(): Promise<TaskType[]> {
    return this.taskTypeRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getByAssignee(assigneeId: number): Promise<TaskResponseDto[]> {
    const result = await this.findAll({ assigneeId, status: TaskStatus.PENDING } as TaskFilterDto);
    return result.items;
  }

  async getOverdue(): Promise<TaskResponseDto[]> {
    const result = await this.findAll({ overdue: true } as TaskFilterDto);
    return result.items;
  }

  private toResponseDto(task: Task, assigneeId?: number): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      leadId: task.leadId,
      dealId: task.dealId,
      taskTypeId: task.taskTypeId,
      taskTypeName: task.taskType?.name,
      assigneeId,
      dueDate: task.dueDate?.toISOString(),
      callLogId: task.callLogId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private sendNotification(notification: {
    type: NotificationType;
    title: string;
    message: string;
    channel: NotificationChannel;
    recipientId: string;
    data?: Record<string, unknown>;
  }): void {
    try {
      this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND, notification);
    } catch (err) {
      const error = err as Error;
      this.logger.warn(`Failed to send notification: ${error.message}`);
    }
  }

  private emitEvent(event: string, payload: Record<string, unknown>): void {
    try {
      this.notificationClient.emit(event, {
        event,
        timestamp: new Date().toISOString(),
        payload,
      });
    } catch (err) {
      const error = err as Error;
      this.logger.warn(`Failed to emit event ${event}: ${error.message}`);
    }
  }
}
