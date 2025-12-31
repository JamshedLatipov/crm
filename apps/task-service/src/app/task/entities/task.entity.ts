import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskType } from './task-type.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  leadId: number;

  @Column({ type: 'uuid', nullable: true })
  dealId: string;

  @Column({ nullable: true })
  taskTypeId: number;

  @ManyToOne(() => TaskType, { nullable: true })
  @JoinColumn({ name: 'taskTypeId' })
  taskType: TaskType;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  @Column({ type: 'uuid', nullable: true })
  callLogId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
