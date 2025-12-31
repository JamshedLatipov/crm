import { BaseEventPayload, DomainEvent } from './base.event';

export const CALL_EVENTS = {
  STARTED: 'call.started',
  ANSWERED: 'call.answered',
  ENDED: 'call.ended',
  RECORDING_AVAILABLE: 'call.recordingAvailable',
  QUEUED: 'call.queued',
  TRANSFERRED: 'call.transferred',
} as const;

export type CallEventType = typeof CALL_EVENTS[keyof typeof CALL_EVENTS];

export interface CallStartedPayload extends BaseEventPayload {
  callId: string;
  uniqueId: string;
  callerNumber: string;
  calledNumber: string;
  direction: 'inbound' | 'outbound';
  queueName?: string;
  userId?: number;
}

export interface CallAnsweredPayload extends BaseEventPayload {
  callId: string;
  uniqueId: string;
  answeredBy?: string;
  userId?: number;
  waitTime?: number; // seconds
}

export interface CallEndedPayload extends BaseEventPayload {
  callId: string;
  uniqueId: string;
  duration: number; // seconds
  disposition: string;
  hangupCause?: string;
  recordingPath?: string;
}

export interface CallRecordingAvailablePayload extends BaseEventPayload {
  callId: string;
  uniqueId: string;
  recordingPath: string;
  duration: number;
  format: string;
}

export interface CallQueuedPayload extends BaseEventPayload {
  callId: string;
  uniqueId: string;
  queueName: string;
  position: number;
  callerNumber: string;
}

export interface CallTransferredPayload extends BaseEventPayload {
  callId: string;
  uniqueId: string;
  fromUser?: number;
  toUser?: number;
  toQueue?: string;
  transferType: 'blind' | 'attended';
}

export type CallStartedEvent = DomainEvent<CallStartedPayload>;
export type CallAnsweredEvent = DomainEvent<CallAnsweredPayload>;
export type CallEndedEvent = DomainEvent<CallEndedPayload>;
export type CallRecordingAvailableEvent = DomainEvent<CallRecordingAvailablePayload>;
export type CallQueuedEvent = DomainEvent<CallQueuedPayload>;
export type CallTransferredEvent = DomainEvent<CallTransferredPayload>;

export type CallEvent =
  | CallStartedEvent
  | CallAnsweredEvent
  | CallEndedEvent
  | CallRecordingAvailableEvent
  | CallQueuedEvent
  | CallTransferredEvent;
