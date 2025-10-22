import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Task } from '../task.entity';

export interface TimeFrameSettings {
  // Временные рамки по умолчанию (в минутах)
  defaultDuration?: number;
  
  // Минимальная длительность (в минутах)
  minDuration?: number;
  
  // Максимальная длительность (в минутах)
  maxDuration?: number;
  
  // Время до дедлайна для предупреждения (в минутах)
  warningBeforeDeadline?: number;
  
  // Автоматическое напоминание за N минут до дедлайна
  reminderBeforeDeadline?: number;
  
  // Разрешить задачи без дедлайна
  allowNoDueDate?: boolean;
  
  // Рабочие дни (1-7, где 1 - понедельник)
  workingDays?: number[];
  
  // Рабочие часы (например, { start: "09:00", end: "18:00" })
  workingHours?: {
    start: string;
    end: string;
  };
  
  // Автоматически сдвигать дедлайн на следующий рабочий день, если выпадает на выходной
  skipWeekends?: boolean;
  
  // SLA (Service Level Agreement) - максимальное время ответа в минутах
  slaResponseTime?: number;
  
  // SLA - максимальное время решения в минутах
  slaResolutionTime?: number;
}

@Entity('task_types')
export class TaskType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  color: string; // Цвет для UI (hex)

  @Column({ nullable: true })
  icon: string; // Иконка для UI

  @Column({ type: 'jsonb', nullable: true })
  timeFrameSettings: TimeFrameSettings;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number; // Для сортировки в UI

  @OneToMany(() => Task, task => task.taskType)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
