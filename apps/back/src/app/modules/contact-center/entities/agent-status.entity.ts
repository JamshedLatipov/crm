import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AgentStatusEnum } from '../enums/agent-status.enum';

/**
 * Agent Status Entity
 * Tracks current status of contact center agents/operators
 * Used for real-time monitoring and reporting
 */
@Entity('agent_statuses')
export class AgentStatus {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * User ID from users table
   * Links status to a specific user account
   */
  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: number | null;

  /**
   * SIP extension/username
   * Primary identifier for the agent in telephony system
   */
  @Column({ length: 50, unique: true })
  @Index()
  extension: string;

  /**
   * Full name of the agent (for display purposes)
   */
  @Column({ name: 'full_name', length: 255, nullable: true })
  fullName: string | null;

  /**
   * Current status of the agent
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: AgentStatusEnum.OFFLINE,
  })
  @Index()
  status: AgentStatusEnum;

  /**
   * Previous status (before current)
   * Useful for tracking status transitions
   */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'previous_status',
    nullable: true,
  })
  previousStatus: AgentStatusEnum | null;

  /**
   * Reason for current status (e.g., "Lunch", "Meeting with manager")
   * Free text field for additional context
   */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /**
   * When the current status was set
   */
  @Column({
    type: 'timestamp',
    name: 'status_changed_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index()
  statusChangedAt: Date;

  /**
   * Duration in current status (in seconds)
   * Calculated field, updated by backend service
   */
  @Column({ name: 'status_duration_seconds', type: 'integer', default: 0 })
  statusDurationSeconds: number;

  /**
   * Total time in each status today (JSON object)
   * Example: { "online": 7200, "break": 1800, "wrap_up": 600 }
   */
  @Column({ type: 'json', name: 'time_in_statuses_today', nullable: true })
  timeInStatusesToday: Record<string, number> | null;

  /**
   * Current queue name (if assigned)
   */
  @Column({ name: 'queue_name', length: 100, nullable: true })
  queueName: string | null;

  /**
   * Current call unique ID (if on call)
   */
  @Column({ name: 'current_call_id', length: 100, nullable: true })
  currentCallId: string | null;

  /**
   * Average handle time for today (in seconds)
   */
  @Column({ name: 'avg_handle_time_today', type: 'integer', nullable: true })
  avgHandleTimeToday: number | null;

  /**
   * Number of calls handled today
   */
  @Column({ name: 'calls_today', type: 'integer', default: 0 })
  callsToday: number;

  /**
   * Is agent currently paused in queue (backward compatibility)
   */
  @Column({ type: 'boolean', default: false })
  paused: boolean;

  /**
   * Last activity timestamp (for detecting inactive agents)
   */
  @Column({
    type: 'timestamp',
    name: 'last_activity_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastActivityAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Get duration in current status (real-time calculation)
   */
  getCurrentStatusDuration(): number {
    const now = new Date();
    const diff = now.getTime() - this.statusChangedAt.getTime();
    return Math.floor(diff / 1000);
  }

  /**
   * Check if agent is available for calls
   */
  isAvailableForCalls(): boolean {
    return this.status === AgentStatusEnum.ONLINE && !this.paused;
  }

  /**
   * Check if status requires manual intervention (stuck states)
   */
  isStuckInStatus(maxMinutes: number = 60): boolean {
    const duration = this.getCurrentStatusDuration();
    const maxSeconds = maxMinutes * 60;
    
    // These statuses shouldn't last too long
    const temporaryStatuses = [
      AgentStatusEnum.WRAP_UP,
      AgentStatusEnum.ON_CALL,
    ];
    
    return temporaryStatuses.includes(this.status) && duration > maxSeconds;
  }
}
