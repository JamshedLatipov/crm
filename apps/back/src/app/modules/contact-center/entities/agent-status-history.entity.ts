import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AgentStatusEnum } from '../enums/agent-status.enum';

/**
 * Agent Status History Entity
 * Stores historical status changes for contact center agents
 * Each row represents a single status change event
 */
@Entity('agent_status_history')
export class AgentStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * User ID from users table
   */
  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: number | null;

  /**
   * SIP extension/username
   */
  @Column({ length: 50 })
  @Index()
  extension: string;

  /**
   * Full name of the agent
   */
  @Column({ name: 'full_name', length: 255, nullable: true })
  fullName: string | null;

  /**
   * Status that was set
   */
  @Column({
    type: 'varchar',
    length: 50,
  })
  @Index()
  status: AgentStatusEnum;

  /**
   * Previous status before this change
   */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'previous_status',
    nullable: true,
  })
  previousStatus: AgentStatusEnum | null;

  /**
   * Reason for status change
   */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /**
   * Queue name at the time of status change
   */
  @Column({ name: 'queue_name', length: 100, nullable: true })
  queueName: string | null;

  /**
   * When this status was set
   */
  @Column({
    type: 'timestamp',
    name: 'status_changed_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index()
  statusChangedAt: Date;

  /**
   * When this record was created
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
