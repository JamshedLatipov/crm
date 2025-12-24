import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, LessThanOrEqual } from 'typeorm';
import { QueueMember } from '../calls/entities/queue-member.entity';
import { Queue } from '../calls/entities/queue.entity';
import { Cdr } from '../calls/entities/cdr.entity';
import { AmiService } from '../ami/ami.service';

export type OperatorStatus = {
  id: string;
  name: string;
  extension?: string;
  status: 'idle' | 'on_call' | 'wrap_up' | 'offline';
  currentCall?: string | null;
  currentCallDuration?: number | null;
  avgHandleTime?: number | null;
  callsToday?: number;
  pausedReason?: string | null;
  queue?: string | null;
};

export type QueueStatus = {
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
};

export type ActiveCall = {
  uniqueid: string;
  channel: string;
  callerIdNum: string;
  callerIdName: string;
  duration: number;
  state: string;
  operator?: string;
  queue?: string;
};

@Injectable()
export class ContactCenterService {
  private readonly logger = new Logger(ContactCenterService.name);
  private amiCache: {
    channels?: any[];
    queueStatus?: Map<string, any[]>;
    lastUpdate?: number;
  } = {};

  constructor(
    @InjectRepository(QueueMember) private readonly membersRepo: Repository<QueueMember>,
    @InjectRepository(Queue) private readonly queueRepo: Repository<Queue>,
    @InjectRepository(Cdr) private readonly cdrRepo: Repository<Cdr>,
    private readonly amiService: AmiService,
  ) {}

  // Refresh AMI data cache
  private async refreshAmiCache() {
    const now = Date.now();
    // Cache for 2 seconds to avoid hammering AMI
    if (this.amiCache.lastUpdate && now - this.amiCache.lastUpdate < 2000) {
      return;
    }

    try {
      // Get active channels
      const channels = await this.getActiveChannels();
      this.amiCache.channels = channels;
      this.logger.debug(`Cached ${channels.length} active channels`);

      // Get queue status for each queue
      const queues = await this.queueRepo.find();
      const queueStatusMap = new Map<string, any[]>();
      
      for (const queue of queues) {
        try {
          const events = await this.getQueueStatusFromAMI(queue.name);
          if (events && events.length > 0) {
            this.logger.debug(`Queue ${queue.name}: collected ${events.length} events`);
            queueStatusMap.set(queue.name, events);
          }
        } catch (err) {
          this.logger.warn(`Failed to get status for queue ${queue.name}:`, err);
        }
      }
      
      this.amiCache.queueStatus = queueStatusMap;
      this.amiCache.lastUpdate = now;
    } catch (err) {
      this.logger.error('Failed to refresh AMI cache:', err);
    }
  }

  // Get active channels from AMI
  private async getActiveChannels(): Promise<any[]> {
    try {
      const response = await this.amiService.action('CoreShowChannels', {});
      if (response && Array.isArray(response)) {
        return response.filter(ch => ch.Event === 'CoreShowChannel');
      }
      return [];
    } catch (err) {
      this.logger.warn('Failed to get active channels:', err);
      return [];
    }
  }

  // Get queue status from AMI
  private async getQueueStatusFromAMI(queueName: string): Promise<any[]> {
    try {
      const events: any[] = [];
      
      // Create a promise that collects all events
      const eventPromise = new Promise<any[]>((resolve) => {
        let collected: any[] = [];
        const timeout = setTimeout(() => {
          resolve(collected);
        }, 1000); // 1 second timeout
        
        // Listen for events temporarily
        const handler = (evt: any) => {
          const eventName = evt?.Event || evt?.event;
          // Collect queue-related events
          if (eventName && (eventName.startsWith('Queue') || eventName === 'QueueParams' || eventName === 'QueueMember' || eventName === 'QueueEntry')) {
            collected.push(evt);
          }
          // Stop collecting when we get Complete event
          if (eventName === 'QueueStatusComplete') {
            clearTimeout(timeout);
            resolve(collected);
          }
        };
        
        // Get AMI client
        const client = this.amiService.getClient();
        if (!client) {
          clearTimeout(timeout);
          resolve([]);
          return;
        }
        
        client.on('event', handler);
        
        // Clean up after timeout
        setTimeout(() => {
          client.off('event', handler);
        }, 1500);
      });
      
      // Send the action
      await this.amiService.action('QueueStatus', { Queue: queueName });
      
      // Wait for events to be collected
      const collectedEvents = await eventPromise;
      
      this.logger.debug(`Collected ${collectedEvents.length} events for queue ${queueName}`);
      
      return collectedEvents;
    } catch (err) {
      this.logger.warn(`Failed to get queue status for ${queueName}:`, err);
      return [];
    }
  }

  // Return operators based on queue_members table enriched with real-time AMI data
  async getOperatorsSnapshot(): Promise<OperatorStatus[]> {
    await this.refreshAmiCache();
    
    const members = await this.membersRepo.find();
    const channels = this.amiCache.channels || [];
    
    this.logger.debug(`Found ${members.length} queue members`);
    
    // Get call counts for last 24 hours (not just today since 00:00)
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    
    const operators: OperatorStatus[] = [];
    
    for (const m of members) {
      // Find active channel for this operator
      const operatorInterface = m.iface || m.member_interface || m.member_name;
      if (!operatorInterface) {
        this.logger.debug(`Skipping member ${m.id} - no interface found`);
        continue;
      }
      
      this.logger.debug(`Processing member: ${m.member_name || m.id}, interface: ${operatorInterface}, queue: ${m.queue_name}`);
      
      const memberChannel = channels.find(ch => 
        ch.Channel?.includes(operatorInterface) || 
        ch.CallerIDNum === operatorInterface.split('/')[1]
      );

      // Determine status
      let status: OperatorStatus['status'] = 'idle';
      let currentCall: string | null = null;
      let currentCallDuration: number | null = null;

      if (m.paused) {
        status = 'offline';
      } else if (memberChannel) {
        status = 'on_call';
        currentCall = memberChannel.CallerIDNum || 'Unknown';
        currentCallDuration = memberChannel.Seconds || 0;
      }

      // Get today's call statistics
      // CDR channel field contains full channel name like "PJSIP/1001-00000042"
      // We need to search by operator interface pattern (e.g., "PJSIP/1001")
      const extension = operatorInterface.split('/')[1] || operatorInterface;
      const channelPattern = `%${operatorInterface}%`;
      
      this.logger.debug(`Searching CDR for operator ${operatorInterface} with pattern: ${channelPattern}, last 24h: ${last24h.toISOString()}`);
      
      const callsToday = await this.cdrRepo.count({
        where: [
          {
            channel: Like(channelPattern),
            calldate: Between(last24h, new Date()),
            disposition: 'ANSWERED',
          },
          {
            dstchannel: Like(channelPattern),
            calldate: Between(last24h, new Date()),
            disposition: 'ANSWERED',
          },
        ],
      });

      this.logger.debug(`Operator ${operatorInterface} handled ${callsToday} calls today (pattern: ${channelPattern})`);

      // Calculate average handle time (last 10 calls)
      const recentCalls = await this.cdrRepo.find({
        where: [
          { 
            channel: Like(channelPattern),
            disposition: 'ANSWERED',
          },
          { 
            dstchannel: Like(channelPattern),
            disposition: 'ANSWERED',
          },
        ],
        order: { calldate: 'DESC' },
        take: 10,
      });

      this.logger.debug(`Found ${recentCalls.length} recent calls for operator ${operatorInterface}`);

      const avgHandleTime = recentCalls.length > 0
        ? Math.round(recentCalls.reduce((sum, c) => sum + (c.billsec || c.duration), 0) / recentCalls.length)
        : null;

      this.logger.debug(`Operator ${operatorInterface} avg handle time: ${avgHandleTime}s from ${recentCalls.length} recent calls`);

      operators.push({
        id: m.member_name || String(m.id),
        name: m.memberid || m.member_name || 'Unknown',
        extension: operatorInterface.split('/')[1] || operatorInterface,
        status,
        currentCall,
        currentCallDuration,
        avgHandleTime,
        callsToday,
        pausedReason: m.paused ? (m.reason_paused || 'Paused') : null,
        queue: m.queue_name,
      });
    }

    return operators;
  }

  // Return queues with real-time statistics from AMI
  async getQueuesSnapshot(): Promise<QueueStatus[]> {
    await this.refreshAmiCache();
    
    const queues = await this.queueRepo.find();
    const members = await this.membersRepo.find();
    const queueStatusMap = this.amiCache.queueStatus || new Map();
    
    // Get calls for last 24 hours (not just today since 00:00)
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    
    const result: QueueStatus[] = [];
    
    for (const q of queues) {
      const qm = members.filter((m) => m.queue_name === q.name);
      const availableMembers = qm.filter((m) => !m.paused).length;
      const totalMembers = qm.length;

      // Get real-time data from AMI cache
      const amiEvents = queueStatusMap.get(q.name);
      let waiting = 0;
      let callsInService = 0;
      let longestWaitingSeconds = 0;

      if (amiEvents && amiEvents.length > 0) {
        this.logger.debug(`Processing ${amiEvents.length} AMI events for queue ${q.name}`);
        
        // Look for QueueParams event (summary info)
        const paramsEvent = amiEvents.find((e: any) => e.Event === 'QueueParams');
        if (paramsEvent) {
          // Calls = total calls in queue (waiting)
          // Completed = completed calls today
          // Abandoned = abandoned calls today  
          // ServiceLevel = service level percentage
          // Holdtime = longest hold time in seconds
          waiting = parseInt(paramsEvent.Calls || '0', 10);
          longestWaitingSeconds = parseInt(paramsEvent.Holdtime || '0', 10);
          this.logger.debug(`Queue ${q.name} QueueParams: Calls=${waiting}, Holdtime=${longestWaitingSeconds}`);
        }
        
        // Look for QueueEntry events (callers waiting in queue)
        const entryEvents = amiEvents.filter((e: any) => e.Event === 'QueueEntry');
        if (entryEvents.length > 0) {
          waiting = entryEvents.length;
          this.logger.debug(`Queue ${q.name}: ${waiting} callers in QueueEntry events`);
        }
        
        // Count calls in service (QueueMember events with InCall > 0)
        const memberEvents = amiEvents.filter((e: any) => e.Event === 'QueueMember');
        callsInService = memberEvents.filter((m: any) => parseInt(m.InCall || '0', 10) > 0).length;
        this.logger.debug(`Queue ${q.name}: ${callsInService} calls in service from ${memberEvents.length} members`);
      }

      // Get abandoned calls for last 24h
      const abandonedToday = await this.cdrRepo.count({
        where: {
          lastapp: 'Queue',
          lastdata: Like(`%${q.name}%`),
          disposition: 'NO ANSWER',
          calldate: Between(last24h, new Date()),
        },
      });

      // Calculate service level (calls answered within 20 seconds / total calls)
      const answeredCalls = await this.cdrRepo.count({
        where: {
          lastapp: 'Queue',
          lastdata: Like(`%${q.name}%`),
          disposition: 'ANSWERED',
          calldate: Between(last24h, new Date()),
          duration: LessThanOrEqual(20),
        },
      });

      const totalCalls = await this.cdrRepo.count({
        where: {
          lastapp: 'Queue',
          lastdata: Like(`%${q.name}%`),
          calldate: Between(last24h, new Date()),
        },
      });

      const serviceLevel = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

      // Total answered calls in last 24h
      const answeredCallsToday = await this.cdrRepo.count({
        where: {
          lastapp: 'Queue',
          lastdata: Like(`%${q.name}%`),
          disposition: 'ANSWERED',
          calldate: Between(last24h, new Date()),
        },
      });

      result.push({
        id: String(q.id),
        name: q.name,
        waiting,
        longestWaitingSeconds,
        callsInService,
        availableMembers,
        totalMembers,
        serviceLevel,
        abandonedToday,
        totalCallsToday: totalCalls,
        answeredCallsToday,
      });
    }
    
    return result;
  }

  // Get active calls
  async getActiveCalls(): Promise<ActiveCall[]> {
    await this.refreshAmiCache();
    
    const channels = this.amiCache.channels || [];
    const activeCalls: ActiveCall[] = [];

    for (const ch of channels) {
      if (!ch.Channel || ch.ChannelStateDesc === 'Down') continue;

      activeCalls.push({
        uniqueid: ch.Uniqueid || ch.Channel,
        channel: ch.Channel,
        callerIdNum: ch.CallerIDNum || 'Unknown',
        callerIdName: ch.CallerIDName || '',
        duration: parseInt(ch.Seconds || '0', 10),
        state: ch.ChannelStateDesc || 'Unknown',
        operator: ch.ConnectedLineNum || undefined,
        queue: ch.Application === 'Queue' ? ch.ApplicationData : undefined,
      });
    }

    return activeCalls;
  }

  // For compatibility with the gateway polling logic, provide an async tick that returns current snapshots.
  async tick() {
    const [operators, queues, activeCalls] = await Promise.all([
      this.getOperatorsSnapshot(),
      this.getQueuesSnapshot(),
      this.getActiveCalls(),
    ]);
    
    return { operators, queues, activeCalls };
  }

  // Debug methods
  async getDebugCdrSample(limit: number = 10) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const recentCalls = await this.cdrRepo.find({
      where: {
        calldate: Between(today, new Date()),
      },
      order: { calldate: 'DESC' },
      take: limit,
    });

    return {
      total: recentCalls.length,
      todayStart: today.toISOString(),
      calls: recentCalls.map(c => ({
        calldate: c.calldate,
        channel: c.channel,
        dstchannel: c.dstchannel,
        disposition: c.disposition,
        duration: c.duration,
        billsec: c.billsec,
        src: c.src,
        dst: c.dst,
        lastapp: c.lastapp,
        lastdata: c.lastdata,
      })),
    };
  }

  async getDebugCdrAll(limit: number = 10) {
    const recentCalls = await this.cdrRepo.find({
      order: { calldate: 'DESC' },
      take: limit,
    });

    return {
      total: recentCalls.length,
      calls: recentCalls.map(c => ({
        calldate: c.calldate,
        channel: c.channel,
        dstchannel: c.dstchannel,
        disposition: c.disposition,
        duration: c.duration,
        billsec: c.billsec,
        src: c.src,
        dst: c.dst,
        lastapp: c.lastapp,
        lastdata: c.lastdata,
      })),
    };
  }

  async getDebugMembers() {
    const members = await this.membersRepo.find();
    return {
      total: members.length,
      members: members.map(m => ({
        id: m.id,
        queue_name: m.queue_name,
        member_name: m.member_name,
        member_interface: m.member_interface,
        iface: m.iface,
        memberid: m.memberid,
        paused: m.paused,
      })),
    };
  }

}
