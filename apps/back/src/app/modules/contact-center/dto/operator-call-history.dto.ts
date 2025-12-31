export interface OperatorCallHistoryDto {
  id: string;
  timestamp: Date;
  callerIdNum: string;
  callerIdName?: string;
  duration: number;
  waitTime: number;
  queue: string;
  disposition: 'answered' | 'missed' | 'abandoned';
  recordingUrl?: string;
}

export interface OperatorStatusHistoryDto {
  timestamp: Date;
  status: string;
  duration: number;
  reason?: string;
}

export interface OperatorStatsDto {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  avgWaitTime: number;
  totalTalkTime: number;
  avgHandleTime: number;
  firstCallResolution: number;
  satisfaction: number;
}

export interface OperatorDetailsDto {
  operator: {
    id: string;
    name: string;
    fullName?: string;
    extension: string;
    status: string;
    currentCall?: {
      callerIdNum: string;
      callerIdName?: string;
      duration: number;
    };
  };
  stats: OperatorStatsDto;
  callHistory: OperatorCallHistoryDto[];
  statusHistory: OperatorStatusHistoryDto[];
}
