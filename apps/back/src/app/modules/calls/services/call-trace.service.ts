import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    // 1. Fetch IVR Logs
    const ivrLogs = await this.ivrLogRepo.find({
      where: { channelId: uniqueId },
      order: { createdAt: 'ASC' },
    });

    // 2. Fetch Queue Logs
    const queueLogs = await this.queueLogRepo.find({
      where: { callid: uniqueId },
      order: { id: 'ASC' },
    });

    // 3. Fetch CDR
    const cdr = await this.cdrRepo.findOne({
      where: { uniqueid: uniqueId },
    });

    // 4. Fetch Manual/App Call Logs
    const appLogs = await this.callLogRepo.find({
      where: [
        { asteriskUniqueId: uniqueId },
        { callId: uniqueId }
      ],
      order: { createdAt: 'ASC' },
    });

    if (ivrLogs.length === 0 && queueLogs.length === 0 && !cdr && appLogs.length === 0) {
      return null;
    }

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
      // timestamp is string unix time in seconds (or sometimes formatted string depending on asterisk config)
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

    // CDR Event (usually represents the end/summary)
    if (cdr) {
      timeline.push({
        timestamp: cdr.calldate, // This is usually start time. End time = calldate + duration
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
        // TRANSFER(extension|context|remotetime|localposition) -> data1 is extension
        summary.transferTarget = transfer.data1 || undefined;
    }

    if (enterQueue) {
      summary.queueEntered = true;
      summary.queueName = enterQueue.queuename;
    } else {
      // Check IVR for queue attempt
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
      summary.queueWaitTime = parseInt(connect.data1 || '0', 10); // holdtime
    }

    if (abandon) {
      summary.answered = false;
      summary.hangupBy = 'caller'; // Usually abandon means caller hung up
      summary.queueWaitTime = parseInt(abandon.data3 || '0', 10);
    }

    if (exitKey) {
       summary.answered = false;
       summary.hangupBy = 'caller_key';
       summary.queueWaitTime = parseInt(exitKey.data3 || '0', 10);
    }

    if (!summary.queueWaitTime && summary.queueEntered) {
        // Calculate manually if we have enter and leave events
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
