import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  interval,
  switchMap,
  of,
  startWith,
  catchError,
  retryWhen,
  delay,
  tap,
  BehaviorSubject,
} from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AgentStatusChangeEvent } from '../types/agent-status.types';

export interface ResolvedName {
  displayName: string;
  type: 'operator' | 'contact' | 'unknown';
  contactId?: string;
  userId?: number;
  originalValue: string;
}

export interface OperatorStatus {
  id: string;
  name: string;
  fullName?: string | null; // ФИО пользователя, связанного с оператором
  extension?: string;
  status: 'idle' | 'on_call' | 'wrap_up' | 'offline';
  currentCall?: string | null;
  currentCallDisplayName?: string | null; // Resolved contact name for current call
  currentCallDuration?: number | null;
  statusDuration?: number | null; // Время в текущем статусе (в секундах)
  avgHandleTime?: number;
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
  callerDisplayName?: string; // Resolved contact name
  duration: number;
  state: string;
  operator?: string;
  operatorDisplayName?: string; // Resolved operator name
  queue?: string;
}

export interface ContactCenterStats {
  totalUniqueWaiting: number;
}

@Injectable({ providedIn: 'root' })
export class ContactCenterMonitoringService {
  private http = inject(HttpClient);
  private base = environment.apiBase + '/contact-center';

  // Socket.IO client
  private socket: Socket | null = null;
  private socketInitialized = false;
  
  // BehaviorSubjects to cache last values
  private operatorsSubject = new BehaviorSubject<OperatorStatus[]>([]);
  private queuesSubject = new BehaviorSubject<QueueStatus[]>([]);
  private activeCallsSubject = new BehaviorSubject<ActiveCall[]>([]);
  private statsSubject = new BehaviorSubject<ContactCenterStats>({ totalUniqueWaiting: 0 });
  private agentStatusChangeSubject = new BehaviorSubject<AgentStatusChangeEvent | null>(null);

  constructor() {
    // Initialize socket on service creation
    this.initializeSocket();
  }

  private getWsUrl() {
    // Remove /api prefix for WebSocket connection
    return environment.apiBase
      .replace('http', 'ws')
      .replace('/api', '');
  }

  private initializeSocket() {
    if (this.socketInitialized) return;
    
    try {
      const wsUrl = this.getWsUrl();
      this.socket = io(wsUrl, {
        path: '/api/contact-center/ws',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        console.log('[ContactCenter] Socket.IO connected!');
      });

      this.socket.on('disconnect', () => {
        console.warn('[ContactCenter] Socket.IO disconnected');
      });

      this.socket.on('operators', (data: any) => {
        this.operatorsSubject.next(data.payload);
      });

      this.socket.on('queues', (data: any) => {
        console.log('[ContactCenterService] Received queues via Socket.IO:', JSON.stringify(data.payload));
        this.queuesSubject.next(data.payload);
      });

      this.socket.on('activeCalls', (data: any) => {
        this.activeCallsSubject.next(data.payload);
      });

      this.socket.on('stats', (data: any) => {
        this.statsSubject.next(data.payload);
      });

      this.socket.on('agent:status_changed', (data: AgentStatusChangeEvent) => {
        console.log('[ContactCenter] Agent status changed:', data);
        // Backend sends message with type, payload, timestamp structure
        this.agentStatusChangeSubject.next(data);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[ContactCenter] Socket.IO connection error:', error);
      });

      this.socketInitialized = true;
    } catch (err) {
      console.warn('Socket.IO init failed', err);
      this.socket = null;
    }
  }

  // Always use Socket.IO stream (BehaviorSubject caches last value)
  getOperators(): Observable<OperatorStatus[]> {
    return this.operatorsSubject.asObservable();
  }

  getQueues(): Observable<QueueStatus[]> {
    return this.queuesSubject.asObservable();
  }

  // One-time snapshot via REST (useful for initial UI render before WS messages arrive)
  fetchOperatorsSnapshot(): Observable<OperatorStatus[]> {
    return this.http.get<OperatorStatus[]>(`${this.base}/operators`).pipe(
      catchError((err) => {
        console.error('Failed to fetch operators snapshot', err);
        return of([] as OperatorStatus[]);
      })
    );
  }

  fetchQueuesSnapshot(): Observable<QueueStatus[]> {
    return this.http.get<QueueStatus[]>(`${this.base}/queues`).pipe(
      catchError((err) => {
        console.error('Failed to fetch queues snapshot', err);
        return of([] as QueueStatus[]);
      })
    );
  }

  // Active calls with Socket.IO
  getActiveCalls(): Observable<ActiveCall[]> {
    return this.activeCallsSubject.asObservable();
  }

  fetchActiveCallsSnapshot(): Observable<ActiveCall[]> {
    return this.http.get<ActiveCall[]>(`${this.base}/active-calls`).pipe(
      catchError((err) => {
        console.error('Failed to fetch active calls snapshot', err);
        return of([] as ActiveCall[]);
      })
    );
  }

  // Get stats (totalUniqueWaiting, etc.)
  getStats(): Observable<ContactCenterStats> {
    return this.statsSubject.asObservable();
  }

  /**
   * Subscribe to agent status changes (WebSocket)
   * Returns observable that emits when any agent's status changes
   */
  onAgentStatusChange(): Observable<AgentStatusChangeEvent | null> {
    return this.agentStatusChangeSubject.asObservable();
  }

  /**
   * Get operator details (call history, status history, stats)
   */
  getOperatorDetails(
    operatorId: string, 
    range: 'today' | 'week' | 'month' | 'custom' = 'week',
    startDate?: Date,
    endDate?: Date
  ): Observable<any> {
    const encodedId = encodeURIComponent(operatorId);
    let params: any = { range };
    
    if (range === 'custom' && startDate && endDate) {
      params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
    }
    
    return this.http.get<any>(`${this.base}/operators/${encodedId}/details`, {
      params
    }).pipe(
      catchError((err) => {
        console.error('Failed to fetch operator details', err);
        throw err;
      })
    );
  }

  // ========== Supervisor Actions ==========

  /**
   * Whisper to an operator - supervisor speaks to operator only
   */
  whisperCall(operatorExtension: string, supervisorExtension: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/supervisor/whisper`, {
      operatorExtension,
      supervisorExtension
    }).pipe(
      catchError((err) => {
        console.error('Whisper call failed', err);
        return of({ success: false, message: err?.error?.message || 'Ошибка подключения' });
      })
    );
  }

  /**
   * Barge into a call - supervisor joins as third party
   */
  bargeCall(operatorExtension: string, supervisorExtension: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/supervisor/barge`, {
      operatorExtension,
      supervisorExtension
    }).pipe(
      catchError((err) => {
        console.error('Barge call failed', err);
        return of({ success: false, message: err?.error?.message || 'Ошибка подключения' });
      })
    );
  }

  /**
   * Hangup a call by channel
   */
  hangupCall(channel: string): Observable<{ success: boolean; message: string }> {
    const encodedChannel = encodeURIComponent(channel);
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/supervisor/hangup/${encodedChannel}`, {}).pipe(
      catchError((err) => {
        console.error('Hangup call failed', err);
        return of({ success: false, message: err?.error?.message || 'Ошибка завершения' });
      })
    );
  }

  /**
   * Transfer a call to another extension
   */
  transferCall(channel: string, targetExtension: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/supervisor/transfer`, {
      channel,
      targetExtension
    }).pipe(
      catchError((err) => {
        console.error('Transfer call failed', err);
        return of({ success: false, message: err?.error?.message || 'Ошибка перевода' });
      })
    );
  }

  /**
   * Start recording a call
   */
  startRecording(channel: string, filename?: string): Observable<{ success: boolean; message: string; filename?: string }> {
    return this.http.post<{ success: boolean; message: string; filename?: string }>(`${this.base}/supervisor/recording/start`, {
      channel,
      filename
    }).pipe(
      catchError((err) => {
        console.error('Start recording failed', err);
        return of({ success: false, message: err?.error?.message || 'Ошибка записи' });
      })
    );
  }

  /**
   * Stop recording a call
   */
  stopRecording(channel: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/supervisor/recording/stop`, {
      channel
    }).pipe(
      catchError((err) => {
        console.error('Stop recording failed', err);
        return of({ success: false, message: err?.error?.message || 'Ошибка остановки записи' });
      })
    );
  }

  /**
   * Pause an operator in queue(s)
   */
  pauseQueueMember(operatorInterface: string, queueName?: string, reason?: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/supervisor/queue-member/pause`, {
      operatorInterface,
      queueName,
      reason
    }).pipe(
      catchError((err) => {
        console.error('Pause queue member failed', err);
        return of({ success: false, message: err?.error?.message || 'Ошибка паузы' });
      })
    );
  }

  /**
   * Unpause an operator in queue(s)
   */
  unpauseQueueMember(operatorInterface: string, queueName?: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/supervisor/queue-member/unpause`, {
      operatorInterface,
      queueName
    }).pipe(
      catchError((err) => {
        console.error('Unpause queue member failed', err);
        return of({ success: false, message: err?.error?.message || 'Ошибка снятия с паузы' });
      })
    );
  }

  /**
   * Get channel by uniqueid (for supervisor actions)
   */
  getChannelByUniqueid(uniqueid: string): Observable<{ channel: string | null }> {
    return this.http.get<{ channel: string | null }>(`${this.base}/supervisor/channel/${uniqueid}`).pipe(
      catchError((err) => {
        console.error('Get channel by uniqueid failed', err);
        return of({ channel: null });
      })
    );
  }

  // ========== Name Resolution ==========

  /**
   * Resolve phone number to contact name
   */
  resolvePhoneNumber(phone: string): Observable<ResolvedName> {
    const encoded = encodeURIComponent(phone);
    return this.http.get<ResolvedName>(`${this.base}/resolve/phone/${encoded}`).pipe(
      catchError(() => of({ displayName: phone, type: 'unknown' as const, originalValue: phone }))
    );
  }

  /**
   * Resolve operator SIP endpoint to user name
   */
  resolveOperator(sipEndpoint: string): Observable<ResolvedName> {
    const encoded = encodeURIComponent(sipEndpoint);
    return this.http.get<ResolvedName>(`${this.base}/resolve/operator/${encoded}`).pipe(
      catchError(() => of({ displayName: sipEndpoint, type: 'operator' as const, originalValue: sipEndpoint }))
    );
  }

  /**
   * Batch resolve phone numbers
   */
  resolvePhoneNumbers(phones: string[]): Observable<Record<string, ResolvedName>> {
    return this.http.post<Record<string, ResolvedName>>(`${this.base}/resolve/phones`, { phones }).pipe(
      catchError(() => of({}))
    );
  }

  /**
   * Batch resolve operators
   */
  resolveOperators(endpoints: string[]): Observable<Record<string, ResolvedName>> {
    return this.http.post<Record<string, ResolvedName>>(`${this.base}/resolve/operators`, { endpoints }).pipe(
      catchError(() => of({}))
    );
  }
}