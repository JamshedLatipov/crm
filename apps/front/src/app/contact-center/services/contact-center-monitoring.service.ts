import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  interval,
  switchMap,
  of,
  startWith,
  map,
  catchError,
  shareReplay,
  filter,
  retryWhen,
  delay,
  tap,
} from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../../environments/environment';

export interface OperatorStatus {
  id: string;
  name: string;
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

  // WebSocket subject (lazy init)
  private ws$: WebSocketSubject<any> | null = null;

  // Shared parsed message stream when WS is available
  private messages$ = null as unknown as Observable<any> | null;

  private getWsUrl() {
    const api = environment.apiBase;
    // Backend expects /api/contact-center/ws path
    const wsUrl = api.startsWith('https') 
      ? api.replace(/^https/, 'wss') + '/contact-center/ws'
      : api.replace(/^http/, 'ws') + '/contact-center/ws';
    return wsUrl;
  }

  private ensureWs() {
    if (this.ws$) return this.ws$;
    try {
      const url = this.getWsUrl();
      this.ws$ = webSocket({
        url,
        // accept any data type and let parsing happen downstream
        deserializer: (e: any) => e.data,
        // prevent WebSocketSubject from closing on error so our retry logic can handle reconnects
        openObserver: {
          next: () => {
            console.log('[ContactCenter] WebSocket connected!');
            // reset messages$ on new connection
            this.messages$ = null;
          },
        },
        closeObserver: {
          next: () => {
            console.warn('[ContactCenter] WebSocket closed');
            this.ws$ = null;
            this.messages$ = null;
          },
        },
      });

      return this.ws$;
    } catch (err) {
      console.warn('WS init failed', err);
      this.ws$ = null;
      return null;
    }
  }

  private ensureMessages(): Observable<any> | null {
    const ws = this.ensureWs();
    if (!ws) return null;

    if (!this.messages$) {
      this.messages$ = ws.pipe(
        // incoming raw data can be string (JSON) or object (socket.io emits)
        map((raw) => {
          try {
            if (typeof raw === 'string') return JSON.parse(raw);
            // socket.io may wrap payloads under { type, payload } or under { data }
            if (raw && raw.type) return raw;
            if (raw && raw.data) {
              // sometimes socket.io emits { data: { type, payload } }
              return raw.data;
            }
            // if raw is already an object with expected shape
            return raw;
          } catch (e) {
            // if parse failed, return null and let filter drop it
            return null;
          }
        }),
        filter((m) => !!m),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }

    return this.messages$;
  }

  // Prefer WebSocket stream; fallback to polling
  getOperators(): Observable<OperatorStatus[]> {
    const messages$ = this.ensureMessages();
    if (messages$) {
      return messages$.pipe(
        filter((m) => m && m.type === 'operators'),
        map((m) => m.payload as OperatorStatus[]),
        // if the socket errors upstream, clear ws so next subscription will recreate it
        retryWhen((errors) =>
          errors.pipe(
            tap(() => {
              this.ws$ = null;
              this.messages$ = null;
            }),
            delay(2000)
          )
        )
      );
    }

    return interval(2000).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get<OperatorStatus[]>(`${this.base}/operators`).pipe(
          catchError((err) => {
            console.error('Failed to load operators', err);
            return of([] as OperatorStatus[]);
          })
        )
      )
    );
  }

  getQueues(): Observable<QueueStatus[]> {
    const messages$ = this.ensureMessages();
    if (messages$) {
      return messages$.pipe(
        filter((m) => m && m.type === 'queues'),
        tap((m) => console.log('[ContactCenterService] Received queues via WS:', JSON.stringify(m.payload))),
        map((m) => m.payload as QueueStatus[]),
        retryWhen((errors) =>
          errors.pipe(
            tap(() => {
              this.ws$ = null;
              this.messages$ = null;
            }),
            delay(2000)
          )
        )
      );
    }

    return interval(3000).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get<QueueStatus[]>(`${this.base}/queues`).pipe(
          tap((queues) => console.log('[ContactCenterService] Received queues via HTTP:', JSON.stringify(queues))),
          catchError((err) => {
            console.error('Failed to load queues', err);
            return of([] as QueueStatus[]);
          })
        )
      )
    );
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

  // Active calls with WebSocket
  getActiveCalls(): Observable<ActiveCall[]> {
    const messages$ = this.ensureMessages();
    if (messages$) {
      return messages$.pipe(
        filter((m) => m && m.type === 'activeCalls'),
        map((m) => m.payload as ActiveCall[]),
        retryWhen((errors) =>
          errors.pipe(
            tap(() => {
              this.ws$ = null;
              this.messages$ = null;
            }),
            delay(2000)
          )
        )
      );
    }

    return interval(3000).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get<ActiveCall[]>(`${this.base}/active-calls`).pipe(
          catchError((err) => {
            console.error('Failed to load active calls', err);
            return of([] as ActiveCall[]);
          })
        )
      )
    );
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
    const messages$ = this.ensureMessages();
    if (messages$) {
      return messages$.pipe(
        filter((m) => m && m.type === 'stats'),
        map((m) => m.payload as ContactCenterStats),
        retryWhen((errors) =>
          errors.pipe(
            tap(() => {
              this.ws$ = null;
              this.messages$ = null;
            }),
            delay(2000)
          )
        )
      );
    }

    // Fallback: calculate from queues data (not ideal but better than nothing)
    return of({ totalUniqueWaiting: 0 });
  }
}