/**
 * Event Bus - Centralized event publishing and subscription helpers
 * Used for event-driven architecture between microservices
 */

import { ClientProxy } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { BaseEventPayload, createEvent, DomainEvent } from './base.event';

export class EventBus {
  private readonly logger: Logger;

  constructor(
    private readonly client: ClientProxy,
    private readonly serviceName: string,
  ) {
    this.logger = new Logger(`EventBus:${serviceName}`);
  }

  /**
   * Emit an event to RabbitMQ
   */
  emit<T extends BaseEventPayload>(
    eventType: string,
    payload: T,
    options?: {
      correlationId?: string;
      userId?: number;
    },
  ): void {
    try {
      const event = createEvent(eventType, this.serviceName, payload, options);
      this.client.emit(eventType, event);
      this.logger.debug(`Event emitted: ${eventType}`, { eventId: event.eventId });
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to emit event ${eventType}: ${error.message}`);
    }
  }

  /**
   * Send an RPC request and wait for response
   */
  async send<TRequest, TResponse>(
    pattern: string,
    data: TRequest,
  ): Promise<TResponse> {
    try {
      this.logger.debug(`Sending RPC: ${pattern}`);
      const result = await this.client.send<TResponse, TRequest>(pattern, data).toPromise();
      return result as TResponse;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`RPC failed for ${pattern}: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Event types used across services
 */
export const EVENT_TYPES = {
  // Task events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',
  TASK_OVERDUE: 'task.overdue',
  TASK_REMINDER: 'task.reminder',

  // Call events
  CALL_STARTED: 'call.started',
  CALL_ANSWERED: 'call.answered',
  CALL_ENDED: 'call.ended',
  CALL_RECORDING_AVAILABLE: 'call.recordingAvailable',
  CALL_QUEUED: 'call.queued',
  CALL_TRANSFERRED: 'call.transferred',

  // Lead events
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_ASSIGNED: 'lead.assigned',
  LEAD_CONVERTED: 'lead.converted',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_DISQUALIFIED: 'lead.disqualified',

  // Deal events
  DEAL_CREATED: 'deal.created',
  DEAL_UPDATED: 'deal.updated',
  DEAL_WON: 'deal.won',
  DEAL_LOST: 'deal.lost',
  DEAL_STAGE_CHANGED: 'deal.stageChanged',

  // Contact events
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
  CONTACT_DELETED: 'contact.deleted',

  // Notification events
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_DELIVERED: 'notification.delivered',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_FAILED: 'notification.failed',

  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGGED_IN: 'user.loggedIn',
  USER_LOGGED_OUT: 'user.loggedOut',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

/**
 * Cross-service event routing configuration
 * Maps events to services that should handle them
 */
export const EVENT_HANDLERS: Record<string, string[]> = {
  [EVENT_TYPES.TASK_ASSIGNED]: ['notification-service'],
  [EVENT_TYPES.TASK_OVERDUE]: ['notification-service'],
  [EVENT_TYPES.TASK_COMPLETED]: ['notification-service'],

  [EVENT_TYPES.CALL_STARTED]: ['notification-service'],
  [EVENT_TYPES.CALL_ENDED]: ['notification-service', 'task-service'],
  [EVENT_TYPES.CALL_RECORDING_AVAILABLE]: ['notification-service'],

  [EVENT_TYPES.LEAD_ASSIGNED]: ['notification-service', 'task-service'],
  [EVENT_TYPES.LEAD_CONVERTED]: ['notification-service', 'deal-service'],

  [EVENT_TYPES.DEAL_WON]: ['notification-service'],
  [EVENT_TYPES.DEAL_LOST]: ['notification-service'],
  [EVENT_TYPES.DEAL_STAGE_CHANGED]: ['notification-service', 'task-service'],

  [EVENT_TYPES.CONTACT_CREATED]: ['task-service'],
};

/**
 * Helper to create typed event payloads
 */
export function createTypedEvent<T extends BaseEventPayload>(
  eventType: EventType,
  source: string,
  payload: T,
  options?: { correlationId?: string; userId?: number },
): DomainEvent<T> {
  return createEvent(eventType, source, payload, options);
}
