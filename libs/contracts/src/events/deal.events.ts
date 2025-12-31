import { BaseEventPayload, DomainEvent } from './base.event';

export const DEAL_EVENTS = {
  CREATED: 'deal.created',
  UPDATED: 'deal.updated',
  DELETED: 'deal.deleted',
  ASSIGNED: 'deal.assigned',
  STAGE_CHANGED: 'deal.stageChanged',
  WON: 'deal.won',
  LOST: 'deal.lost',
  VALUE_CHANGED: 'deal.valueChanged',
} as const;

export type DealEventType = typeof DEAL_EVENTS[keyof typeof DEAL_EVENTS];

export interface DealCreatedPayload extends BaseEventPayload {
  dealId: number;
  title: string;
  value?: number;
  currency?: string;
  contactId?: number;
  companyId?: number;
  leadId?: number; // Source lead if converted
  stageId?: number;
}

export interface DealUpdatedPayload extends BaseEventPayload {
  dealId: number;
  changes: Record<string, unknown>;
}

export interface DealDeletedPayload extends BaseEventPayload {
  dealId: number;
}

export interface DealAssignedPayload extends BaseEventPayload {
  dealId: number;
  assigneeId: number;
  previousAssigneeId?: number;
  assignedBy?: number;
}

export interface DealStageChangedPayload extends BaseEventPayload {
  dealId: number;
  previousStageId: number;
  newStageId: number;
  previousStageName: string;
  newStageName: string;
}

export interface DealWonPayload extends BaseEventPayload {
  dealId: number;
  value: number;
  currency: string;
  closedAt: string;
}

export interface DealLostPayload extends BaseEventPayload {
  dealId: number;
  reason?: string;
  closedAt: string;
}

export interface DealValueChangedPayload extends BaseEventPayload {
  dealId: number;
  previousValue: number;
  newValue: number;
  currency: string;
}

export type DealCreatedEvent = DomainEvent<DealCreatedPayload>;
export type DealUpdatedEvent = DomainEvent<DealUpdatedPayload>;
export type DealDeletedEvent = DomainEvent<DealDeletedPayload>;
export type DealAssignedEvent = DomainEvent<DealAssignedPayload>;
export type DealStageChangedEvent = DomainEvent<DealStageChangedPayload>;
export type DealWonEvent = DomainEvent<DealWonPayload>;
export type DealLostEvent = DomainEvent<DealLostPayload>;
export type DealValueChangedEvent = DomainEvent<DealValueChangedPayload>;

export type DealEvent =
  | DealCreatedEvent
  | DealUpdatedEvent
  | DealDeletedEvent
  | DealAssignedEvent
  | DealStageChangedEvent
  | DealWonEvent
  | DealLostEvent
  | DealValueChangedEvent;
