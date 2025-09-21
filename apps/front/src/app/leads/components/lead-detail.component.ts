import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LeadService } from '../services/lead.service';
import { Lead, LeadActivity, LeadStatus, LeadSource, LeadPriority } from '../models/lead.model';
import { ChangeStatusDialogComponent } from './change-status-dialog.component';
import { AssignLeadDialogComponent } from './assign-lead-dialog.component';

@Component({
  selector: 'app-lead-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatMenuModule,
    MatTooltipModule
  ],
  template: `
    <div class="lead-detail-header">
      <div class="header-content">
        <div class="lead-title">
          <h2>{{ lead.name }}</h2>
          <div class="status-section">
            <mat-chip [class]="'status-chip status-' + lead.status" selected>
              {{ getStatusLabel(lead.status) }}
            </mat-chip>
            <button mat-icon-button (click)="quickChangeStatus()" class="change-status-btn" matTooltip="Изменить статус">
              <mat-icon>swap_horiz</mat-icon>
            </button>
          </div>
        </div>
        <div class="header-actions">
          <button mat-icon-button [matMenuTriggerFor]="actionsMenu">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #actionsMenu="matMenu">
            <button mat-menu-item (click)="editLead()">
              <mat-icon>edit</mat-icon>
              Редактировать
            </button>
            <button mat-menu-item (click)="contactLead()">
              <mat-icon>phone</mat-icon>
              Связаться
            </button>
            <button mat-menu-item (click)="assignLead()">
              <mat-icon>person_add</mat-icon>
              Назначить
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="deleteLead()" class="delete-action">
              <mat-icon>delete</mat-icon>
              Удалить
            </button>
          </mat-menu>
          <button mat-button (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <mat-dialog-content class="lead-detail-content">
      <mat-tab-group>
        <!-- Overview Tab -->
        <mat-tab label="Обзор">
          <div class="tab-content">
            <!-- Key Metrics -->
            <div class="metrics-row">
              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-value">{{ lead.score }}</div>
                  <div class="metric-label">Скор</div>
                </mat-card-content>
              </mat-card>
              
              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-value">{{ lead.conversionProbability }}%</div>
                  <div class="metric-label">Вероятность</div>
                </mat-card-content>
              </mat-card>
              
              <mat-card class="metric-card" *ngIf="lead.estimatedValue">
                <mat-card-content>
                  <div class="metric-value">{{ lead.estimatedValue | currency:'RUB':'symbol':'1.0-0' }}</div>
                  <div class="metric-label">Ценность</div>
                </mat-card-content>
              </mat-card>
            </div>

            <!-- Contact Information -->
            <mat-card class="info-card">
              <mat-card-header>
                <mat-card-title>Контактная информация</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-grid">
                  <div class="info-item" *ngIf="lead.email">
                    <mat-icon class="info-icon">email</mat-icon>
                    <div>
                      <div class="info-label">Email</div>
                      <div class="info-value">
                        <a [href]="'mailto:' + lead.email">{{ lead.email }}</a>
                      </div>
                    </div>
                  </div>

                  <div class="info-item" *ngIf="lead.phone">
                    <mat-icon class="info-icon">phone</mat-icon>
                    <div>
                      <div class="info-label">Телефон</div>
                      <div class="info-value">
                        <a [href]="'tel:' + lead.phone">{{ lead.phone }}</a>
                      </div>
                    </div>
                  </div>

                  <div class="info-item" *ngIf="lead.company">
                    <mat-icon class="info-icon">business</mat-icon>
                    <div>
                      <div class="info-label">Компания</div>
                      <div class="info-value">{{ lead.company }}</div>
                    </div>
                  </div>

                  <div class="info-item" *ngIf="lead.position">
                    <mat-icon class="info-icon">work</mat-icon>
                    <div>
                      <div class="info-label">Должность</div>
                      <div class="info-value">{{ lead.position }}</div>
                    </div>
                  </div>

                  <div class="info-item" *ngIf="lead.website">
                    <mat-icon class="info-icon">language</mat-icon>
                    <div>
                      <div class="info-label">Сайт</div>
                      <div class="info-value">
                        <a [href]="lead.website" target="_blank">{{ lead.website }}</a>
                      </div>
                    </div>
                  </div>

                  <div class="info-item" *ngIf="lead.industry">
                    <mat-icon class="info-icon">category</mat-icon>
                    <div>
                      <div class="info-label">Отрасль</div>
                      <div class="info-value">{{ lead.industry }}</div>
                    </div>
                  </div>

                  <div class="info-item" *ngIf="lead.country || lead.city">
                    <mat-icon class="info-icon">location_on</mat-icon>
                    <div>
                      <div class="info-label">Местоположение</div>
                      <div class="info-value">{{ getLocation() }}</div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Lead Details -->
            <mat-card class="info-card">
              <mat-card-header>
                <mat-card-title>Детали лида</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-grid">
                  <div class="info-item">
                    <mat-icon class="info-icon">source</mat-icon>
                    <div>
                      <div class="info-label">Источник</div>
                      <div class="info-value">{{ getSourceLabel(lead.source) }}</div>
                    </div>
                  </div>

                  <div class="info-item">
                    <mat-icon class="info-icon">priority_high</mat-icon>
                    <div>
                      <div class="info-label">Приоритет</div>
                      <div class="info-value">
                        <mat-chip [class]="'priority-chip priority-' + lead.priority" selected>
                          {{ getPriorityLabel(lead.priority) }}
                        </mat-chip>
                      </div>
                    </div>
                  </div>

                  <div class="info-item" *ngIf="lead.budget">
                    <mat-icon class="info-icon">attach_money</mat-icon>
                    <div>
                      <div class="info-label">Бюджет</div>
                      <div class="info-value">{{ lead.budget | currency:'RUB':'symbol':'1.0-0' }}</div>
                    </div>
                  </div>

                  <div class="info-item" *ngIf="lead.decisionTimeframe">
                    <mat-icon class="info-icon">schedule</mat-icon>
                    <div>
                      <div class="info-label">Временные рамки</div>
                      <div class="info-value">{{ lead.decisionTimeframe }}</div>
                    </div>
                  </div>

                  <div class="info-item">
                    <mat-icon class="info-icon">access_time</mat-icon>
                    <div>
                      <div class="info-label">Создан</div>
                      <div class="info-value">{{ lead.createdAt | date:'dd.MM.yyyy HH:mm' }}</div>
                    </div>
                  </div>

                  <div class="info-item" *ngIf="lead.lastContactedAt">
                    <mat-icon class="info-icon">call</mat-icon>
                    <div>
                      <div class="info-label">Последний контакт</div>
                      <div class="info-value">{{ lead.lastContactedAt | date:'dd.MM.yyyy HH:mm' }}</div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Tags -->
            <mat-card class="info-card" *ngIf="lead.tags && lead.tags.length > 0">
              <mat-card-header>
                <mat-card-title>Теги</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="tags-container">
                  <mat-chip *ngFor="let tag of lead.tags" class="tag-chip">
                    {{ tag }}
                  </mat-chip>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Notes -->
            <mat-card class="info-card" *ngIf="lead.notes">
              <mat-card-header>
                <mat-card-title>Заметки</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p class="notes-text">{{ lead.notes }}</p>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Activity Tab -->
        <mat-tab label="Активность">
          <div class="tab-content">
            <div class="activity-loading" *ngIf="loadingActivities">
              <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
              <p>Загрузка активности...</p>
            </div>

            <div class="activity-list" *ngIf="!loadingActivities">
              <div class="activity-item" *ngFor="let activity of activities">
                <div class="activity-icon">
                  <mat-icon>{{ getActivityIcon(activity.type) }}</mat-icon>
                </div>
                <div class="activity-content">
                  <div class="activity-description">{{ activity.description }}</div>
                  <div class="activity-meta">
                    <span class="activity-date">{{ activity.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
                    <span class="activity-score" *ngIf="activity.scoreChange">
                      Скор: {{ activity.scoreChange > 0 ? '+' : '' }}{{ activity.scoreChange }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="empty-activity" *ngIf="activities.length === 0">
                <mat-icon class="empty-icon">history</mat-icon>
                <p>Активность не найдена</p>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- UTM Tab -->
        <mat-tab label="UTM данные" *ngIf="hasUtmData()">
          <div class="tab-content">
            <mat-card class="info-card">
              <mat-card-header>
                <mat-card-title>UTM параметры</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-grid">
                  <div class="info-item" *ngIf="lead.utmSource">
                    <div class="info-label">UTM Source</div>
                    <div class="info-value">{{ lead.utmSource }}</div>
                  </div>

                  <div class="info-item" *ngIf="lead.utmMedium">
                    <div class="info-label">UTM Medium</div>
                    <div class="info-value">{{ lead.utmMedium }}</div>
                  </div>

                  <div class="info-item" *ngIf="lead.utmCampaign">
                    <div class="info-label">UTM Campaign</div>
                    <div class="info-value">{{ lead.utmCampaign }}</div>
                  </div>

                  <div class="info-item" *ngIf="lead.utmTerm">
                    <div class="info-label">UTM Term</div>
                    <div class="info-value">{{ lead.utmTerm }}</div>
                  </div>

                  <div class="info-item" *ngIf="lead.utmContent">
                    <div class="info-label">UTM Content</div>
                    <div class="info-value">{{ lead.utmContent }}</div>
                  </div>

                  <div class="info-item" *ngIf="lead.referrer">
                    <div class="info-label">Referrer</div>
                    <div class="info-value">{{ lead.referrer }}</div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
  `,
  styles: [`
    .lead-detail-header {
      padding: 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .lead-title {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .lead-title h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
    }

    .status-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .change-status-btn {
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .change-status-btn:hover {
      opacity: 1;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .lead-detail-content {
      padding: 0;
      max-height: 70vh;
    }

    .tab-content {
      padding: 24px;
    }

    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      text-align: center;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 500;
      color: #1976d2;
    }

    .metric-label {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
      margin-top: 4px;
    }

    .info-card {
      margin-bottom: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .info-icon {
      color: rgba(0, 0, 0, 0.54);
      margin-top: 2px;
    }

    .info-label {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 4px;
    }

    .info-value {
      font-weight: 500;
    }

    .info-value a {
      color: #1976d2;
      text-decoration: none;
    }

    .info-value a:hover {
      text-decoration: underline;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag-chip {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .notes-text {
      margin: 0;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .activity-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
    }

    .activity-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .activity-item {
      display: flex;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .activity-icon mat-icon {
      color: rgba(0, 0, 0, 0.6);
    }

    .activity-content {
      flex: 1;
    }

    .activity-description {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .activity-meta {
      display: flex;
      gap: 16px;
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .activity-score {
      color: #1976d2;
      font-weight: 500;
    }

    .empty-activity {
      text-align: center;
      padding: 48px;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: rgba(0, 0, 0, 0.3);
      margin-bottom: 16px;
    }

    .status-chip, .priority-chip {
      font-size: 0.75rem;
      min-height: 24px;
    }

    .status-new { background-color: #e3f2fd !important; color: #1976d2 !important; }
    .status-contacted { background-color: #f3e5f5 !important; color: #7b1fa2 !important; }
    .status-qualified { background-color: #e8f5e8 !important; color: #388e3c !important; }
    .status-proposal_sent { background-color: #fff3e0 !important; color: #f57c00 !important; }
    .status-negotiating { background-color: #fce4ec !important; color: #c2185b !important; }
    .status-converted { background-color: #e8f5e8 !important; color: #2e7d32 !important; }
    .status-rejected { background-color: #ffebee !important; color: #d32f2f !important; }
    .status-lost { background-color: #fafafa !important; color: #616161 !important; }

    .priority-low { background-color: #f5f5f5 !important; color: #616161 !important; }
    .priority-medium { background-color: #fff3e0 !important; color: #f57c00 !important; }
    .priority-high { background-color: #ffebee !important; color: #d32f2f !important; }
    .priority-urgent { background-color: #e1f5fe !important; color: #0277bd !important; }

    .delete-action {
      color: #d32f2f;
    }
  `]
})
export class LeadDetailComponent {
  private readonly leadService = inject(LeadService);
  private readonly dialogRef = inject(MatDialogRef<LeadDetailComponent>);
  private readonly dialog = inject(MatDialog);
  private readonly data = inject<Lead>(MAT_DIALOG_DATA);

  lead: Lead = this.data;
  activities: LeadActivity[] = [];
  loadingActivities = false;

  // Status and source mappings
  private statusLabels = {
    [LeadStatus.NEW]: 'Новый',
    [LeadStatus.CONTACTED]: 'Контакт установлен',
    [LeadStatus.QUALIFIED]: 'Квалифицирован',
    [LeadStatus.PROPOSAL_SENT]: 'Предложение отправлено',
    [LeadStatus.NEGOTIATING]: 'Переговоры',
    [LeadStatus.CONVERTED]: 'Конвертирован',
    [LeadStatus.REJECTED]: 'Отклонен',
    [LeadStatus.LOST]: 'Потерян'
  };

  private sourceLabels = {
    [LeadSource.WEBSITE]: 'Сайт',
    [LeadSource.FACEBOOK]: 'Facebook',
    [LeadSource.GOOGLE_ADS]: 'Google Ads',
    [LeadSource.LINKEDIN]: 'LinkedIn',
    [LeadSource.EMAIL]: 'Email',
    [LeadSource.PHONE]: 'Телефон',
    [LeadSource.REFERRAL]: 'Рекомендация',
    [LeadSource.TRADE_SHOW]: 'Выставка',
    [LeadSource.WEBINAR]: 'Вебинар',
    [LeadSource.CONTENT_MARKETING]: 'Контент-маркетинг',
    [LeadSource.COLD_OUTREACH]: 'Холодный обзвон',
    [LeadSource.PARTNER]: 'Партнер',
    [LeadSource.OTHER]: 'Другое'
  };

  private priorityLabels = {
    [LeadPriority.LOW]: 'Низкий',
    [LeadPriority.MEDIUM]: 'Средний',
    [LeadPriority.HIGH]: 'Высокий',
    [LeadPriority.URGENT]: 'Срочный'
  };

  constructor() {
    this.loadActivities();
  }

  loadActivities(): void {
    this.loadingActivities = true;
    this.leadService.getLeadActivities(this.lead.id).subscribe({
      next: (activities) => {
        this.activities = activities;
        this.loadingActivities = false;
      },
      error: (error: unknown) => {
        console.error('Error loading activities:', error);
        this.loadingActivities = false;
      }
    });
  }

  getStatusLabel(status: LeadStatus): string {
    return this.statusLabels[status] || status;
  }

  getSourceLabel(source: LeadSource): string {
    return this.sourceLabels[source] || source;
  }

  getPriorityLabel(priority: LeadPriority): string {
    return this.priorityLabels[priority] || priority;
  }

  getLocation(): string {
    const parts = [];
    if (this.lead.city) parts.push(this.lead.city);
    if (this.lead.country) parts.push(this.lead.country);
    return parts.join(', ');
  }

  hasUtmData(): boolean {
    return !!(this.lead.utmSource || this.lead.utmMedium || this.lead.utmCampaign || 
             this.lead.utmTerm || this.lead.utmContent || this.lead.referrer);
  }

  getActivityIcon(type: string): string {
    const iconMap: Record<string, string> = {
      form_submitted: 'assignment',
      email_opened: 'mark_email_read',
      email_clicked: 'link',
      website_visited: 'language',
      phone_call_made: 'call_made',
      phone_call_received: 'call_received',
      meeting_scheduled: 'event',
      demo_requested: 'play_circle',
      proposal_sent: 'send',
      note_added: 'note_add',
      status_changed: 'swap_horiz',
      assigned: 'person_add'
    };
    return iconMap[type] || 'info';
  }

  editLead(): void {
    // TODO: Implement edit functionality
    console.log('Edit lead:', this.lead);
  }

  contactLead(): void {
    this.leadService.markAsContacted(this.lead.id).subscribe({
      next: () => {
        // Refresh lead data
        console.log('Lead marked as contacted');
      },
      error: (error: unknown) => {
        console.error('Error marking lead as contacted:', error);
      }
    });
  }

  quickChangeStatus(): void {
    const dialogRef = this.dialog.open(ChangeStatusDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { 
        lead: this.lead, 
        currentStatus: this.lead.status 
      }
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.lead = result; // Update current lead data
      }
    });
  }

  assignLead(): void {
    const dialogRef = this.dialog.open(AssignLeadDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: { 
        lead: this.lead, 
        currentAssignee: this.lead.assignedTo 
      }
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.lead = result; // Update current lead data
      }
    });
  }

  deleteLead(): void {
    if (confirm(`Вы уверены, что хотите удалить лид "${this.lead.name}"?`)) {
      this.leadService.deleteLead(this.lead.id).subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error: unknown) => {
          console.error('Error deleting lead:', error);
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
