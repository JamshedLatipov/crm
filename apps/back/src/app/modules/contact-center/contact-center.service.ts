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
  statusDuration?: number | null; // Время в текущем статусе (в секундах)
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
  private async refreshAmiCache(force = false) {
    const now = Date.now();
    // Cache for 1 second to avoid hammering AMI (reduced from 2s)
    if (!force && this.amiCache.lastUpdate && now - this.amiCache.lastUpdate < 1000) {
      this.logger.debug(`Using cached AMI data (age: ${now - this.amiCache.lastUpdate}ms)`);
      return;
    }

    this.logger.debug('Refreshing AMI cache...');

    try {
      // Get active channels
      const channels = await this.getActiveChannels();
      this.amiCache.channels = channels;

      // Get queue status for each queue
      const queues = await this.queueRepo.find();
      const queueStatusMap = new Map<string, any[]>();
      
      for (const queue of queues) {
        try {
          const events = await this.getQueueStatusFromAMI(queue.name);
          if (events && events.length > 0) {
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
      const events: any[] = [];
      
      // Create a promise that collects all events
      const eventPromise = new Promise<any[]>((resolve) => {
        let collected: any[] = [];
        const timeout = setTimeout(() => {
          this.logger.debug(`getActiveChannels: Timeout reached, collected ${collected.length} events`);
          resolve(collected);
        }, 1000); // 1 second timeout
        
        // Listen for events temporarily
        const handler = (evt: any) => {
          const eventName = evt?.Event || evt?.event;
          // Collect CoreShowChannel events
          if (eventName === 'CoreShowChannel') {
            collected.push(evt);
          }
          // Stop collecting when we get Complete event
          if (eventName === 'CoreShowChannelsComplete') {
            this.logger.debug(`getActiveChannels: Complete event received, collected ${collected.length} channels`);
            clearTimeout(timeout);
            resolve(collected);
          }
        };
        
        // Get AMI client
        const client = this.amiService.getClient();
        if (!client) {
          this.logger.warn('getActiveChannels: AMI client not available');
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
      this.logger.debug('getActiveChannels: Sending CoreShowChannels action');
      await this.amiService.action('CoreShowChannels', {});
      
      // Wait for events to be collected
      const collectedChannels = await eventPromise;
      
      this.logger.debug(`getActiveChannels: Returning ${collectedChannels.length} channels`);
      if (collectedChannels.length > 0) {
        this.logger.debug(`Sample channel (full data): ${JSON.stringify(collectedChannels[0], null, 2)}`);
      }
      
      return collectedChannels;
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
      
      return collectedEvents;
    } catch (err) {
      this.logger.warn(`Failed to get queue status for ${queueName}:`, err);
      return [];
    }
  }

  // Return operators based on queue_members table enriched with real-time AMI data
  async getOperatorsSnapshot(): Promise<OperatorStatus[]> {
    this.logger.debug('=== getOperatorsSnapshot() START ===');
    await this.refreshAmiCache();
    
    const members = await this.membersRepo.find();
    const channels = this.amiCache.channels || [];
    
    this.logger.debug(`getOperatorsSnapshot: Found ${members.length} members, ${channels.length} active channels`);
    if (channels.length > 0) {
      this.logger.debug('=== ACTIVE CHANNELS DUMP ===');
      channels.forEach((ch, idx) => {
        this.logger.debug(`  Channel ${idx}: ${ch.Channel} | CallerIDNum: ${ch.CallerIDNum} | ConnectedLineNum: ${ch.ConnectedLineNum} | State: ${ch.ChannelStateDesc} | Seconds: ${ch.Seconds}`);
      });
      this.logger.debug('=== END CHANNELS DUMP ===');
    }
    
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
      
      this.logger.debug(`Looking for channel for operator: ${m.memberid}, interface: ${operatorInterface}`);
      
      // Более детальное логирование для отладки
      const extension = operatorInterface.split('/')[1];
      this.logger.debug(`  Extension extracted: ${extension}`);
      
      const memberChannel = channels.find(ch => {
        // Проверяем несколько условий для более надежного поиска
        const channelMatch = ch.Channel?.includes(operatorInterface);
        const extensionMatch = ch.Channel?.includes(`/${extension}-`);
        const callerIdMatch = ch.CallerIDNum === extension;
        
        this.logger.debug(`    Checking channel ${ch.Channel}: channelMatch=${channelMatch}, extensionMatch=${extensionMatch}, callerIdMatch=${callerIdMatch}`);
        
        return channelMatch || extensionMatch || callerIdMatch;
      });
      
      if (memberChannel) {
        this.logger.debug(`✅ Found channel for ${m.memberid}`);
        this.logger.debug(`   Full channel data: ${JSON.stringify(memberChannel, null, 2)}`);
      } else {
        this.logger.debug(`❌ No active channel found for ${m.memberid}`);
      }

      // Determine status
      let status: OperatorStatus['status'] = 'idle';
      let currentCall: string | null = null;
      let currentCallDuration: number | null = null;
      let statusDuration: number | null = null;

      if (m.paused) {
        status = 'offline';
        // Для offline: пока не можем точно определить время паузы без дополнительного поля в БД
        // TODO: Добавить поле paused_since в таблицу queue_members для отслеживания времени паузы
        statusDuration = null;
        this.logger.debug(`Operator ${m.memberid} is offline/paused`);
      } else if (memberChannel) {
        status = 'on_call';
        currentCall = memberChannel.CallerIDNum || 'Unknown';
        
        // Парсим длительность из строки формата "HH:MM:SS" в секунды
        const parseDuration = (durationStr: string): number => {
          if (!durationStr) return 0;
          const parts = durationStr.split(':');
          if (parts.length === 3) {
            const hours = parseInt(parts[0], 10) || 0;
            const minutes = parseInt(parts[1], 10) || 0;
            const seconds = parseInt(parts[2], 10) || 0;
            return hours * 3600 + minutes * 60 + seconds;
          }
          return parseInt(durationStr, 10) || 0;
        };
        
        // Проверяем различные поля для длительности
        const durationValue = memberChannel.Duration || memberChannel.duration || '0';
        
        // Конвертируем в секунды
        currentCallDuration = typeof durationValue === 'string' 
          ? parseDuration(durationValue) 
          : durationValue;
        
        // Для статуса "на звонке" statusDuration = длительность звонка
        statusDuration = currentCallDuration;
        
        this.logger.debug(`🔥 Channel duration: Duration=${memberChannel.Duration}, parsed=${currentCallDuration}s`);
        this.logger.debug(`Operator ${m.memberid} on call: ${currentCall}, duration: ${currentCallDuration}s, statusDuration: ${statusDuration}s`);
      } else {
        // Для idle status можно добавить отслеживание времени простоя
        // TODO: Добавить отслеживание времени в idle статусе
        status = 'idle';
        statusDuration = null;
      }

      // Get today's call statistics
      // CDR channel field contains full channel name like "PJSIP/1001-00000042"
      // We need to search by operator interface pattern (e.g., "PJSIP/1001")
      const channelPattern = `%${operatorInterface}%`;
      
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

      const avgHandleTime = recentCalls.length > 0
        ? Math.round(recentCalls.reduce((sum, c) => sum + (c.billsec || c.duration), 0) / recentCalls.length)
        : null;

      // Для idle/offline: рассчитываем время с последнего звонка
      if (statusDuration === null && recentCalls.length > 0) {
        const lastCallTime = recentCalls[0].calldate;
        if (lastCallTime) {
          const now = new Date();
          const timeSinceLastCall = Math.floor((now.getTime() - lastCallTime.getTime()) / 1000);
          statusDuration = timeSinceLastCall;
          this.logger.debug(`Operator ${m.memberid}: ${status}, time since last call: ${timeSinceLastCall}s`);
        }
      }

      const operatorData = {
        id: m.member_name || String(m.id),
        name: m.memberid || m.member_name || 'Unknown',
        extension: operatorInterface.split('/')[1] || operatorInterface,
        status,
        currentCall,
        currentCallDuration,
        statusDuration,
        avgHandleTime,
        callsToday,
        pausedReason: m.paused ? (m.reason_paused || 'Paused') : null,
        queue: m.queue_name,
      };
      
      this.logger.debug(`  ✅ Operator: ${operatorData.name} | status: ${status} | statusDuration: ${statusDuration} | currentCallDuration: ${currentCallDuration}`);
      operators.push(operatorData);
    }

    this.logger.debug(`=== getOperatorsSnapshot() END - Returning ${operators.length} operators ===`);
    return operators;
  }

  // Return queues with real-time statistics from AMI
  async getQueuesSnapshot(): Promise<QueueStatus[]> {
    this.logger.debug('=== getQueuesSnapshot() called ===');
    await this.refreshAmiCache();
    
    const queues = await this.queueRepo.find();
    const members = await this.membersRepo.find();
    const queueStatusMap = this.amiCache.queueStatus || new Map();
    
    // Get active channels for validation
    const activeChannels = new Set<string>();
    (this.amiCache.channels || []).forEach((ch: any) => {
      if (ch.Channel && ch.ChannelStateDesc !== 'Down') {
        activeChannels.add(ch.Channel);
      }
    });
    
    this.logger.debug(`Found ${queues.length} queues, ${queueStatusMap.size} have AMI data, ${activeChannels.size} active channels`);
    
    // Get calls for last 24 hours (not just today since 00:00)
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    
    // Track which channels/members are already assigned to queues to avoid double-counting
    const assignedChannels = new Set<string>();
    const assignedMembers = new Set<string>(); // Track member interfaces (PJSIP/operator1, etc.)
    
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
        // Look for QueueEntry events (callers waiting in queue) - most accurate
        const entryEvents = amiEvents.filter((e: any) => e.Event === 'QueueEntry');
        
        // Count unique channels only:
        // 1. Must be in active channels (not a stale/closed channel)
        // 2. Not already assigned to another queue
        const uniqueChannels = new Set<string>();
        const staleChannels: string[] = [];
        
        entryEvents.forEach((e: any) => {
          if (!e.Channel) return;
          
          // Skip if channel is not active (stale data from Asterisk)
          if (!activeChannels.has(e.Channel)) {
            staleChannels.push(e.Channel);
            return;
          }
          
          // Skip if already assigned to another queue
          if (assignedChannels.has(e.Channel)) {
            return;
          }
          
          uniqueChannels.add(e.Channel);
          assignedChannels.add(e.Channel);
        });
        
        waiting = uniqueChannels.size;
        
        // Log entry events for debugging
        if (entryEvents.length > 0) {
          const duplicates = entryEvents.filter((e: any) => e.Channel && assignedChannels.has(e.Channel) && !uniqueChannels.has(e.Channel)).length;
          this.logger.debug(`Queue ${q.name}: ${entryEvents.length} QueueEntry, ${uniqueChannels.size} unique, ${staleChannels.length} stale, ${duplicates} in other queues`);
          
          if (staleChannels.length > 0) {
            this.logger.warn(`Queue ${q.name} has ${staleChannels.length} stale channels: ${staleChannels.join(', ')}`);
          }
        }
        
        // Look for QueueParams event for additional info (longest wait time)
        const paramsEvent = amiEvents.find((e: any) => e.Event === 'QueueParams');
        if (paramsEvent) {
          // Use Holdtime for longest waiting time
          longestWaitingSeconds = parseInt(paramsEvent.Holdtime || '0', 10);
          
          // Log params for debugging
          this.logger.debug(`Queue ${q.name} QueueParams: Calls=${paramsEvent.Calls}, Max=${paramsEvent.Max}, Completed=${paramsEvent.Completed}, Abandoned=${paramsEvent.Abandoned}, ServiceLevel=${paramsEvent.ServiceLevel}, Holdtime=${paramsEvent.Holdtime}s`);
          
          // Only use Calls from QueueParams if we don't have QueueEntry events
          if (waiting === 0 && paramsEvent.Calls) {
            const paramsWaiting = parseInt(paramsEvent.Calls || '0', 10);
            this.logger.debug(`Queue ${q.name}: No QueueEntry events, using QueueParams.Calls=${paramsWaiting}`);
            waiting = paramsWaiting;
          }
        }
        
        // Count calls in service - but only count each member once across all queues
        const memberEvents = amiEvents.filter((e: any) => e.Event === 'QueueMember');
        let localCallsInService = 0;
        
        memberEvents.forEach((m: any) => {
          const inCall = parseInt(m.InCall || '0', 10);
          if (inCall > 0 && m.Name) {
            // Only count if this member hasn't been counted in another queue
            if (!assignedMembers.has(m.Name)) {
              localCallsInService += inCall;
              assignedMembers.add(m.Name);
            }
          }
        });
        
        callsInService = localCallsInService;
        
        // Summary log for this queue
        this.logger.debug(`Queue ${q.name} summary: waiting=${waiting}, callsInService=${callsInService}`);
      } else {
        this.logger.debug(`Queue ${q.name}: No AMI events available`);
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
    
    // Collect all unique waiting channels to avoid double-counting
    const allWaitingChannels = new Set<string>();
    for (const q of queues) {
      const amiEvents = queueStatusMap.get(q.name);
      if (amiEvents && amiEvents.length > 0) {
        const entryEvents = amiEvents.filter((e: any) => e.Event === 'QueueEntry');
        entryEvents.forEach((e: any) => {
          if (e.Channel) {
            allWaitingChannels.add(e.Channel);
          }
        });
      }
    }
    
    // Log total waiting calls across all queues
    const totalWaiting = result.reduce((sum, q) => sum + q.waiting, 0);
    const uniqueWaiting = allWaitingChannels.size;
    this.logger.debug(`Total waiting: ${totalWaiting} (sum across queues), ${uniqueWaiting} unique channels`);
    if (totalWaiting !== uniqueWaiting) {
      this.logger.warn(`⚠️ Mismatch detected: ${totalWaiting} total vs ${uniqueWaiting} unique waiting calls. Possible duplicate counting across queues.`);
    }
    
    // Log final result before returning
    this.logger.debug(`Returning ${result.length} queues with waiting values: [${result.map(q => `${q.name}:${q.waiting}`).join(', ')}]`);
    
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
    // Force refresh AMI cache to get latest data
    await this.refreshAmiCache(true);
    
    const [operators, queues, activeCalls] = await Promise.all([
      this.getOperatorsSnapshot(),
      this.getQueuesSnapshot(),
      this.getActiveCalls(),
    ]);
    
    // Calculate unique waiting calls across all queues
    const uniqueWaitingChannels = new Set<string>();
    const queueStatusMap = this.amiCache.queueStatus || new Map();
    for (const q of queues) {
      const amiEvents = queueStatusMap.get(q.name);
      if (amiEvents && amiEvents.length > 0) {
        const entryEvents = amiEvents.filter((e: any) => e.Event === 'QueueEntry');
        entryEvents.forEach((e: any) => {
          if (e.Channel) {
            uniqueWaitingChannels.add(e.Channel);
          }
        });
      }
    }
    
    const totalUniqueWaiting = uniqueWaitingChannels.size;
    this.logger.debug(`tick() result: ${totalUniqueWaiting} unique waiting calls across ${queues.length} queues`);
    
    return { operators, queues, activeCalls, totalUniqueWaiting };
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
