/**
 * Contact Center shared types
 * Used by both backend and frontend
 */

export interface OperatorStatus {
  id: string;
  name: string;
  fullName?: string | null;
  extension?: string;
  status: 'idle' | 'on_call' | 'wrap_up' | 'offline';
  currentCall?: string | null;
  currentCallDuration?: number | null;
  statusDuration?: number | null;
  avgHandleTime?: number | null;
  callsToday?: number;
  pausedReason?: string | null;
  queue?: string | null;
}

export interface QueueStatus {
  id: string;
  name: string;
  waiting: number;
  longestWaitingSeconds: number;
  callsInService: number;
  availableMembers: number;
  totalMembers: number;
  serviceLevel?: number;
  abandonedToday?: number;
  totalCallsToday?: number;
  answeredCallsToday?: number;
}

export interface ActiveCall {
  uniqueid: string;
  channel: string;
  callerIdNum: string;
  callerIdName: string;
  duration: number;
  state: string;
  operator?: string;
  queue?: string;
}

export interface ContactCenterStats {
  totalUniqueWaiting: number;
}

export interface AgentStatusChangeEvent {
  extension: string;
  status: string;
  previousStatus?: string;
  reason?: string;
  fullName?: string;
  userId?: number;
  statusChangedAt?: string;
}

export type QueueEventType = 
  | 'queue:call_entered' 
  | 'queue:call_answered' 
  | 'queue:call_abandoned' 
  | 'queue:member_added' 
  | 'queue:member_removed';

export interface QueueEvent {
  type: QueueEventType;
  queueName: string;
  data: Record<string, unknown>;
  timestamp?: string;
}
