import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, LessThanOrEqual, Not, IsNull } from 'typeorm';
import { QueueMember } from '../calls/entities/queue-member.entity';
import { Queue } from '../calls/entities/queue.entity';
import { Cdr } from '../calls/entities/cdr.entity';
import { User } from '../user/user.entity';
import { AmiService } from '../ami/ami.service';

export type OperatorStatus = {
  id: string;
  name: string;
  fullName?: string | null; // ФИО пользователя, связанного с оператором
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
  private readonly CDR_LOOKBACK_MINUTES = 50; // Time window for CDR data analysis
  
  private amiCache: {
    channels?: any[];
    queueStatus?: Map<string, any[]>;
    registeredEndpoints?: Set<string>;
    lastUpdate?: number;
  } = {};

  constructor(
    @InjectRepository(QueueMember) private readonly membersRepo: Repository<QueueMember>,
    @InjectRepository(Queue) private readonly queueRepo: Repository<Queue>,
    @InjectRepository(Cdr) private readonly cdrRepo: Repository<Cdr>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly amiService: AmiService,
  ) {}

  // Refresh AMI data cache
  private async refreshAmiCache(force = false) {
    const now = Date.now();
    // Cache for 1 second to avoid hammering AMI (reduced from 2s)
    if (!force && this.amiCache.lastUpdate && now - this.amiCache.lastUpdate < 1000) {
      return;
    }

    try {
      // Get active channels
      const channels = await this.getActiveChannels();
      this.amiCache.channels = channels;

      // Get queue status for each queue (includes member status)
      const queues = await this.queueRepo.find();
      const queueStatusMap = new Map<string, any[]>();
      const registeredEndpoints = new Set<string>();
      
      for (const queue of queues) {
        try {
          const events = await this.getQueueStatusFromAMI(queue.name);
          if (events && events.length > 0) {
            queueStatusMap.set(queue.name, events);
            
            // Extract registered endpoints from QueueMember events
            // Status values: 0=unknown, 1=not in use (available), 2=in use, 5=unavailable, 6=ringing, 8=on hold
            events.forEach((evt: any) => {
              if (evt.Event === 'QueueMember') {
                const location = evt.Location || evt.StateInterface || evt.Name;
                const paused = evt.Paused === '1' || evt.Paused === 1;
                const status = parseInt(evt.Status || '0', 10);
                
                // Member is available if: not paused AND status is NOT unavailable (5)
                // Status 5 = AST_DEVICE_UNAVAILABLE means SIP not registered
                if (location && !paused && status !== 5) {
                  const endpoint = location.includes('/') ? location.split('/')[1] : location;
                  registeredEndpoints.add(endpoint);
                  registeredEndpoints.add(location);
                }
              }
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to get status for queue ${queue.name}:`, err);
        }
      }
      
      this.amiCache.queueStatus = queueStatusMap;
      this.amiCache.registeredEndpoints = registeredEndpoints;
      this.amiCache.lastUpdate = now;
    } catch (err) {
      this.logger.error('Failed to refresh AMI cache:', err);
    }
  }

  // Get active channels from AMI
  private async getActiveChannels(): Promise<any[]> {
    try {
      // Get AMI client first
      const client = this.amiService.getClient();
      if (!client) {
        this.logger.warn('getActiveChannels: AMI client not available');
        return [];
      }
      
      // Create a promise that collects all events
      const eventPromise = new Promise<any[]>((resolve, reject) => {
        let collected: any[] = [];
        let resolved = false;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            cleanup();
            resolve(collected);
          }
        }, 1000); // 1 second timeout
        
        // Listen for events temporarily
        const handler = (evt: any) => {
          if (resolved) return; // Ignore events after resolution
          
          const eventName = evt?.Event || evt?.event;
          // Collect CoreShowChannel events
          if (eventName === 'CoreShowChannel') {
            collected.push(evt);
          }
          // Stop collecting when we get Complete event
          if (eventName === 'CoreShowChannelsComplete') {
            cleanup();
            resolve(collected);
          }
        };
        
        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          client.off('event', handler);
        };
        
        client.on('event', handler);
      });
      
      // Send the action
      await this.amiService.action('CoreShowChannels', {});
      
      // Wait for events to be collected
      const collectedChannels = await eventPromise;
      return collectedChannels;
    } catch (err) {
      this.logger.warn('Failed to get active channels:', err);
      return [];
    }
  }

  // Get queue status from AMI
  private async getQueueStatusFromAMI(queueName: string): Promise<any[]> {
    try {
      // Get AMI client first
      const client = this.amiService.getClient();
      if (!client) {
        this.logger.warn(`getQueueStatusFromAMI: AMI client not available for queue ${queueName}`);
        return [];
      }
      
      // Create a promise that collects all events
      const eventPromise = new Promise<any[]>((resolve, reject) => {
        let collected: any[] = [];
        let resolved = false;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            cleanup();
            resolve(collected);
          }
        }, 1000); // 1 second timeout
        
        // Listen for events temporarily
        const handler = (evt: any) => {
          if (resolved) return; // Ignore events after resolution
          
          const eventName = evt?.Event || evt?.event;
          // Collect queue-related events
          if (eventName && (eventName.startsWith('Queue') || eventName === 'QueueParams' || eventName === 'QueueMember' || eventName === 'QueueEntry')) {
            collected.push(evt);
          }
          // Stop collecting when we get Complete event
          if (eventName === 'QueueStatusComplete') {
            cleanup();
            resolve(collected);
          }
        };
        
        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          client.off('event', handler);
        };
        
        client.on('event', handler);
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

  // Batch load all CDR data for the configured time window to avoid N+1 queries
  private async loadCdrDataBatch() {
    const lookbackTime = new Date();
    lookbackTime.setMinutes(lookbackTime.getMinutes() - this.CDR_LOOKBACK_MINUTES);
    
    // Load all CDR records for the configured time window in one query
    const allCdrRecords = await this.cdrRepo.find({
      where: {
        calldate: Between(lookbackTime, new Date()),
      },
      order: { calldate: 'DESC' },
    });
    
    return { allCdrRecords, lookbackTime };
  }

  // Return operators based on queue_members table enriched with real-time AMI data
  async getOperatorsSnapshot(): Promise<OperatorStatus[]> {
    // Load all data in parallel for better performance
    const [_, members, users, cdrData] = await Promise.all([
      this.refreshAmiCache(),
      this.membersRepo.find(),
      this.userRepo.find({
        select: ['id', 'sipEndpointId', 'firstName', 'lastName', 'username'],
      }),
      this.loadCdrDataBatch(),
    ]);
    
    const channels = this.amiCache.channels || [];
    const { allCdrRecords, lookbackTime } = cdrData;
    
    // Создаем маппинг sipEndpointId -> User и username -> User
    const userMap = new Map<string, User>();
    users.forEach(user => {
      if (user.sipEndpointId) {
        userMap.set(user.sipEndpointId, user);
      }
      // Также добавляем по username на случай если username совпадает с operator ID
      if (user.username) {
        userMap.set(user.username, user);
      }
    });
    
    this.logger.debug(`Loaded ${users.length} users, created mapping for ${userMap.size} entries`);
    
    const operators: OperatorStatus[] = [];
    const registeredEndpoints = this.amiCache.registeredEndpoints || new Set<string>();
    
    for (const m of members) {
      // Find active channel for this operator
      const operatorInterface = m.iface || m.member_interface || m.member_name;
      if (!operatorInterface) {
        continue;
      }
      
      // Извлекаем extension: если есть слеш (PJSIP/operator1), берем часть после слеша, иначе - весь operatorInterface
      const extension = operatorInterface.includes('/') 
        ? operatorInterface.split('/')[1] 
        : operatorInterface;
      
      // Ищем активный канал оператора с приоритетом:
      // 1. Прямое совпадение с interface (PJSIP/1001-xxxxx)
      // 2. ConnectedLineNum = extension (оператор принял звонок)
      // Канал должен быть в состоянии "Up" (активный разговор)
      const operatorChannels = channels.filter(ch => {
        const isActive = ch.ChannelStateDesc === 'Up' || ch.ChannelState === '6';
        if (!isActive) return false;
        
        const channelMatch = ch.Channel?.startsWith(operatorInterface + '-');
        const connectedLineMatch = ch.ConnectedLineNum === extension;
        
        // Исключаем Local/ каналы и другие служебные каналы
        const isServiceChannel = ch.Channel?.startsWith('Local/') || 
                                 ch.Channel?.includes('/park@') ||
                                 ch.Channel?.includes('/agent@');
        
        return (channelMatch || connectedLineMatch) && !isServiceChannel;
      });
      
      // Приоритет: канал, где оператор является источником (т.е. его interface в начале)
      const memberChannel = operatorChannels.find(ch => ch.Channel?.startsWith(operatorInterface + '-')) || 
                           operatorChannels[0] || 
                           null;

      // Determine status
      let status: OperatorStatus['status'] = 'idle';
      let currentCall: string | null = null;
      let currentCallDuration: number | null = null;
      let statusDuration: number | null = null;

      // Check if endpoint is registered in PJSIP
      const isRegistered = registeredEndpoints.has(extension);
      const interfaceWithoutChannel = operatorInterface.split('-')[0];
      const isRegisteredByInterface = registeredEndpoints.has(interfaceWithoutChannel);
      const actuallyRegistered = isRegistered || isRegisteredByInterface;

      if (m.paused) {
        status = 'offline';
        statusDuration = null;
      } else if (!actuallyRegistered) {
        // If endpoint is not registered, operator is offline
        status = 'offline';
        statusDuration = null;
      } else if (memberChannel) {
        // Дополнительная проверка: канал должен иметь CallerID или ConnectedLine
        const hasValidCall = (memberChannel.CallerIDNum && memberChannel.CallerIDNum !== extension) || 
                            (memberChannel.ConnectedLineNum && memberChannel.ConnectedLineNum !== extension);
        
        if (!hasValidCall) {
          status = 'idle';
          currentCall = null;
        } else {
          status = 'on_call';
          // Определяем номер звонящего: если CallerIDNum = extension, то звонок исходящий, берем ConnectedLineNum
          currentCall = (memberChannel.CallerIDNum === extension) 
            ? (memberChannel.ConnectedLineNum || 'Unknown')
            : (memberChannel.CallerIDNum || 'Unknown');
          
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
          
          // Проверяем различные поля для длительности в порядке приоритета:
          // 1. Duration (строка "HH:MM:SS" или число секунд)
          // 2. Seconds (число секунд)
          // 3. duration (альтернативное поле)
          let durationValue: string | number = '0';
          if (memberChannel.Duration !== undefined && memberChannel.Duration !== null) {
            durationValue = memberChannel.Duration;
          } else if (memberChannel.Seconds !== undefined && memberChannel.Seconds !== null) {
            durationValue = memberChannel.Seconds;
          } else if (memberChannel.duration !== undefined && memberChannel.duration !== null) {
            durationValue = memberChannel.duration;
          }
          
          // Конвертируем в секунды
          currentCallDuration = typeof durationValue === 'string' 
            ? parseDuration(durationValue) 
            : (typeof durationValue === 'number' ? durationValue : 0);
          
          // Для статуса "на звонке" statusDuration = длительность звонка
          statusDuration = currentCallDuration;
        }
      } else {
        // Для idle status можно добавить отслеживание времени простоя
        // Operator is registered but not on a call
        status = 'idle';
        statusDuration = null;
      }

      // Get today's call statistics from pre-loaded CDR data
      // Filter in memory instead of separate DB queries for each operator
      const operatorCdrRecords = allCdrRecords.filter(cdr => {
        const matchChannel = cdr.channel?.includes(operatorInterface);
        const matchDstChannel = cdr.dstchannel?.includes(operatorInterface);
        return (matchChannel || matchDstChannel) && cdr.disposition === 'ANSWERED';
      });
      
      const callsToday = operatorCdrRecords.length;

      // Calculate average handle time (last 10 calls) from filtered data
      const recentCalls = operatorCdrRecords.slice(0, 10);

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
        }
      }

      // Находим пользователя по extension (убирая PJSIP/ префикс)
      // Пробуем найти по extension, по полному operatorInterface, или по member_name
      const user = userMap.get(extension) || 
                   userMap.get(operatorInterface) || 
                   userMap.get(m.member_name || '');
      
      // Формируем fullName: приоритет - fullName пользователя, затем username, затем extension
      let fullName: string | null = null;
      if (user) {
        // Используем метод fullName из User entity, который обрабатывает firstName/lastName/username
        fullName = user.fullName;
        this.logger.debug(`Found user for ${extension}: ${fullName}`);
      } else {
        this.logger.debug(`No user found for ${extension} (operatorInterface: ${operatorInterface})`);
      }

      const operatorData = {
        id: m.member_name || String(m.id),
        name: m.memberid || m.member_name || 'Unknown',
        fullName,
        extension,
        status,
        currentCall,
        currentCallDuration,
        statusDuration,
        avgHandleTime,
        callsToday,
        pausedReason: m.paused ? (m.reason_paused || 'Paused') : null,
        queue: m.queue_name,
      };
      
      operators.push(operatorData);
    }

    return operators;
  }

  // Return queues with real-time statistics from AMI
  async getQueuesSnapshot(): Promise<QueueStatus[]> {
    // Load all data in parallel
    const [_, queues, members, cdrData] = await Promise.all([
      this.refreshAmiCache(),
      this.queueRepo.find(),
      this.membersRepo.find(),
      this.loadCdrDataBatch(),
    ]);
    
    const queueStatusMap = this.amiCache.queueStatus || new Map();
    const { allCdrRecords, lookbackTime } = cdrData;
    
    // Get active channels for validation
    const activeChannels = new Set<string>();
    (this.amiCache.channels || []).forEach((ch: any) => {
      if (ch.Channel && ch.ChannelStateDesc !== 'Down') {
        activeChannels.add(ch.Channel);
      }
    });
    
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
        
        // Look for QueueParams event for additional info (longest wait time)
        const paramsEvent = amiEvents.find((e: any) => e.Event === 'QueueParams');
        if (paramsEvent) {
          longestWaitingSeconds = parseInt(paramsEvent.Holdtime || '0', 10);
          
          // Only use Calls from QueueParams if we don't have QueueEntry events
          if (waiting === 0 && paramsEvent.Calls) {
            const paramsWaiting = parseInt(paramsEvent.Calls || '0', 10);
            waiting = paramsWaiting;
          }
        }
        
        // Count calls in service based on QueueMember events
        // Use InCall field which indicates if member is currently on a call
        const memberEvents = amiEvents.filter((e: any) => e.Event === 'QueueMember');
        let localCallsInService = 0;
        
        memberEvents.forEach((m: any) => {
          // InCall = 1 means member is on a call, InCall = 0 means available
          const inCall = parseInt(m.InCall || '0', 10);
          const memberName = m.Name || m.Location || m.StateInterface;
          
          if (inCall > 0 && memberName) {
            // Only count if this member hasn't been counted in another queue
            if (!assignedMembers.has(memberName)) {
              localCallsInService += 1;
              assignedMembers.add(memberName);
            }
          }
        });
        
        callsInService = localCallsInService;
        
        // Validate: callsInService should not exceed totalMembers
        if (callsInService > totalMembers) {
          callsInService = Math.min(callsInService, totalMembers);
        }
        
        // Validation checks
        if (waiting < 0) waiting = 0;
        if (callsInService < 0) callsInService = 0;
      }

      // Filter CDR records for this queue from pre-loaded data
      const queueCdrRecords = allCdrRecords.filter(cdr => 
        cdr.lastapp === 'Queue' && cdr.lastdata?.includes(q.name)
      );
      
      // Get abandoned calls for last 24h
      const abandonedToday = queueCdrRecords.filter(cdr => 
        cdr.disposition === 'NO ANSWER'
      ).length;

      // Calculate service level (calls answered within 20 seconds / total calls)
      const answeredCalls = queueCdrRecords.filter(cdr => 
        cdr.disposition === 'ANSWERED' && (cdr.duration || 0) <= 20
      ).length;

      const totalCalls = queueCdrRecords.length;

      const serviceLevel = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

      // Total answered calls in last 24h
      const answeredCallsToday = queueCdrRecords.filter(cdr => 
        cdr.disposition === 'ANSWERED'
      ).length;

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
    
    return result;
  }

  // Get active calls (only real calls, not service channels)
  async getActiveCalls(): Promise<ActiveCall[]> {
    await this.refreshAmiCache();
    
    const channels = this.amiCache.channels || [];
    const activeCalls: ActiveCall[] = [];
    const processedChannels = new Set<string>();

    for (const ch of channels) {
      // Skip invalid or down channels
      if (!ch.Channel || ch.ChannelStateDesc === 'Down') continue;
      
      // Skip service channels (Local/, park, agent, etc.)
      if (ch.Channel.startsWith('Local/') || 
          ch.Channel.includes('/park@') ||
          ch.Channel.includes('/agent@') ||
          ch.Channel.includes('/conference@')) {
        continue;
      }
      
      // Skip channels in states other than Up, Ring, or Ringing (exclude Rsrvd, etc.)
      const validStates = ['Up', 'Ring', 'Ringing'];
      if (!validStates.includes(ch.ChannelStateDesc)) {
        continue;
      }
      
      // Skip duplicate channels (sometimes AMI returns the same channel multiple times)
      if (processedChannels.has(ch.Channel)) {
        continue;
      }
      processedChannels.add(ch.Channel);
      
      // Parse duration
      let duration = 0;
      if (ch.Seconds) {
        duration = parseInt(ch.Seconds, 10) || 0;
      } else if (ch.Duration) {
        // Parse HH:MM:SS format if needed
        const parts = String(ch.Duration).split(':');
        if (parts.length === 3) {
          duration = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        } else {
          duration = parseInt(ch.Duration, 10) || 0;
        }
      }

      activeCalls.push({
        uniqueid: ch.Uniqueid || ch.Channel,
        channel: ch.Channel,
        callerIdNum: ch.CallerIDNum || 'Unknown',
        callerIdName: ch.CallerIDName || '',
        duration,
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
    
    // Calculate unique waiting calls from active channels (more accurate than summing queue.waiting)
    const activeChannels = new Set<string>();
    (this.amiCache.channels || []).forEach((ch: any) => {
      if (ch.Channel && ch.ChannelStateDesc !== 'Down') {
        activeChannels.add(ch.Channel);
      }
    });
    
    const uniqueWaitingChannels = new Set<string>();
    const queueStatusMap = this.amiCache.queueStatus || new Map();
    
    for (const q of queues) {
      const amiEvents = queueStatusMap.get(q.name);
      if (amiEvents && amiEvents.length > 0) {
        const entryEvents = amiEvents.filter((e: any) => e.Event === 'QueueEntry');
        entryEvents.forEach((e: any) => {
          if (e.Channel && activeChannels.has(e.Channel)) {
            uniqueWaitingChannels.add(e.Channel);
          }
        });
      }
    }
    
    const totalUniqueWaiting = uniqueWaitingChannels.size;
    return { operators, queues, activeCalls, totalUniqueWaiting };
  }

  // Debug methods
  async getDebugCdrSample(limit: number = 10) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
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
