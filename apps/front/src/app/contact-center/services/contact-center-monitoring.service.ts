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
  status: 'idle' | 'on_call' | 'wrap_up' | 'offline';
  currentCall?: string | null;
  avgHandleTime?: number; // seconds
}

export interface QueueStatus {
  id: string;
  name: string;
  waiting: number;
  longestWaitingSeconds: number;
  callsInService: number;
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
    if (api.startsWith('https')) return api.replace(/^https/, 'wss') + '/contact-center/ws';
    return api.replace(/^http/, 'ws') + '/contact-center/ws';
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
            // reset messages$ on new connection
            this.messages$ = null;
          },
        },
      });

      // subscribe once to keep socket alive and handle terminal states
      this.ws$.subscribe({
        error: () => {
          this.ws$ = null;
          this.messages$ = null;
        },
        complete: () => {
          this.ws$ = null;
          this.messages$ = null;
        },
      });

      return this.ws$;
    } catch (err) {
      console.warn('WS init failed', err);
      this.ws$ = null;
      return null;
    }
  }

  // Prefer WebSocket stream; fallback to polling
  getOperators(): Observable<OperatorStatus[]> {
    const ws = this.ensureWs();
    if (ws) {
      // build a shared parsed message stream lazily
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

      return (this.messages$ as Observable<any>).pipe(
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
    const ws = this.ensureWs();
    if (ws) {
      if (!this.messages$) {
        // messages$ is created in getOperators path; create if missing
        this.messages$ = ws.pipe(
          map((raw) => {
            try {
              if (typeof raw === 'string') return JSON.parse(raw);
              if (raw && raw.type) return raw;
              if (raw && raw.data) return raw.data;
              return raw;
            } catch (e) {
              return null;
            }
          }),
          filter((m) => !!m),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      }

      return (this.messages$ as Observable<any>).pipe(
        filter((m) => m && m.type === 'queues'),
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
}
