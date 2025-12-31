import { BaseEventPayload, DomainEvent } from './base.event';

export const LEAD_EVENTS = {
  CREATED: 'lead.created',
  UPDATED: 'lead.updated',
  DELETED: 'lead.deleted',
  ASSIGNED: 'lead.assigned',
  UNASSIGNED: 'lead.unassigned',
  CONVERTED: 'lead.converted',
  STATUS_CHANGED: 'lead.statusChanged',
  SCORED: 'lead.scored',
  CAPTURED: 'lead.captured',
} as const;

export type LeadEventType = typeof LEAD_EVENTS[keyof typeof LEAD_EVENTS];

export interface LeadCreatedPayload extends BaseEventPayload {
  leadId: number;
  source?: string;
  contactId?: number;
  companyId?: number;
}

export interface LeadUpdatedPayload extends BaseEventPayload {
  leadId: number;
  changes: Record<string, unknown>;
}

export interface LeadDeletedPayload extends BaseEventPayload {
  leadId: number;
}

export interface LeadAssignedPayload extends BaseEventPayload {
  leadId: number;
  assigneeId: number;
  previousAssigneeId?: number;
  assignedBy?: number;
}

export interface LeadConvertedPayload extends BaseEventPayload {
  leadId: number;
  dealId: number;
  convertedBy: number;
}

export interface LeadStatusChangedPayload extends BaseEventPayload {
  leadId: number;
  previousStatus: string;
  newStatus: string;
}

export interface LeadScoredPayload extends BaseEventPayload {
  leadId: number;
  previousScore?: number;
  newScore: number;
  scoreFactors: Record<string, number>;
}

export interface LeadCapturedPayload extends BaseEventPayload {
  leadId: number;
  source: string;
  webhookData?: Record<string, unknown>;
}

export type LeadCreatedEvent = DomainEvent<LeadCreatedPayload>;
export type LeadUpdatedEvent = DomainEvent<LeadUpdatedPayload>;
export type LeadDeletedEvent = DomainEvent<LeadDeletedPayload>;
export type LeadAssignedEvent = DomainEvent<LeadAssignedPayload>;
export type LeadConvertedEvent = DomainEvent<LeadConvertedPayload>;
export type LeadStatusChangedEvent = DomainEvent<LeadStatusChangedPayload>;
export type LeadScoredEvent = DomainEvent<LeadScoredPayload>;
export type LeadCapturedEvent = DomainEvent<LeadCapturedPayload>;

export type LeadEvent =
  | LeadCreatedEvent
  | LeadUpdatedEvent
  | LeadDeletedEvent
  | LeadAssignedEvent
  | LeadConvertedEvent
  | LeadStatusChangedEvent
  | LeadScoredEvent
  | LeadCapturedEvent;
