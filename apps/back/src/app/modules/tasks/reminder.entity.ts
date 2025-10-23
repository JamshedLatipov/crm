import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Task } from './task.entity';

@Entity('task_reminders')
export class TaskReminder {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, { nullable: false })
  task: Task;

  @Column({ type: 'timestamptz' })
  remindAt: Date;

  @Column({ type: 'varchar', length: 32, nullable: true })
  repeatMode?: string; // none, daily, weekly, monthly, custom

  @Column({ type: 'json', nullable: true })
  repeatMeta?: any;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
