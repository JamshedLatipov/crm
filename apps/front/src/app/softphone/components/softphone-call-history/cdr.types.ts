/**
 * CDR (Call Detail Record) Types
 * Based on Asterisk CDR format
 */

export interface CdrRecord {
  /** Unique call identifier */
  uniqueid: string;

  /** Caller ID number */
  clid: string;

  /** Source (caller) number */
  src: string;

  /** Destination (callee) number */
  dst: string;

  /** Dialplan context */
  dcontext: string;

  /** Channel name */
  channel: string;

  /** Destination channel name */
  dstchannel: string;

  /** Last application executed */
  lastapp: string;

  /** Last application data */
  lastdata: string;

  /** Call start time */
  calldate: string;

  /** Call answer time */
  answerdate?: string;

  /** Call hangup time */
  hangupdate?: string;

  /** Call duration in seconds */
  duration: number;

  /** Billed duration in seconds */
  billsec: number;

  /** Call disposition */
  disposition: 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED' | 'CONGESTION' | 'CHANUNAVAIL';

  /** AMA flags */
  amaflags: number;

  /** Account code */
  accountcode: string;

  /** User field */
  userfield: string;

  /** Peer account */
  peeraccount?: string;

  /** Linked ID */
  linkedid?: string;

  /** Sequence number */
  sequence?: number;

  /** Ring time in seconds */
  ringtime?: number;
}

export interface CdrQuery {
  /** Maximum number of records to return */
  limit?: number;

  /** Number of records to skip */
  offset?: number;

  /** Start date filter (ISO string) */
  startDate?: string;

  /** End date filter (ISO string) */
  endDate?: string;

  /** Filter by source number */
  src?: string;

  /** Filter by destination number */
  dst?: string;

  /** Filter by disposition */
  disposition?: string;

  /** Filter by account code */
  accountcode?: string;

  /** Sort field */
  sortBy?: 'calldate' | 'duration' | 'src' | 'dst';

  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

export interface CdrResponse {
  /** Array of CDR records */
  records: CdrRecord[];

  /** Total number of records matching the query */
  total: number;

  /** Current page number */
  page?: number;

  /** Total number of pages */
  totalPages?: number;

  /** Number of records per page */
  limit?: number;

  /** Number of records skipped */
  offset?: number;
}

export interface CdrStatistics {
  /** Total number of calls */
  totalCalls: number;

  /** Number of answered calls */
  answeredCalls: number;

  /** Number of missed calls */
  missedCalls: number;

  /** Average call duration in seconds */
  averageDuration: number;

  /** Total call duration in seconds */
  totalDuration: number;

  /** Call success rate (0-1) */
  successRate: number;

  /** Peak calling hours */
  peakHours?: {
    hour: number;
    callCount: number;
  }[];

  /** Calls by disposition */
  dispositionBreakdown: {
    [key: string]: number;
  };

  /** Calls by day of week */
  weeklyBreakdown?: {
    [key: string]: number;
  };
}

/**
 * Legacy call history item type (for backward compatibility)
 */
export interface CallHistoryItem {
  id: string;
  number: string;
  contactName?: string;
  contactId?: string;
  type: 'incoming' | 'outgoing';
  status: 'completed' | 'missed' | 'failed';
  duration: string;
  timestamp: Date;
  notes?: string;
}