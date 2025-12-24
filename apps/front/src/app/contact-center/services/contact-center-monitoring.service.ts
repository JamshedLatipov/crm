import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, of, fromEvent } from 'rxjs';
import { switchMap, map, catchError, shareReplay, filter, retryWhen, delay, tap, startWith } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { io, Socket } from 'socket.io-client';
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

  // socket.io client (when available)
  private socket: Socket | null = null;

  // Shared parsed message stream when WS or socket.io is available
  private messages$ = null as unknown as Observable<any> | null;

  private getWsUrl() {
    const api = environment.apiBase;
    if (api.startsWith('https')) return api.replace(/^https/, 'wss') + '/contact-center/ws';
    return api.replace(/^http/, 'ws') + '/contact-center/ws';
  }

  private getSocketBase() {
    // derive base host without the trailing /api
    const api = environment.apiBase;
    return api.replace(/\/api\/?$/, '');
  }

  private ensureWs() {
    // If socket.io client is available on the server side (Nest uses socket.io), prefer it
    if (this.socket) return this.socket;

    try {
      const base = this.getSocketBase();
      this.socket = io(base, { path: '/api/contact-center/ws' });

      // create messages$ stream from socket 'message' events lazily when needed
      this.socket.on('connect_error', (err) => {
        console.warn('Socket.io connect_error', err);
      });

      // leave ws$ (raw WebSocket) fallback for non-socket.io servers
      const url = this.getWsUrl();
      this.ws$ = webSocket({
        url,
        deserializer: (e: any) => e.data,
      });

      return this.socket;
    } catch (err) {
      console.warn('Socket init failed, falling back to raw ws', err);
      this.socket = null;
      return this.ws$;
    }
  }

  // Prefer WebSocket stream; fallback to polling
  getOperators(): Observable<OperatorStatus[]> {
    const s = this.ensureWs();
    if (this.socket) {
      if (!this.messages$) {
        this.messages$ = fromEvent(this.socket, 'message').pipe(
          map((raw: any) => (typeof raw === 'string' ? JSON.parse(raw) : raw)),
          filter((m: any) => !!m),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      }

      return (this.messages$ as Observable<any>).pipe(
        filter((m: any) => m && m.type === 'operators'),
        map((m: any) => m.payload as OperatorStatus[])
      );
    }

    if (this.ws$) {
      // raw ws fallback
      if (!this.messages$) {
        this.messages$ = this.ws$.pipe(
          map((raw) => {
            try {
              if (typeof raw === 'string') return JSON.parse(raw);
              if (raw && raw.type) return raw;
              if (raw && raw.data) return raw.data;
              return raw;
            } catch {
              return null;
            }
          }),
          filter((m) => !!m),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      }

      return (this.messages$ as Observable<any>).pipe(
        filter((m) => m && m.type === 'operators'),
        map((m) => m.payload as OperatorStatus[])
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
    if (this.socket) {
      if (!this.messages$) {
        this.messages$ = fromEvent(this.socket, 'message').pipe(
          map((raw: any) => (typeof raw === 'string' ? JSON.parse(raw) : raw)),
          filter((m: any) => !!m),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      }

      return (this.messages$ as Observable<any>).pipe(
        filter((m: any) => m && m.type === 'queues'),
        map((m: any) => m.payload as QueueStatus[])
      );
    }

    if (this.ws$) {
      if (!this.messages$) {
        this.messages$ = this.ws$.pipe(
          map((raw) => {
            try {
              if (typeof raw === 'string') return JSON.parse(raw);
              if (raw && raw.type) return raw;
              if (raw && raw.data) return raw.data;
              return raw;
            } catch {
              return null;
            }
          }),
          filter((m) => !!m),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      }

      return (this.messages$ as Observable<any>).pipe(
        filter((m) => m && m.type === 'queues'),
        map((m) => m.payload as QueueStatus[])
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
