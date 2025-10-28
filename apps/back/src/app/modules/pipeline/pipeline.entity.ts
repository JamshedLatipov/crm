import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum StageType {
  LEAD_QUALIFICATION = 'lead_qualification',
  DEAL_PROGRESSION = 'deal_progression',
  WON_STAGE = 'won_stage',
  LOST_STAGE = 'lost_stage'
}

export enum AutomationTrigger {
  DEAL_CREATED = 'deal_created',
  DEAL_UPDATED = 'deal_updated',
  DEAL_STAGE_CHANGED = 'deal_stage_changed',
  DEAL_AMOUNT_CHANGED = 'deal_amount_changed',
  DEAL_STATUS_CHANGED = 'deal_status_changed',
  DEAL_ASSIGNED = 'deal_assigned',
  DEAL_DUE_DATE_APPROACHING = 'deal_due_date_approaching',
  DEAL_OVERDUE = 'deal_overdue',
  LEAD_CREATED = 'lead_created',
  LEAD_UPDATED = 'lead_updated',
  LEAD_STATUS_CHANGED = 'lead_status_changed',
  LEAD_ASSIGNED = 'lead_assigned',
  LEAD_SCORE_CHANGED = 'lead_score_changed',
  TIME_BASED = 'time_based'
}

export enum AutomationCondition {
  STAGE_EQUALS = 'stage_equals',
  STAGE_NOT_EQUALS = 'stage_not_equals',
  STATUS_EQUALS = 'status_equals',
  STATUS_NOT_EQUALS = 'status_not_equals',
  AMOUNT_GREATER_THAN = 'amount_greater_than',
  AMOUNT_LESS_THAN = 'amount_less_than',
  AMOUNT_BETWEEN = 'amount_between',
  PROBABILITY_GREATER_THAN = 'probability_greater_than',
  PROBABILITY_LESS_THAN = 'probability_less_than',
  ASSIGNED_TO_EQUALS = 'assigned_to_equals',
  ASSIGNED_TO_NOT_EQUALS = 'assigned_to_not_equals',
  TAGS_CONTAIN = 'tags_contain',
  TAGS_NOT_CONTAIN = 'tags_not_contain',
  SOURCE_EQUALS = 'source_equals',
  SOURCE_NOT_EQUALS = 'source_not_equals',
  PRIORITY_EQUALS = 'priority_equals',
  PRIORITY_NOT_EQUALS = 'priority_not_equals',
  SCORE_GREATER_THAN = 'score_greater_than',
  SCORE_LESS_THAN = 'score_less_than',
  CREATED_WITHIN_DAYS = 'created_within_days',
  UPDATED_WITHIN_HOURS = 'updated_within_hours',
  NO_ACTIVITY_FOR_DAYS = 'no_activity_for_days',
  CUSTOM_FIELD_EQUALS = 'custom_field_equals',
  CUSTOM_FIELD_CONTAINS = 'custom_field_contains'
}

export enum AutomationAction {
  CHANGE_STAGE = 'change_stage',
  CHANGE_STATUS = 'change_status',
  ASSIGN_TO_USER = 'assign_to_user',
  ASSIGN_TO_ROLE = 'assign_to_role',
  UPDATE_AMOUNT = 'update_amount',
  UPDATE_PROBABILITY = 'update_probability',
  UPDATE_SCORE = 'update_score',
  ADD_TAGS = 'add_tags',
  REMOVE_TAGS = 'remove_tags',
  SEND_NOTIFICATION = 'send_notification',
  CREATE_TASK = 'create_task',
  UPDATE_CUSTOM_FIELD = 'update_custom_field',
  SEND_EMAIL = 'send_email',
  CREATE_FOLLOW_UP = 'create_follow_up',
  ESCALATE_TO_MANAGER = 'escalate_to_manager',
  SET_REMINDER = 'set_reminder',
  LOG_ACTIVITY = 'log_activity'
}

export interface AutomationConditionRule {
  field: AutomationCondition;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'not_contains';
  value: string | number | boolean | string[];
  value2?: string | number;
}

export interface AutomationActionRule {
  type: AutomationAction;
  config: Record<string, unknown>;
}

@Entity('pipeline_stages')
export class PipelineStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: StageType,
    default: StageType.DEAL_PROGRESSION,
  })
  type: StageType;

  @Column({ default: 0 })
  position: number;

  @Column({ default: 50 })
  probability: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('pipeline_leads')
export class PipelineLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  contact: string | null;

  @Column({ type: 'uuid', nullable: true })
  stageId: string | null;

  @Column({ type: 'json', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: AutomationTrigger,
  })
  trigger: AutomationTrigger;

  @Column({ type: 'json' })
  conditions: AutomationConditionRule[];

  @Column({ type: 'json' })
  actions: AutomationActionRule[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt: Date | null;

  @Column({ default: 0 })
  triggerCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
