import { Component, input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { User } from '../../../../services/user-management.service';
import { UserActivityService, UserActivityDto } from '../../../../services/user-activity.service';

export interface UserActivity {
  id: string;
  type: 'login' | 'logout' | 'lead_assigned' | 'lead_viewed' | 'lead_updated' | 'call_started' | 'call_ended' | 'deal_created' | 'deal_updated' | 'contact_created' | 'contact_updated' | 'password_changed' | 'profile_updated' | 'role_changed' | 'skills_updated' | 'territories_updated';
  description?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

@Component({
  selector: 'app-user-activity',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './user-activity.component.html',
  styleUrls: ['./user-activity.component.scss']
})
export class UserActivityComponent implements OnInit {
  user = input.required<User>();
  activities = signal<UserActivity[]>([]);
  isLoading = signal(false);

  private userActivityService = inject(UserActivityService);

  ngOnInit() {
    this.loadUserActivities();
  }

  private loadUserActivities() {
    this.isLoading.set(true);

    this.userActivityService.getRecentUserActivities(this.user().id.toString(), 20)
      .subscribe({
        next: (apiActivities) => {
          const activities: UserActivity[] = apiActivities.map(apiActivity => ({
            id: apiActivity.id,
            type: apiActivity.type as UserActivity['type'],
            description: apiActivity.description,
            timestamp: new Date(apiActivity.createdAt),
            metadata: apiActivity.metadata,
            ipAddress: apiActivity.ipAddress,
          }));
          this.activities.set(activities);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load user activities:', error);
          this.isLoading.set(false);
          // Fallback to empty array
          this.activities.set([]);
        }
      });
  }

  getActivityIcon(type: UserActivity['type']): string {
    const icons: Record<UserActivity['type'], string> = {
      login: 'login',
      logout: 'logout',
      lead_assigned: 'assignment_ind',
      lead_viewed: 'visibility',
      lead_updated: 'edit',
      call_started: 'call',
      call_ended: 'call_end',
      deal_created: 'add_circle',
      deal_updated: 'edit',
      contact_created: 'person_add',
      contact_updated: 'person',
      password_changed: 'lock',
      profile_updated: 'account_circle',
      role_changed: 'admin_panel_settings',
      skills_updated: 'school',
      territories_updated: 'location_on'
    };
    return icons[type] || 'info';
  }

  getActivityColor(type: UserActivity['type']): string {
    const colors: Record<UserActivity['type'], string> = {
      login: 'primary',
      logout: 'accent',
      lead_assigned: 'primary',
      lead_viewed: 'basic',
      lead_updated: 'accent',
      call_started: 'primary',
      call_ended: 'basic',
      deal_created: 'primary',
      deal_updated: 'accent',
      contact_created: 'primary',
      contact_updated: 'accent',
      password_changed: 'warn',
      profile_updated: 'accent',
      role_changed: 'primary',
      skills_updated: 'primary',
      territories_updated: 'accent'
    };
    return colors[type] || 'basic';
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} д назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  trackByActivityId(index: number, activity: UserActivity): string {
    return activity.id;
  }

  getActivityTypeLabel(type: UserActivity['type']): string {
    const labels: Record<UserActivity['type'], string> = {
      login: 'Вход',
      logout: 'Выход',
      lead_assigned: 'Лид назначен',
      lead_viewed: 'Лид просмотрен',
      lead_updated: 'Лид обновлен',
      call_started: 'Звонок начат',
      call_ended: 'Звонок завершен',
      deal_created: 'Сделка создана',
      deal_updated: 'Сделка обновлена',
      contact_created: 'Контакт создан',
      contact_updated: 'Контакт обновлен',
      password_changed: 'Пароль изменен',
      profile_updated: 'Профиль обновлен',
      role_changed: 'Роль изменена',
      skills_updated: 'Навыки обновлены',
      territories_updated: 'Территории обновлены'
    };
    return labels[type] || type;
  }
}