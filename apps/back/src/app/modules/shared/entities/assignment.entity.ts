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

@Entity('assignments')
@Index(['entityType', 'entityId'])
@Index(['userId', 'status'])
@Index(['assignedAt'])
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: string;

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