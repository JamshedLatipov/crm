/**
 * Common shared types
 * Used across the application
 */

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  field: string;
  direction: SortDirection;
}

export interface FilterOptions {
  q?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  page?: number;
  limit?: number;
}

/**
 * WebSocket message wrapper
 */
export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp?: string;
}

/**
 * AMI Event types (Asterisk Manager Interface)
 */
export interface AmiEvent {
  Event: string;
  [key: string]: string | number | undefined;
}

export interface AmiChannelEvent extends AmiEvent {
  Channel?: string;
  ChannelState?: string;
  ChannelStateDesc?: string;
  CallerIDNum?: string;
  CallerIDName?: string;
  ConnectedLineNum?: string;
  ConnectedLineName?: string;
  Uniqueid?: string;
  Duration?: string;
  Seconds?: string;
}

export interface AmiQueueMemberEvent extends AmiEvent {
  Event: 'QueueMember';
  Queue?: string;
  Name?: string;
  Location?: string;
  StateInterface?: string;
  Status?: string;
  Paused?: string | number;
  InCall?: string | number;
}

export interface AmiQueueEntryEvent extends AmiEvent {
  Event: 'QueueEntry';
  Queue?: string;
  Channel?: string;
  Position?: string;
  Wait?: string;
}

export interface AmiQueueParamsEvent extends AmiEvent {
  Event: 'QueueParams';
  Queue?: string;
  Calls?: string;
  Holdtime?: string;
  TalkTime?: string;
  Completed?: string;
  Abandoned?: string;
}
