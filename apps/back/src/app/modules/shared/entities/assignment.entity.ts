import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Task } from '../../tasks/task.entity';
import { Lead } from '../../leads/lead.entity';
import { Deal } from '../../deals/deal.entity';

@Entity('assignments')
@Index(['entityType', 'taskId', 'leadId', 'dealId'])
@Index(['userId', 'status'])
@Index(['assignedAt'])
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  // New explicit FK columns introduced by Variant B migration.
  // These are nullable and will be populated from entity_type/entity_id when migrating.
  @Column({ name: 'task_id', type: 'integer', nullable: true })
  taskId?: number;

  @Column({ name: 'lead_id', type: 'integer', nullable: true })
  leadId?: number;

  @Column({ name: 'deal_id', type: 'uuid', nullable: true })
  dealId?: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'assigned_by' })
  assignedBy: number;

  @Column({ 
    type: 'enum',
    enum: ['active', 'completed', 'removed', 'transferred'],
    default: 'active'
  })
  status: string;

  @Column({ 
    name: 'assigned_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  assignedAt: Date;

  @Column({ 
    name: 'removed_at',
    type: 'timestamp',
    nullable: true
  })
  removedAt?: Date;

  @Column({ 
    name: 'completed_at',
    type: 'timestamp',
    nullable: true
  })
  completedAt?: Date;

  @Column({ 
    type: 'text',
    nullable: true
  })
  reason?: string;

  @Column({ 
    name: 'removal_reason',
    type: 'text',
    nullable: true
  })
  removalReason?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: () => "'{}'"
  })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser?: User;

  // New, explicit relations that reference the dedicated FK columns created by the migration.
  // Prefer these new relations over the old polymorphic `entity_id` column.
  @ManyToOne(() => Task, { nullable: true, lazy: true })
  @JoinColumn({ name: 'task_id' })
  taskRef?: Task;

  @ManyToOne(() => Lead, { nullable: true, lazy: true })
  @JoinColumn({ name: 'lead_id' })
  lead?: Lead;

  @ManyToOne(() => Deal, { nullable: true, lazy: true })
  @JoinColumn({ name: 'deal_id' })
  deal?: Deal;

  // Helper methods
  isActive(): boolean {
    return this.status === 'active';
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  isRemoved(): boolean {
    return this.status === 'removed';
  }

  getDuration(): number | null {
    if (!this.completedAt && !this.removedAt) {
      return null;
    }
    
    const endTime = this.completedAt || this.removedAt;
    return endTime.getTime() - this.assignedAt.getTime();
  }

  getDisplayStatus(): string {
    switch (this.status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'removed':
        return 'Removed';
      case 'transferred':
        return 'Transferred';
      default:
        return 'Unknown';
    }
  }
}