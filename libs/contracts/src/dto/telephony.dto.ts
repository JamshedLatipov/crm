import { IsString, IsOptional, IsNumber, IsEnum, IsObject, IsDateString, IsUUID, IsArray } from 'class-validator';

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  INTERNAL = 'internal',
}

export enum CallStatus {
  AWAITING_CDR = 'awaiting_cdr',
  RINGING = 'ringing',
  ANSWERED = 'answered',
  ENDED = 'ended',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  FAILED = 'failed',
}

export enum CallDisposition {
  ANSWERED = 'answered',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  CONGESTION = 'congestion',
  FAILED = 'failed',
  VOICEMAIL = 'voicemail',
}

export class OriginateCallDto {
  @IsString()
  from!: string; // Extension or phone number

  @IsString()
  to!: string; // Destination number

  @IsOptional()
  @IsString()
  callerId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsNumber()
  leadId?: number;

  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class HangupCallDto {
  @IsString()
  channelId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CallLogFilterDto {
  @IsOptional()
  @IsEnum(CallDirection)
  direction?: CallDirection;

  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;

  @IsOptional()
  @IsString()
  callerNumber?: string;

  @IsOptional()
  @IsString()
  calledNumber?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsNumber()
  minDuration?: number;

  @IsOptional()
  @IsNumber()
  maxDuration?: number;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class UpdateCallLogDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  disposition?: string;

  @IsOptional()
  @IsString()
  scriptBranch?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsNumber()
  leadId?: number;
}

export interface CallLogResponseDto {
  id: string;
  uniqueId?: string;
  direction?: CallDirection;
  callType?: string;
  status: CallStatus;
  callerNumber?: string;
  calledNumber?: string;
  duration?: number;
  disposition?: string;
  note?: string;
  scriptBranch?: string;
  recordingPath?: string;
  userId?: string;
  userName?: string;
  contactId?: string;
  contactName?: string;
  leadId?: number;
  dealId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CallLogListResponseDto {
  items: CallLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface QueueMemberDto {
  extension: string;
  name?: string;
  state: string;
  paused: boolean;
  callsTaken: number;
  lastCall?: string;
}

export interface QueueStatusDto {
  name: string;
  strategy: string;
  calls: number;
  completed: number;
  abandoned: number;
  holdtime: number;
  members: QueueMemberDto[];
}

export interface QueueListResponseDto {
  queues: QueueStatusDto[];
}

export class AddToQueueDto {
  @IsString()
  queueName!: string;

  @IsString()
  extension!: string;

  @IsOptional()
  @IsString()
  memberName?: string;

  @IsOptional()
  @IsNumber()
  penalty?: number;
}

export class RemoveFromQueueDto {
  @IsString()
  queueName!: string;

  @IsString()
  extension!: string;
}

export class PauseMemberDto {
  @IsString()
  queueName!: string;

  @IsString()
  extension!: string;

  @IsOptional()
  paused?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export interface CallStatsDto {
  total: number;
  answered: number;
  missed: number;
  avgDuration: number;
  avgWaitTime: number;
  inbound: number;
  outbound: number;
  byHour: { hour: number; count: number }[];
  byDay: { day: string; count: number }[];
}

export interface RecordingDto {
  id: string;
  callId: string;
  path: string;
  duration: number;
  format: string;
  size: number;
  createdAt: string;
}
