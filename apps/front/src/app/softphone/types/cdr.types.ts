export interface CdrRecord {
  id: string;
  uniqueid: string;
  calldate: string;
  clid: string;
  src: string;
  dst: string;
  dcontext: string;
  channel: string;
  dstchannel: string;
  lastapp: string;
  lastdata: string;
  duration: number;
  billsec: number;
  disposition: 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED';
  amaflags: number;
  accountcode: string;
  userfield: string;
  sequence: number;
  recordingfile?: string;
  operatorId?: string;
  notes?: string; // derived from userfield
}

export interface CdrQuery {
  page: number;
  limit: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  operatorId?: string;
}

export interface CdrResponse {
  data: CdrRecord[];
  total: number;
  page: number;
  limit: number;
}