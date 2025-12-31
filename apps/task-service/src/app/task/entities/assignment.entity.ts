import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';

export enum AssignmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  REMOVED = 'removed',
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'assigned_by' })
  assignedBy: number;

  @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.ACTIVE })
  status: AssignmentStatus;

  @Column({ name: 'assigned_at', type: 'timestamp', default: () => 'now()' })
  assignedAt: Date;

  @Column({ name: 'removed_at', type: 'timestamp', nullable: true })
  removedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'removal_reason', type: 'text', nullable: true })
  removalReason: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ name: 'task_id', nullable: true })
  taskId: number;

  @Column({ name: 'lead_id', nullable: true })
  leadId: number;

  @Column({ name: 'deal_id', type: 'uuid', nullable: true })
  dealId: string;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
