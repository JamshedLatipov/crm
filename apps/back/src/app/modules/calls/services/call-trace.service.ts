import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { IvrLog } from '../../ivr/entities/ivr-log.entity';
import { QueueLog } from '../entities/queuelog.entity';
import { Cdr } from '../entities/cdr.entity';
import { CallLog } from '../entities/call-log.entity';

export interface CallTrace {
  uniqueId: string;
  summary: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    caller: string;
    destination?: string;
    status: string; // 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED' | 'UNKNOWN'
    direction?: string;
    queueEntered: boolean;
    queueName?: string;
    queueWaitTime?: number;
    answered: boolean;
    agentAnswered?: string;
    agentAnswerTime?: Date;
    hangupBy?: string;
    ignoredAgents?: string[];
    wasTransferred?: boolean;
    transferTarget?: string;
  };
  timeline: CallEvent[];
}

export interface CallEvent {
  timestamp: Date;
  type: 'IVR' | 'QUEUE' | 'CDR' | 'CALL_LOG';
  event: string;
  details?: any;
}

@Injectable()
export class CallTraceService {
  constructor(
    @InjectRepository(IvrLog) private readonly ivrLogRepo: Repository<IvrLog>,
    @InjectRepository(QueueLog) private readonly queueLogRepo: Repository<QueueLog>,
    @InjectRepository(Cdr) private readonly cdrRepo: Repository<Cdr>,
    @InjectRepository(CallLog) private readonly callLogRepo: Repository<CallLog>,
  ) {}

  async getCallTrace(uniqueId: string): Promise<CallTrace | null> {
    const traces = await this.getCallTraces([uniqueId]);
    return traces[0] || null;
  }

  async getCallTraces(uniqueIds: string[], providedCdrs?: Cdr[]): Promise<CallTrace[]> {
    if (uniqueIds.length === 0) return [];

    // 1. Bulk Fetch
    // Optimized: Split CallLogs query to avoid OR scan, then merge
    const [ivrLogs, queueLogs, callLogsById, callLogsByCallId] = await Promise.all([
      this.ivrLogRepo.find({
        where: { channelId: In(uniqueIds) },
        order: { createdAt: 'ASC' },
      }),
      this.queueLogRepo.find({
        where: { callid: In(uniqueIds) },
        order: { id: 'ASC' },
      }),
      this.callLogRepo.find({
        where: { asteriskUniqueId: In(uniqueIds) },
        order: { createdAt: 'ASC' },
      }),
      this.callLogRepo.find({
        where: { callId: In(uniqueIds) },
        order: { createdAt: 'ASC' },
      })
    ]);

    // Merge and deduplicate call logs
    const allCallLogs = [...callLogsById, ...callLogsByCallId];
    const uniqueCallLogs = Array.from(new Map(allCallLogs.map(item => [item.id, item])).values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    let cdrs: Cdr[] = [];
    if (providedCdrs) {
        cdrs = providedCdrs;
    } else {
        cdrs = await this.cdrRepo.find({
            where: { uniqueid: In(uniqueIds) }
        });
    }

    // 2. Group by UniqueId using Maps for O(1) lookup
    const ivrMap = new Map<string, IvrLog[]>();
    ivrLogs.forEach(log => {
      if (!ivrMap.has(log.channelId)) ivrMap.set(log.channelId, []);
      ivrMap.get(log.channelId)?.push(log);
    });

    const queueMap = new Map<string, QueueLog[]>();
    queueLogs.forEach(log => {
      if (!log.callid) return;
      if (!queueMap.has(log.callid)) queueMap.set(log.callid, []);
      queueMap.get(log.callid)?.push(log);
    });

    const cdrMap = new Map<string, Cdr>();
    cdrs.forEach(c => cdrMap.set(c.uniqueid, c));

    const appLogMap = new Map<string, CallLog[]>();
    uniqueCallLogs.forEach(log => {
      const uid = log.asteriskUniqueId || log.callId;
      if (!uid) return;
      // Handle potential cross-linking where uniqueId matches one but not the other
      // We'll trust the caller provided valid uniqueIds
      if (uniqueIds.includes(uid)) {
         if (!appLogMap.has(uid)) appLogMap.set(uid, []);
         appLogMap.get(uid)?.push(log);
      }
    });

    const traces: CallTrace[] = [];

    for (const uid of uniqueIds) {
        const myIvr = ivrMap.get(uid) || [];
        const myQueue = queueMap.get(uid) || [];
        const myCdr = cdrMap.get(uid);
        const myApp = appLogMap.get(uid) || [];

        if (myIvr.length === 0 && myQueue.length === 0 && !myCdr && myApp.length === 0) {
            continue;
        }

        traces.push(this.buildSingleTrace(uid, myIvr, myQueue, myCdr, myApp));
    }

    return traces;
  }

  private buildSingleTrace(uniqueId: string, ivrLogs: IvrLog[], queueLogs: QueueLog[], cdr: Cdr | undefined, appLogs: CallLog[]): CallTrace {
    // Build timeline
    const timeline: CallEvent[] = [];

    // IVR Events
    ivrLogs.forEach(log => {
      timeline.push({
        timestamp: log.createdAt,
        type: 'IVR',
        event: log.event,
        details: {
          nodeId: log.nodeId,
          nodeName: log.nodeName,
          digit: log.digit,
          meta: log.meta,
        },
      });
    });

    // Queue Events
    queueLogs.forEach(log => {
      const ts = this.parseQueueLogTime(log.time);
      timeline.push({
        timestamp: ts,
        type: 'QUEUE',
        event: log.event,
        details: {
          queue: log.queuename,
          agent: log.agent,
          data1: log.data1,
          data2: log.data2,
          data3: log.data3,
          data4: log.data4,
          data5: log.data5,
        },
      });
    });

    // CDR Event
    if (cdr) {
      timeline.push({
        timestamp: cdr.calldate,
        type: 'CDR',
        event: 'CDR_RECORD',
        details: cdr,
      });
    }

    // App Logs
    appLogs.forEach(log => {
      timeline.push({
        timestamp: log.createdAt,
        type: 'CALL_LOG',
        event: log.status,
        details: log,
      });
    });

    // Sort timeline
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Build summary
    const startTime = cdr?.calldate || ivrLogs[0]?.createdAt || (queueLogs.length > 0 ? this.parseQueueLogTime(queueLogs[0].time) : new Date());
    let endTime: Date | undefined;
    if (cdr) {
      endTime = new Date(cdr.calldate.getTime() + cdr.duration * 1000);
    } else if (timeline.length > 0) {
      endTime = timeline[timeline.length - 1].timestamp;
    }

    const summary: CallTrace['summary'] = {
      startTime,
      endTime,
      duration: cdr?.duration,
      caller: cdr?.clid || ivrLogs[0]?.caller || 'Unknown',
      destination: cdr?.dst || 'Unknown',
      status: cdr?.disposition || 'UNKNOWN',
      queueEntered: false,
      answered: false,
    };

    // Analyze Queue interaction
    const enterQueue = queueLogs.find(l => l.event === 'ENTERQUEUE');
    const connect = queueLogs.find(l => l.event === 'CONNECT' || l.event === 'AGENTCONNECT');
    const abandon = queueLogs.find(l => l.event === 'ABANDON');
    const exitKey = queueLogs.find(l => l.event === 'EXITWITHKEY');
    const transfer = queueLogs.find(l => l.event === 'TRANSFER' || l.event === 'BLINDTRANSFER' || l.event === 'ATTENDEDTRANSFER');

    const ignoredAgents: string[] = [];
    queueLogs.forEach(l => {
        if (l.event === 'RINGNOANSWER') {
            ignoredAgents.push(l.agent);
        }
    });
    if (ignoredAgents.length > 0) {
        summary.ignoredAgents = ignoredAgents;
    }

    if (transfer) {
        summary.wasTransferred = true;
        summary.transferTarget = transfer.data1 || undefined;
    }

    if (enterQueue) {
      summary.queueEntered = true;
      summary.queueName = enterQueue.queuename;
    } else {
      const ivrQueue = ivrLogs.find(l => l.event === 'QUEUE_ENTER');
      if (ivrQueue) {
        summary.queueEntered = true;
        summary.queueName = (ivrQueue.meta as any)?.queue;
      }
    }

    if (connect) {
      summary.answered = true;
      summary.agentAnswered = connect.agent;
      summary.agentAnswerTime = this.parseQueueLogTime(connect.time);
      summary.queueWaitTime = parseInt(connect.data1 || '0', 10);
    }

    if (abandon) {
      summary.answered = false;
      summary.hangupBy = 'caller';
      summary.queueWaitTime = parseInt(abandon.data3 || '0', 10);
    }

    if (exitKey) {
       summary.answered = false;
       summary.hangupBy = 'caller_key';
       summary.queueWaitTime = parseInt(exitKey.data3 || '0', 10);
    }

    if (!summary.queueWaitTime && summary.queueEntered) {
        const enter = timeline.find(e => e.type === 'QUEUE' && e.event === 'ENTERQUEUE');
        const leave = timeline.find(e => e.type === 'QUEUE' && (e.event === 'CONNECT' || e.event === 'ABANDON' || e.event === 'EXITWITHKEY' || e.event === 'EXITEMPTY'));
        if (enter && leave) {
            summary.queueWaitTime = Math.round((leave.timestamp.getTime() - enter.timestamp.getTime()) / 1000);
        }
    }

    return {
      uniqueId,
      summary,
      timeline,
    };
  }

  private parseQueueLogTime(timeStr?: string | null): Date {
    if (!timeStr) return new Date();
    // Assuming asterisk standard: seconds.microseconds or just seconds
    const parts = timeStr.split('.');
    const seconds = parseInt(parts[0], 10);
    const ms = parts[1] ? parseInt(parts[1].substring(0, 3), 10) : 0;
    // Check if it's already a date string (some configs do that)
    if (isNaN(seconds)) {
        const d = new Date(timeStr);
        return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date(seconds * 1000 + ms);
  }
}
