/**
 * Base Event class for all domain events
 * Provides common metadata for event tracking and debugging
 */
export interface BaseEvent {
  /** Unique event ID for deduplication */
  eventId: string;
  
  /** Event type identifier */
  eventType: string;
  
  /** ISO timestamp when event was created */
  timestamp: string;
  
  /** Service that emitted the event */
  source: string;
  
  /** Correlation ID for request tracing */
  correlationId?: string;
  
  /** User ID who triggered the event (if applicable) */
  userId?: number;
  
  /** Event version for schema evolution */
  version: number;
}

export interface BaseEventPayload {
  [key: string]: unknown;
}

export interface DomainEvent<T extends BaseEventPayload = BaseEventPayload> extends BaseEvent {
  payload: T;
}

/**
 * Helper to create a domain event with common metadata
 */
export function createEvent<T extends BaseEventPayload>(
  eventType: string,
  source: string,
  payload: T,
  options?: {
    correlationId?: string;
    userId?: number;
    version?: number;
  }
): DomainEvent<T> {
  return {
    eventId: generateEventId(),
    eventType,
    timestamp: new Date().toISOString(),
    source,
    correlationId: options?.correlationId,
    userId: options?.userId,
    version: options?.version ?? 1,
    payload,
  };
}

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
