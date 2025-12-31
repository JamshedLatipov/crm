import { BaseEventPayload, DomainEvent } from './base.event';
import { UserRole } from '../constants';

// Event Types
export const USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
  LOGGED_IN: 'user.loggedIn',
  LOGGED_OUT: 'user.loggedOut',
  PASSWORD_CHANGED: 'user.passwordChanged',
  ROLE_CHANGED: 'user.roleChanged',
  WORKLOAD_CHANGED: 'user.workloadChanged',
  AVAILABILITY_CHANGED: 'user.availabilityChanged',
} as const;

export type UserEventType = typeof USER_EVENTS[keyof typeof USER_EVENTS];

// Event Payloads
export interface UserCreatedPayload extends BaseEventPayload {
  userId: number;
  username: string;
  email?: string;
  roles: string[];
}

export interface UserUpdatedPayload extends BaseEventPayload {
  userId: number;
  changes: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    department: string;
    timezone: string;
    isActive: boolean;
  }>;
}

export interface UserDeletedPayload extends BaseEventPayload {
  userId: number;
  username: string;
}

export interface UserLoggedInPayload extends BaseEventPayload {
  userId: number;
  username: string;
  ip?: string;
  userAgent?: string;
}

export interface UserLoggedOutPayload extends BaseEventPayload {
  userId: number;
  username: string;
}

export interface UserRoleChangedPayload extends BaseEventPayload {
  userId: number;
  previousRoles: string[];
  newRoles: string[];
}

export interface UserWorkloadChangedPayload extends BaseEventPayload {
  userId: number;
  entityType: 'lead' | 'deal' | 'task';
  previousCount: number;
  newCount: number;
  maxCapacity: number;
}

export interface UserAvailabilityChangedPayload extends BaseEventPayload {
  userId: number;
  isAvailableForAssignment: boolean;
  reason?: string;
}

// Typed Domain Events
export type UserCreatedEvent = DomainEvent<UserCreatedPayload>;
export type UserUpdatedEvent = DomainEvent<UserUpdatedPayload>;
export type UserDeletedEvent = DomainEvent<UserDeletedPayload>;
export type UserLoggedInEvent = DomainEvent<UserLoggedInPayload>;
export type UserLoggedOutEvent = DomainEvent<UserLoggedOutPayload>;
export type UserRoleChangedEvent = DomainEvent<UserRoleChangedPayload>;
export type UserWorkloadChangedEvent = DomainEvent<UserWorkloadChangedPayload>;
export type UserAvailabilityChangedEvent = DomainEvent<UserAvailabilityChangedPayload>;

export type UserEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | UserRoleChangedEvent
  | UserWorkloadChangedEvent
  | UserAvailabilityChangedEvent;
