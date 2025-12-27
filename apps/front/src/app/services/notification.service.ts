import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '@crm/front/environments/environment';
import { AuthService } from '../auth/auth.service';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  data?: Record<string, unknown>;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum NotificationType {
  HOT_LEAD_DETECTED = 'hot_lead_detected',
  LEAD_SCORE_INCREASED = 'lead_score_increased',
  DEAL_WON = 'deal_won',
  DEAL_CREATED = 'deal_created'
}

export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
  SMS = 'sms'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface NotificationFilter {
  recipientId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationResponse {
  data: Notification[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  public readonly notifications = signal<Notification[]>([]);
  public readonly unreadCount = signal<number>(0);
  public readonly isLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);
  public readonly isConnected = signal<boolean>(false);

  public readonly hasUnreadNotifications = computed(() => this.unreadCount() > 0);

  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBase + '/notifications';
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly newNotification$ = new Subject<Notification>();
  private readonly auth = inject(AuthService);
  
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 3000;

  constructor() {
    this.initWebSocket();
  }

  /**
   * Initialize WebSocket connection
   */
  private initWebSocket(): void {
    const userId = this.auth.getUserId();
    
    if (!userId) {
      console.warn('Cannot connect to notifications WebSocket: User not authenticated');
      return;
    }

    // Build WebSocket URL (remove /api prefix for WebSocket connection)
    const wsUrl = environment.apiBase
      .replace('http', 'ws')
      .replace('/api', '');
    
    this.socket = io(wsUrl, {
      path: '/notifications/ws',
      query: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: this.RECONNECT_DELAY,
    });

    this.setupSocketListeners();
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to notifications WebSocket');
      this.isConnected.set(true);
      this.reconnectAttempts = 0;
      
      // Subscribe to notifications
      const userId = this.auth.getUserId();
      if (userId) {
        this.socket?.emit('subscribe_notifications', { userId });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('❌ Disconnected from notifications WebSocket:', reason);
      this.isConnected.set(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        this.setError('Не удалось подключиться к серверу уведомлений');
      }
    });

    // Listen for new notifications
    this.socket.on('new_notification', (notification: Notification) => {
      console.log('📬 New notification received:', notification);
      
      // Add to notifications list
      const current = this.notifications();
      this.notifications.set([notification, ...current]);
      this.notificationsSubject.next([notification, ...current]);
      
      // Emit to subscribers
      this.newNotification$.next(notification);
      
      // Show browser notification if permitted
      this.showBrowserNotification(notification);
    });

    // Listen for unread count updates
    this.socket.on('unread_count', (data: { count: number }) => {
      console.log('🔔 Unread count updated:', data.count);
      this.unreadCount.set(data.count);
      this.unreadCountSubject.next(data.count);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected to WebSocket (attempt ${attemptNumber})`);
      this.isConnected.set(true);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to WebSocket after max attempts');
      this.setError('Не удалось восстановить соединение с сервером');
    });
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: Notification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/notification-icon.png',
        badge: '/assets/icons/badge-icon.png',
        tag: `notification-${notification.id}`,
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        
        // Navigate to notification link if available
        if (notification.data?.['actionUrl']) {
          window.location.href = notification.data['actionUrl'] as string;
        }
      };
    }
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Observable for new notifications
   */
  onNewNotification(): Observable<Notification> {
    return this.newNotification$.asObservable();
  }

  loadNotifications(filter: NotificationFilter = {}): Observable<NotificationResponse> {
    this.setLoading(true);
    this.setError(null);

    // If WebSocket is connected, use WebSocket
    if (this.socket?.connected) {
      return new Observable(observer => {
        this.socket?.emit('get_notifications', 
          {
            limit: filter.limit,
            offset: filter.offset,
            unreadOnly: filter.unreadOnly
          },
          (response: { success: boolean; data?: Notification[]; total?: number; message?: string }) => {
            if (response.success && response.data) {
              this.notifications.set(response.data);
              this.notificationsSubject.next(response.data);
              observer.next({ data: response.data, total: response.total || 0 });
              observer.complete();
            } else {
              this.setError(response.message || 'Не удалось загрузить уведомления');
              observer.error(new Error(response.message));
            }
            this.setLoading(false);
          }
        );
      });
    }

    // Fallback to HTTP if WebSocket is not connected
    const params = this.buildHttpParams({
      ...filter,
      recipientId: filter.recipientId || this.auth.getUserId() || 'current-user'
    });

    return this.http.get<NotificationResponse>(`${this.baseUrl}`, { params }).pipe(
      tap(response => {
        this.notifications.set(response.data);
        this.notificationsSubject.next(response.data);
        this.updateUnreadCount();
      }),
      catchError((error) => {
        this.setError('Не удалось загрузить уведомления');
        return of({ data: [], total: 0 });
      }),
      tap(() => this.setLoading(false))
    );
  }

  markAsRead(notificationId: number): Observable<boolean> {
    // If WebSocket is connected, use WebSocket
    if (this.socket?.connected) {
      return new Observable(observer => {
        this.socket?.emit('mark_as_read', 
          { notificationId },
          (response: { success: boolean; message?: string }) => {
            if (response.success) {
              this.updateNotificationStatus(notificationId, NotificationStatus.READ);
              observer.next(true);
            } else {
              observer.next(false);
            }
            observer.complete();
          }
        );
      });
    }

    // Fallback to HTTP
    const recipientId = this.auth.getUserId() || 'current-user';
    return this.http.patch<void>(`${this.baseUrl}/${notificationId}/read`, {
      recipientId
    }).pipe(
      map(() => {
        this.updateNotificationStatus(notificationId, NotificationStatus.READ);
        this.updateUnreadCount();
        return true;
      }),
      catchError(() => of(false))
    );
  }

  markAllAsRead(): Observable<{ markedCount: number }> {
    // If WebSocket is connected, use WebSocket
    if (this.socket?.connected) {
      return new Observable(observer => {
        this.socket?.emit('mark_all_as_read', 
          {},
          (response: { success: boolean; markedCount?: number; message?: string }) => {
            if (response.success) {
              const updated = this.notifications().map(n => 
                n.status !== NotificationStatus.READ 
                  ? { ...n, status: NotificationStatus.READ, readAt: new Date().toISOString() }
                  : n
              );
              this.notifications.set(updated);
              this.notificationsSubject.next(updated);
              observer.next({ markedCount: response.markedCount || 0 });
            } else {
              observer.error(new Error(response.message));
            }
            observer.complete();
          }
        );
      });
    }

    // Fallback to HTTP
    return this.http.patch<{ markedCount: number }>(`${this.baseUrl}/mark-all-read`, {
      recipientId: this.auth.getUserId() || 'current-user'
    }).pipe(
      tap(() => {
        const updated = this.notifications().map(n => 
          n.status !== NotificationStatus.READ 
            ? { ...n, status: NotificationStatus.READ, readAt: new Date().toISOString() }
            : n
        );
        this.notifications.set(updated);
        this.notificationsSubject.next(updated);
        this.unreadCount.set(0);
        this.unreadCountSubject.next(0);
      }),
      catchError(() => of({ markedCount: 0 }))
    );
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private buildHttpParams(filter: NotificationFilter): HttpParams {
    let params = new HttpParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });
    
    return params;
  }

  private updateNotificationStatus(id: number, status: NotificationStatus): void {
    const updated = this.notifications().map(n => 
      n.id === id 
        ? { 
            ...n, 
            status, 
            readAt: status === NotificationStatus.READ ? new Date().toISOString() : n.readAt 
          }
        : n
    );
    this.notifications.set(updated);
    this.notificationsSubject.next(updated);
  }

  private updateUnreadCount(): void {
    const count = this.notifications().filter(n => n.status !== NotificationStatus.READ).length;
    this.unreadCount.set(count);
    this.unreadCountSubject.next(count);
  }

  private setLoading(loading: boolean): void {
    this.isLoading.set(loading);
    this.isLoadingSubject.next(loading);
  }

  private setError(error: string | null): void {
    this.error.set(error);
    this.errorSubject.next(error);
  }
}