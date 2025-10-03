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
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
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