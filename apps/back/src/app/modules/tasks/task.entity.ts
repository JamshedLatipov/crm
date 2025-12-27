import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { Deal } from '../deals/deal.entity';
import { TaskComment } from './task-comment.entity';
import { TaskType } from './entities/task-type.entity';
import { Assignment } from '../shared/entities/assignment.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  // Assigned users are now stored in the centralized `assignments` table.
  // We expose a relation to Assignment so tasks can load related assignments if needed.
  @OneToMany(() => Assignment, assignment => assignment.taskId, { lazy: true })
  assignments?: Assignment[];

  @OneToMany(() => TaskComment, comment => comment.task, { cascade: true })
  comments: TaskComment[];

  // Связь с лидом
  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column({ nullable: true })
  leadId: number;

  // Связь со сделкой
  @ManyToOne(() => Deal, { nullable: true })
  @JoinColumn({ name: 'dealId' })
  deal: Deal;

  @Column({ nullable: true })
  dealId: string;

  // Связь с логом звонка
  @Column({ type: 'uuid', nullable: true })
  callLogId: string;

  // Тип задачи
  @ManyToOne(() => TaskType, taskType => taskType.tasks, { nullable: true })
  @JoinColumn({ name: 'taskTypeId' })
  taskType: TaskType;

  @Column({ nullable: true })
  taskTypeId: number;

  @Column({ default: 'pending' })
  status: string; // pending, in_progress, done, overdue

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
