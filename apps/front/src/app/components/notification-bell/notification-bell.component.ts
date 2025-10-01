import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService, Notification, NotificationType } from '../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="notificationMenu"
      [matBadge]="unreadCount()"
      [matBadgeHidden]="!hasUnreadNotifications()"
      matBadgeColor="warn"
      matBadgeSize="small"
      [matTooltip]="tooltipText()"
      (click)="onBellClick()"
      class="notification-bell"
    >
      <mat-icon>notifications</mat-icon>
    </button>

    <mat-menu #notificationMenu="matMenu" class="notification-menu" xPosition="before">
      <div class="notification-header" (click)="$event.stopPropagation()">
        <h3>Уведомления</h3>
        <div class="notification-actions">
          @if (hasUnreadNotifications()) {
            <button 
              mat-button 
              color="primary" 
              class="mark-all-read-btn"
              (click)="markAllAsRead()"
              [disabled]="isLoading()"
            >
              Прочитать все
            </button>
          }
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="notification-content">
        @if (isLoading()) {
          <div class="loading-container">
            <mat-spinner diameter="30"></mat-spinner>
            <p>Загрузка уведомлений...</p>
          </div>
        } @else if (error()) {
          <div class="error-container">
            <mat-icon color="warn">error</mat-icon>
            <p>{{ error() }}</p>
            <button mat-button color="primary" (click)="reload()">
              Повторить
            </button>
          </div>
        } @else if (displayedNotifications().length === 0) {
          <div class="empty-container">
            <mat-icon>notifications_none</mat-icon>
            <p>Нет уведомлений</p>
          </div>
        } @else {
          <div class="notifications-list">
            @for (notification of displayedNotifications(); track notification.id) {
              <div 
                class="notification-item"
                [class.unread]="notification.status !== 'read'"
                [class.high-priority]="notification.priority === 'high' || notification.priority === 'urgent'"
                (click)="onNotificationClick(notification)"
              >
                <div class="notification-icon">
                  {{ getNotificationIcon(notification.type) }}
                </div>
                <div class="notification-content">
                  <div class="notification-title">
                    {{ notification.title }}
                  </div>
                  <div class="notification-message">
                    {{ notification.message }}
                  </div>
                  <div class="notification-time">
                    {{ formatTimeAgo(notification.createdAt) }}
                  </div>
                </div>
                <div class="notification-actions">
                  @if (notification.status !== 'read') {
                    <button 
                      mat-icon-button 
                      class="mark-read-btn"
                      (click)="markAsRead(notification.id, $event)"
                      matTooltip="Отметить как прочитанное"
                    >
                      <mat-icon>check</mat-icon>
                    </button>
                  }
                  <div 
                    class="priority-indicator"
                    [style.background-color]="getPriorityColor(notification.priority)"
                  ></div>
                </div>
              </div>
            }
          </div>

          @if (hasMoreNotifications()) {
            <div class="show-more-container">
              <button 
                mat-button 
                color="primary" 
                (click)="showAllNotifications()"
                class="show-more-btn"
              >
                Показать все ({{ totalNotifications() }})
              </button>
            </div>
          }
        }
      </div>
    </mat-menu>
  `,
  styles: [`
    .notification-bell {
      position: relative;
    }

    .notification-menu {
      width: 400px;
      max-width: 90vw;
    }

    .notification-header {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }

    .notification-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    .mark-all-read-btn {
      font-size: 12px;
      padding: 4px 8px;
      min-width: auto;
    }

    .notification-content {
      max-height: 400px;
      overflow-y: auto;
    }

    .loading-container,
    .error-container,
    .empty-container {
      padding: 32px 16px;
      text-align: center;
      color: var(--text-secondary, #666);
    }

    .loading-container p,
    .error-container p,
    .empty-container p {
      margin: 8px 0 0 0;
      font-size: 14px;
    }

    .error-container mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .empty-container mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--text-disabled, #999);
    }

    .notifications-list {
      padding: 0;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color, #f0f0f0);
      cursor: pointer;
      transition: background-color 0.2s ease;
      position: relative;
    }

    .notification-item:hover {
      background-color: var(--hover-color, #f5f5f5);
    }

    .notification-item.unread {
      background-color: var(--unread-bg, #f8f9ff);
      border-left: 3px solid var(--primary-color, #2196f3);
    }

    .notification-item.high-priority {
      border-left-color: var(--warning-color, #ff9800);
    }

    .notification-item.high-priority.unread {
      background-color: var(--warning-bg, #fff8e1);
    }

    .notification-icon {
      font-size: 20px;
      margin-right: 12px;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 500;
      font-size: 14px;
      color: var(--text-primary, #333);
      margin-bottom: 4px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .notification-message {
      font-size: 13px;
      color: var(--text-secondary, #666);
      margin-bottom: 4px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
    }

    .notification-time {
      font-size: 11px;
      color: var(--text-disabled, #999);
    }

    .notification-actions {
      display: flex;
      align-items: center;
      margin-left: 8px;
      flex-shrink: 0;
    }

    .mark-read-btn {
      width: 24px;
      height: 24px;
      line-height: 24px;
      margin-right: 4px;
    }

    .mark-read-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .priority-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .show-more-container {
      padding: 12px 16px;
      text-align: center;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }

    .show-more-btn {
      font-size: 13px;
    }

    /* Scrollbar styling */
    .notification-content::-webkit-scrollbar {
      width: 4px;
    }

    .notification-content::-webkit-scrollbar-track {
      background: transparent;
    }

    .notification-content::-webkit-scrollbar-thumb {
      background: var(--scrollbar-color, #ccc);
      border-radius: 2px;
    }

    .notification-content::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-hover-color, #999);
    }
  `]
})
export class NotificationBellComponent {
  private readonly notificationService = inject(NotificationService);

  // Сигналы из сервиса
  public readonly notifications = this.notificationService.notifications;
  public readonly unreadCount = this.notificationService.unreadCount;
  public readonly isLoading = this.notificationService.isLoading;
  public readonly error = this.notificationService.error;
  public readonly hasUnreadNotifications = this.notificationService.hasUnreadNotifications;

  // Локальные сигналы
  private readonly maxDisplayedNotifications = signal(5);
  
  // Computed values
  public readonly displayedNotifications = computed(() => 
    this.notifications().slice(0, this.maxDisplayedNotifications())
  );

  public readonly hasMoreNotifications = computed(() => 
    this.notifications().length > this.maxDisplayedNotifications()
  );

  public readonly totalNotifications = computed(() => this.notifications().length);

  public readonly tooltipText = computed(() => {
    const count = this.unreadCount();
    if (count === 0) {
      return 'Нет новых уведомлений';
    }
    return `У вас ${count} новых уведомлений`;
  });

  constructor() {
    // Загружаем уведомления при инициализации
    this.loadNotifications();
  }

  onBellClick(): void {
    // Загружаем свежие уведомления при клике на колокольчик
    this.loadNotifications();
  }

  onNotificationClick(notification: Notification): void {
    // Отмечаем как прочитанное при клике
    if (notification.status !== 'read') {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    // Переходим к связанной сущности, если есть actionUrl
    if (notification.data?.['actionUrl']) {
      // TODO: Реализовать навигацию через Router
      console.log('Navigate to:', notification.data['actionUrl']);
    }
  }

  markAsRead(notificationId: number, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsRead(notificationId).subscribe();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  showAllNotifications(): void {
    this.maxDisplayedNotifications.set(this.notifications().length);
  }

  reload(): void {
    this.loadNotifications();
  }

  getNotificationIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      [NotificationType.HOT_LEAD_DETECTED]: '🔥',
      [NotificationType.LEAD_SCORE_INCREASED]: '📈',
      [NotificationType.DEAL_WON]: '🎉',
      [NotificationType.DEAL_CREATED]: '💼'
    };
    
    return iconMap[type] || '🔔';
  }

  getPriorityColor(priority: string): string {
    const colorMap: Record<string, string> = {
      'low': '#6b7280',
      'medium': '#3b82f6',
      'high': '#f59e0b',
      'urgent': '#ef4444'
    };
    
    return colorMap[priority] || '#6b7280';
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'только что';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} мин. назад`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ч. назад`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} дн. назад`;
    }

    return date.toLocaleDateString('ru-RU');
  }

  private loadNotifications(): void {
    this.notificationService.loadNotifications({ 
      unreadOnly: false, 
      limit: 20 
    }).subscribe();
  }
}