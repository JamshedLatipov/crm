import { BaseEventPayload, DomainEvent } from './base.event';

export const TASK_EVENTS = {
  CREATED: 'task.created',
  UPDATED: 'task.updated',
  DELETED: 'task.deleted',
  ASSIGNED: 'task.assigned',
  COMPLETED: 'task.completed',
  OVERDUE: 'task.overdue',
  REMINDER: 'task.reminder',
} as const;

export type TaskEventType = typeof TASK_EVENTS[keyof typeof TASK_EVENTS];

export interface TaskCreatedPayload extends BaseEventPayload {
  taskId: number;
  title: string;
  type?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: number;
  leadId?: number;
  dealId?: number;
  contactId?: number;
}

export interface TaskUpdatedPayload extends BaseEventPayload {
  taskId: number;
  changes: Record<string, unknown>;
}

export interface TaskDeletedPayload extends BaseEventPayload {
  taskId: number;
}

export interface TaskAssignedPayload extends BaseEventPayload {
  taskId: number;
  assigneeId: number;
  previousAssigneeId?: number;
  assignedBy?: number;
}

export interface TaskCompletedPayload extends BaseEventPayload {
  taskId: number;
  completedBy: number;
  completedAt: string;
  outcome?: string;
}

export interface TaskOverduePayload extends BaseEventPayload {
  taskId: number;
  dueDate: string;
  assigneeId?: number;
  overdueByHours: number;
}

export interface TaskReminderPayload extends BaseEventPayload {
  taskId: number;
  title: string;
  dueDate: string;
  assigneeId: number;
  reminderTime: string;
}

export type TaskCreatedEvent = DomainEvent<TaskCreatedPayload>;
export type TaskUpdatedEvent = DomainEvent<TaskUpdatedPayload>;
export type TaskDeletedEvent = DomainEvent<TaskDeletedPayload>;
export type TaskAssignedEvent = DomainEvent<TaskAssignedPayload>;
export type TaskCompletedEvent = DomainEvent<TaskCompletedPayload>;
export type TaskOverdueEvent = DomainEvent<TaskOverduePayload>;
export type TaskReminderEvent = DomainEvent<TaskReminderPayload>;

export type TaskEvent =
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskDeletedEvent
  | TaskAssignedEvent
  | TaskCompletedEvent
  | TaskOverdueEvent
  | TaskReminderEvent;
