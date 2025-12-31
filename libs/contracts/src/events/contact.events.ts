import { BaseEventPayload, DomainEvent } from './base.event';

export const CONTACT_EVENTS = {
  CREATED: 'contact.created',
  UPDATED: 'contact.updated',
  DELETED: 'contact.deleted',
  MERGED: 'contact.merged',
} as const;

export const COMPANY_EVENTS = {
  CREATED: 'company.created',
  UPDATED: 'company.updated',
  DELETED: 'company.deleted',
} as const;

export type ContactEventType = typeof CONTACT_EVENTS[keyof typeof CONTACT_EVENTS];
export type CompanyEventType = typeof COMPANY_EVENTS[keyof typeof COMPANY_EVENTS];

export interface ContactCreatedPayload extends BaseEventPayload {
  contactId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyId?: number;
}

export interface ContactUpdatedPayload extends BaseEventPayload {
  contactId: number;
  changes: Record<string, unknown>;
}

export interface ContactDeletedPayload extends BaseEventPayload {
  contactId: number;
}

export interface ContactMergedPayload extends BaseEventPayload {
  primaryContactId: number;
  mergedContactIds: number[];
}

export interface CompanyCreatedPayload extends BaseEventPayload {
  companyId: number;
  name: string;
  domain?: string;
}

export interface CompanyUpdatedPayload extends BaseEventPayload {
  companyId: number;
  changes: Record<string, unknown>;
}

export interface CompanyDeletedPayload extends BaseEventPayload {
  companyId: number;
}

export type ContactCreatedEvent = DomainEvent<ContactCreatedPayload>;
export type ContactUpdatedEvent = DomainEvent<ContactUpdatedPayload>;
export type ContactDeletedEvent = DomainEvent<ContactDeletedPayload>;
export type ContactMergedEvent = DomainEvent<ContactMergedPayload>;

export type CompanyCreatedEvent = DomainEvent<CompanyCreatedPayload>;
export type CompanyUpdatedEvent = DomainEvent<CompanyUpdatedPayload>;
export type CompanyDeletedEvent = DomainEvent<CompanyDeletedPayload>;

export type ContactEvent =
  | ContactCreatedEvent
  | ContactUpdatedEvent
  | ContactDeletedEvent
  | ContactMergedEvent;

export type CompanyEvent =
  | CompanyCreatedEvent
  | CompanyUpdatedEvent
  | CompanyDeletedEvent;
