import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Router } from '@angular/router';
import { NotificationService, Notification, NotificationType } from '../../services/notification.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

interface NotificationGroup {
  label: string;
  notifications: Notification[];
}

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
    MatProgressSpinnerModule,
    MatChipsModule,
    MatButtonToggleModule
  ],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
  animations: [
    trigger('notificationAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(50, [
            animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  // Сигналы из сервиса
  public readonly notifications = this.notificationService.notifications;
  public readonly unreadCount = this.notificationService.unreadCount;
  public readonly isLoading = this.notificationService.isLoading;
  public readonly error = this.notificationService.error;
  public readonly hasUnreadNotifications = this.notificationService.hasUnreadNotifications;

  // Локальные сигналы
  public readonly maxDisplayedNotifications = signal(10);
  public readonly selectedFilter = signal<string>('unread');
  
  // Computed values
  public readonly filteredNotifications = computed(() => {
    const filter = this.selectedFilter();
    const allNotifications = this.notifications();
    
    switch (filter) {
      case 'unread':
        return allNotifications.filter(n => n.status !== 'read');
      case 'hot_lead_detected':
      case 'lead_score_increased':
        return allNotifications.filter(n => 
          n.type === NotificationType.HOT_LEAD_DETECTED || 
          n.type === NotificationType.LEAD_SCORE_INCREASED
        );
      case 'deal_won':
      case 'deal_created':
        return allNotifications.filter(n => 
          n.type === NotificationType.DEAL_WON || 
          n.type === NotificationType.DEAL_CREATED
        );
      default:
        return allNotifications;
    }
  });

  public readonly groupedNotifications = computed(() => {
    const notifications = this.filteredNotifications().slice(0, this.maxDisplayedNotifications());
    return this.groupNotificationsByDate(notifications);
  });

  public readonly hasMoreNotifications = computed(() => 
    this.filteredNotifications().length > this.maxDisplayedNotifications()
  );

  public readonly totalNotifications = computed(() => this.filteredNotifications().length);

  public readonly tooltipText = computed(() => {
    const count = this.unreadCount();
    if (count === 0) {
      return 'Нет новых уведомлений';
    }
    return `У вас ${count} ${this.pluralize(count, 'новое уведомление', 'новых уведомления', 'новых уведомлений')}`;
  });

  ngOnInit(): void {
    // Загружаем уведомления при инициализации
    this.loadNotifications();

    // Подписываемся на новые уведомления
    this.notificationService.onNewNotification().subscribe(notification => {
      console.log('Новое уведомление получено в компоненте:', notification);
      // Можно добавить звуковое уведомление или тост
      this.playNotificationSound();
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  onBellClick(): void {
    // Загружаем свежие уведомления при клике на колокольчик
    this.loadNotifications();
  }

  onFilterChange(filter: string): void {
    this.selectedFilter.set(filter);
    this.maxDisplayedNotifications.set(10); // Сброс при смене фильтра
  }

  onNotificationClick(notification: Notification): void {
    // Отмечаем как прочитанное при клике
    if (notification.status !== 'read') {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    // Переходим к связанной сущности
    this.navigateToNotification(notification);
  }

  markAsRead(notificationId: number, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsRead(notificationId).subscribe();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  showAllNotifications(): void {
    this.maxDisplayedNotifications.set(this.filteredNotifications().length);
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

  getPriorityLabel(priority: string): string {
    const labelMap: Record<string, string> = {
      'low': 'Низкий приоритет',
      'medium': 'Средний приоритет',
      'high': 'Высокий приоритет',
      'urgent': 'Срочно'
    };
    
    return labelMap[priority] || priority;
  }

  hasAdditionalInfo(notification: Notification): boolean {
    return !!(
      notification.data?.['leadName'] ||
      notification.data?.['score'] ||
      notification.data?.['dealValue']
    );
  }

  getQuickAction(notification: Notification): string | null {
    switch (notification.type) {
      case NotificationType.HOT_LEAD_DETECTED:
        return 'Связаться';
      case NotificationType.LEAD_SCORE_INCREASED:
        return 'Открыть лид';
      case NotificationType.DEAL_WON:
      case NotificationType.DEAL_CREATED:
        return 'Открыть сделку';
      default:
        return null;
    }
  }

  getQuickActionIcon(notification: Notification): string {
    switch (notification.type) {
      case NotificationType.HOT_LEAD_DETECTED:
        return 'phone';
      case NotificationType.LEAD_SCORE_INCREASED:
        return 'open_in_new';
      case NotificationType.DEAL_WON:
      case NotificationType.DEAL_CREATED:
        return 'visibility';
      default:
        return 'arrow_forward';
    }
  }

  handleQuickAction(notification: Notification, event: Event): void {
    event.stopPropagation();
    
    // Отмечаем как прочитанное
    if (notification.status !== 'read') {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    // Выполняем действие
    this.navigateToNotification(notification);
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

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  }

  private loadNotifications(): void {
    this.notificationService.loadNotifications({ 
      unreadOnly: false, 
      limit: 50 
    }).subscribe();
  }

  private groupNotificationsByDate(notifications: Notification[]): NotificationGroup[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, Notification[]> = {
      'Сегодня': [],
      'Вчера': [],
      'На этой неделе': [],
      'Ранее': []
    };

    notifications.forEach(notification => {
      const notificationDate = new Date(notification.createdAt);
      const notificationDay = new Date(notificationDate.getFullYear(), notificationDate.getMonth(), notificationDate.getDate());

      if (notificationDay.getTime() === today.getTime()) {
        groups['Сегодня'].push(notification);
      } else if (notificationDay.getTime() === yesterday.getTime()) {
        groups['Вчера'].push(notification);
      } else if (notificationDate >= weekAgo) {
        groups['На этой неделе'].push(notification);
      } else {
        groups['Ранее'].push(notification);
      }
    });

    return Object.entries(groups)
      .filter(([_, notifs]) => notifs.length > 0)
      .map(([label, notifs]) => ({ label, notifications: notifs }));
  }

  private navigateToNotification(notification: Notification): void {
    const actionUrl = notification.data?.['actionUrl'] as string;
    
    if (actionUrl) {
      this.router.navigateByUrl(actionUrl);
      return;
    }

    // Определяем URL по типу уведомления
    switch (notification.type) {
      case NotificationType.HOT_LEAD_DETECTED:
      case NotificationType.LEAD_SCORE_INCREASED:
        if (notification.data?.['leadId']) {
          this.router.navigate(['/leads', notification.data['leadId']]);
        }
        break;
      case NotificationType.DEAL_WON:
      case NotificationType.DEAL_CREATED:
        if (notification.data?.['dealId']) {
          this.router.navigate(['/deals', notification.data['dealId']]);
        }
        break;
    }
  }

  private playNotificationSound(): void {
    // Опционально: воспроизведение звука
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Игнорируем ошибки воспроизведения
      });
    } catch (e) {
      // Звук не критичен
    }
  }

  private pluralize(count: number, one: string, few: string, many: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return one;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return few;
    }
    return many;
  }
}