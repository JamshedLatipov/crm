import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskTypeDueDateCalculation {
  FIXED_DAYS = 'fixed_days',
  BUSINESS_DAYS = 'business_days',
  END_OF_WEEK = 'end_of_week',
  END_OF_MONTH = 'end_of_month',
  CUSTOM = 'custom',
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
  color: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ name: 'default_duration', nullable: true })
  defaultDuration: number;

  @Column({ type: 'enum', enum: TaskTypeDueDateCalculation, name: 'due_date_calculation', nullable: true })
  dueDateCalculation: TaskTypeDueDateCalculation;

  @Column({ name: 'due_date_offset', nullable: true })
  dueDateOffset: number;

  @Column({ type: 'jsonb', nullable: true })
  timeFrameSettings: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'required_fields', nullable: true, default: [] })
  requiredFields: string[];

  @Column({ type: 'jsonb', name: 'default_values', nullable: true, default: {} })
  defaultValues: Record<string, any>;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
