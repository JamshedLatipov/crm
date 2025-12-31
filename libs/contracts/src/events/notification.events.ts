import { BaseEventPayload, DomainEvent } from './base.event';

export const NOTIFICATION_EVENTS = {
  SENT: 'notification.sent',
  DELIVERED: 'notification.delivered',
  READ: 'notification.read',
  FAILED: 'notification.failed',
  BROADCAST: 'notification.broadcast',
} as const;

export type NotificationEventType = typeof NOTIFICATION_EVENTS[keyof typeof NOTIFICATION_EVENTS];

export interface NotificationSentPayload extends BaseEventPayload {
  notificationId: number;
  type: string;
  channel: string;
  recipientId: string;
  title: string;
}

export interface NotificationDeliveredPayload extends BaseEventPayload {
  notificationId: number;
  recipientId: string;
  channel: string;
  deliveredAt: string;
}

export interface NotificationReadPayload extends BaseEventPayload {
  notificationId: number;
  recipientId: string;
  readAt: string;
}

export interface NotificationFailedPayload extends BaseEventPayload {
  notificationId: number;
  recipientId: string;
  channel: string;
  failureReason: string;
}

export interface NotificationBroadcastPayload extends BaseEventPayload {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  recipientIds: string[];
}

export type NotificationSentEvent = DomainEvent<NotificationSentPayload>;
export type NotificationDeliveredEvent = DomainEvent<NotificationDeliveredPayload>;
export type NotificationReadEvent = DomainEvent<NotificationReadPayload>;
export type NotificationFailedEvent = DomainEvent<NotificationFailedPayload>;
export type NotificationBroadcastEvent = DomainEvent<NotificationBroadcastPayload>;

export type NotificationEvent =
  | NotificationSentEvent
  | NotificationDeliveredEvent
  | NotificationReadEvent
  | NotificationFailedEvent
  | NotificationBroadcastEvent;
