import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  LEAD_ASSIGNED = 'lead_assigned',
  LEAD_VIEWED = 'lead_viewed',
  LEAD_UPDATED = 'lead_updated',
  LEAD_UNASSIGNED = 'lead_unassigned',
  CALL_STARTED = 'call_started',
  CALL_ENDED = 'call_ended',
  DEAL_ASSIGNED = 'deal_assigned',
  DEAL_UNASSIGNED = 'deal_unassigned',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UNASSIGNED = 'task_unassigned',
  DEAL_CREATED = 'deal_created',
  DEAL_UPDATED = 'deal_updated',
  CONTACT_CREATED = 'contact_created',
  CONTACT_UPDATED = 'contact_updated',
  PASSWORD_CHANGED = 'password_changed',
  PROFILE_UPDATED = 'profile_updated',
  ROLE_CHANGED = 'role_changed',
  SKILLS_UPDATED = 'skills_updated',
  TERRITORIES_UPDATED = 'territories_updated'
}

@Entity('user_activities')
export class UserActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ActivityType
  })
  type: ActivityType;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('text', { nullable: true })
  description: string;

  @Column('inet', { nullable: true })
  ipAddress: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}