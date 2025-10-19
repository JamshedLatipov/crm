import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subscription } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '@crm/front/environments/environment';
import { AuthService } from '../auth/auth.service';

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

  public readonly hasUnreadNotifications = computed(() => this.unreadCount() > 0);

  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBase + '/notifications';
  private readonly POLLING_INTERVAL = 30000;
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private currentUserId = 'current-user';
  private readonly auth = inject(AuthService);
  private pollingSubscription?: Subscription;

  constructor() {
    this.startPolling();
  }

  loadNotifications(filter: NotificationFilter = {}): Observable<NotificationResponse> {
    this.setLoading(true);
    this.setError(null);

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
      catchError(() => {
        this.setError('Не удалось загрузить уведомления');
        return of({ data: [], total: 0 });
      }),
      tap(() => this.setLoading(false))
    );
  }

  markAsRead(notificationId: number): Observable<boolean> {
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
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  private startPolling(): void {
    this.pollingSubscription = interval(this.POLLING_INTERVAL).pipe(
      switchMap(() => this.loadUnreadCount())
    ).subscribe();
  }

  private loadUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`, {
      params: { recipientId: this.currentUserId }
    }).pipe(
      tap(response => {
        this.unreadCount.set(response.count);
        this.unreadCountSubject.next(response.count);
      }),
      catchError(() => of({ count: 0 }))
    );
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