import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationPayload {
  id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | undefined;
  private notificationSubject = new Subject<NotificationPayload>();
  public notifications$ = this.notificationSubject.asObservable();

  constructor() {
    // Initial connection attempt could be here or manual
  }

  public connect(token: string): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    // Assuming backend is at the same host/port or configured in environment
    // Use namespace /notifications
    // Extract base URL from apiBase (remove /api if present)
    const baseUrl = environment.apiBase.replace(/\/api$/, '');

    this.socket = io(`${baseUrl}/notifications`, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    this.socket.on('notification', (payload: any) => {
      console.log('New notification received:', payload);
      this.notificationSubject.next(payload);
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }
}
