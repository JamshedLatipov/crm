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

export interface OperatorStatus {
  id: string;
  name: string;
  fullName?: string | null; // ФИО пользователя, связанного с оператором
  extension?: string;
  status: 'idle' | 'on_call' | 'wrap_up' | 'offline';
  currentCall?: string | null;
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
  duration: number;
  state: string;
  operator?: string;
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
}