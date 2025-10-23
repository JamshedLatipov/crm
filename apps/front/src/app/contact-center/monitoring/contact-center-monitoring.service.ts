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

  private getWsUrl() {
    const api = environment.apiBase;
    if (api.startsWith('https')) return api.replace(/^https/, 'wss') + '/contact-center/ws';
    return api.replace(/^http/, 'ws') + '/contact-center/ws';
  }

  private ensureWs() {
    if (this.ws$) return this.ws$;
    try {
      const url = this.getWsUrl();
      this.ws$ = webSocket({ url });
      this.ws$.subscribe({
        error: () => {
          this.ws$ = null;
        },
        complete: () => {
          this.ws$ = null;
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
      return ws.pipe(
        filter((m) => m && m.type === 'operators'),
        map((m) => m.payload as OperatorStatus[]),
        shareReplay({ bufferSize: 1, refCount: true }),
        retryWhen((errors) => errors.pipe(delay(2000), tap(() => (this.ws$ = null))))
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
      return ws.pipe(
        filter((m) => m && m.type === 'queues'),
        map((m) => m.payload as QueueStatus[]),
        shareReplay({ bufferSize: 1, refCount: true }),
        retryWhen((errors) => errors.pipe(delay(2000), tap(() => (this.ws$ = null))))
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
}
