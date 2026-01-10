import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskType, TaskTypeDueDateCalculation } from '../entities/task-type.entity';

@Injectable()
export class TaskTypeService {
  constructor(
    @InjectRepository(TaskType)
    private readonly typeRepo: Repository<TaskType>,
  ) {}

  async getTypes(): Promise<TaskType[]> {
    return this.typeRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async getType(id: number): Promise<TaskType | null> {
    return this.typeRepo.findOneBy({ id });
  }

  async getActiveTypes(): Promise<TaskType[]> {
    return this.typeRepo.find({ 
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async createType(dto: Partial<TaskType>): Promise<TaskType> {
    const type = this.typeRepo.create(dto);
    return this.typeRepo.save(type);
  }

  async updateType(id: number, dto: Partial<TaskType>): Promise<TaskType> {
    const type = await this.typeRepo.findOneBy({ id });
    if (!type) {
      throw new NotFoundException(`Task type ${id} not found`);
    }
    if (type.isSystem && dto.name) {
      throw new BadRequestException('Cannot rename system task type');
    }
    Object.assign(type, dto);
    return this.typeRepo.save(type);
  }

  async deleteType(id: number): Promise<{ success: boolean }> {
    const type = await this.typeRepo.findOneBy({ id });
    if (!type) {
      throw new NotFoundException(`Task type ${id} not found`);
    }
    if (type.isSystem) {
      throw new BadRequestException('Cannot delete system task type');
    }
    const result = await this.typeRepo.delete(id);
    return { success: (result.affected ?? 0) > 0 };
  }

  async toggleType(id: number): Promise<TaskType> {
    const type = await this.typeRepo.findOneBy({ id });
    if (!type) {
      throw new NotFoundException(`Task type ${id} not found`);
    }
    type.isActive = !type.isActive;
    return this.typeRepo.save(type);
  }

  async reorder(orderedIds: number[]): Promise<{ success: boolean }> {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if (id !== undefined) {
        await this.typeRepo.update(id, { sortOrder: i });
      }
    }
    return { success: true };
  }

  async calculateDueDate(typeId: number, startDate?: Date): Promise<Date> {
    const type = await this.typeRepo.findOneBy({ id: typeId });
    if (!type) {
      throw new NotFoundException(`Task type ${typeId} not found`);
    }

    const baseDate = startDate || new Date();
    const offset = type.dueDateOffset || 0;

    switch (type.dueDateCalculation) {
      case TaskTypeDueDateCalculation.FIXED_DAYS:
        return this.addDays(baseDate, offset);

      case TaskTypeDueDateCalculation.BUSINESS_DAYS:
        return this.addBusinessDays(baseDate, offset);

      case TaskTypeDueDateCalculation.END_OF_WEEK:
        return this.getEndOfWeek(baseDate);

      case TaskTypeDueDateCalculation.END_OF_MONTH:
        return this.getEndOfMonth(baseDate);

      case TaskTypeDueDateCalculation.CUSTOM:
      default:
        return this.addDays(baseDate, offset || 7);
    }
  }

  async getDefaultTypes(): Promise<Partial<TaskType>[]> {
    return [
      { name: 'Call', icon: 'phone', color: '#4CAF50', defaultDuration: 15, isSystem: true },
      { name: 'Meeting', icon: 'people', color: '#2196F3', defaultDuration: 60, isSystem: true },
      { name: 'Email', icon: 'email', color: '#FF9800', defaultDuration: 10, isSystem: true },
      { name: 'Follow-up', icon: 'refresh', color: '#9C27B0', defaultDuration: 15, isSystem: true },
      { name: 'Demo', icon: 'play_circle', color: '#E91E63', defaultDuration: 45, isSystem: true },
      { name: 'Proposal', icon: 'description', color: '#00BCD4', defaultDuration: 30, isSystem: true },
      { name: 'Research', icon: 'search', color: '#795548', defaultDuration: 30, isSystem: false },
      { name: 'Other', icon: 'more_horiz', color: '#607D8B', defaultDuration: 30, isSystem: false },
    ];
  }

  async seedDefaultTypes(): Promise<{ created: number }> {
    const defaults = await this.getDefaultTypes();
    let created = 0;
    
    for (const typeData of defaults) {
      const existing = await this.typeRepo.findOneBy({ name: typeData.name });
      if (!existing) {
        await this.typeRepo.save(this.typeRepo.create({ ...typeData, sortOrder: created }));
        created++;
      }
    }
    
    return { created };
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        added++;
      }
    }
    return result;
  }

  private getEndOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = 5 - day; // Friday
    if (diff < 0) {
      result.setDate(result.getDate() + 7 + diff);
    } else {
      result.setDate(result.getDate() + diff);
    }
    result.setHours(18, 0, 0, 0);
    return result;
  }

  private getEndOfMonth(date: Date): Date {
    const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    result.setHours(18, 0, 0, 0);
    return result;
  }
}
