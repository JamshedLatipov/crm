import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';

import { LeadService } from '../services/lead.service';
import { LeadStatistics, Lead, LeadStatus, LeadSource, LeadPriority } from '../models/lead.model';

@Component({
  selector: 'app-leads-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    RouterModule
  ],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Дашборд лидов</h1>
        <button mat-raised-button color="primary" routerLink="/leads/list">
          <mat-icon>list</mat-icon>
          Все лиды
        </button>
      </div>

      <!-- Loading -->
      <div class="loading-container" *ngIf="loading()">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>

      <!-- Dashboard Content -->
      <div class="dashboard-content" *ngIf="!loading() && statistics()">
        <!-- Key Metrics -->
        <div class="metrics-grid">
          <mat-card class="metric-card total-leads">
            <mat-card-content>
              <div class="metric-header">
                <mat-icon>people</mat-icon>
                <span class="metric-label">Всего лидов</span>
              </div>
              <div class="metric-value">{{ statistics()?.totalLeads || 0 }}</div>
              <div class="metric-trend positive" *ngIf="statistics()?.newLeads">
                +{{ statistics()?.newLeads }} новых
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="metric-card qualified-leads">
            <mat-card-content>
              <div class="metric-header">
                <mat-icon>verified</mat-icon>
                <span class="metric-label">Квалифицированных</span>
              </div>
              <div class="metric-value">{{ statistics()?.qualifiedLeads || 0 }}</div>
              <div class="metric-percentage">
                {{ getPercentage(statistics()?.qualifiedLeads, statistics()?.totalLeads) }}%
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="metric-card converted-leads">
            <mat-card-content>
              <div class="metric-header">
                <mat-icon>done_all</mat-icon>
                <span class="metric-label">Конвертированных</span>
              </div>
              <div class="metric-value">{{ statistics()?.convertedLeads || 0 }}</div>
              <div class="metric-percentage conversion">
                {{ statistics()?.conversionRate || 0 }}% конверсия
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="metric-card average-score">
            <mat-card-content>
              <div class="metric-header">
                <mat-icon>star</mat-icon>
                <span class="metric-label">Средний скор</span>
              </div>
              <div class="metric-value">{{ statistics()?.averageScore || 0 }}</div>
              <div class="metric-trend" [class.positive]="(statistics()?.averageScore || 0) > 50">
                {{ (statistics()?.averageScore || 0) > 50 ? 'Высокое качество' : 'Требует внимания' }}
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="metric-card total-value">
            <mat-card-content>
              <div class="metric-header">
                <mat-icon>attach_money</mat-icon>
                <span class="metric-label">Общая ценность</span>
              </div>
              <div class="metric-value">{{ statistics()?.totalValue | currency:'RUB':'symbol':'1.0-0' }}</div>
              <div class="metric-trend positive">
                Потенциальная выручка
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Status Distribution -->
        <div class="charts-grid">
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Распределение по статусам</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="status-distribution">
                <div class="status-item" *ngFor="let item of getStatusDistribution()">
                  <div class="status-info">
                    <mat-chip [class]="'status-chip status-' + item.status" selected>
                      {{ item.label }}
                    </mat-chip>
                    <span class="status-count">{{ item.count }}</span>
                  </div>
                  <div class="status-bar">
                    <div class="status-progress" 
                         [style.width.%]="getPercentage(item.count, statistics()?.totalLeads)">
                    </div>
                  </div>
                  <span class="status-percentage">
                    {{ getPercentage(item.count, statistics()?.totalLeads) }}%
                  </span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Источники лидов</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="source-distribution">
                <div class="source-item" *ngFor="let item of getSourceDistribution()">
                  <div class="source-info">
                    <span class="source-label">{{ item.label }}</span>
                    <span class="source-count">{{ item.count }}</span>
                  </div>
                  <div class="source-bar">
                    <div class="source-progress" 
                         [style.width.%]="getPercentage(item.count, statistics()?.totalLeads)">
                    </div>
                  </div>
                  <span class="source-percentage">
                    {{ getPercentage(item.count, statistics()?.totalLeads) }}%
                  </span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Приоритеты лидов</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="priority-distribution">
                <div class="priority-item" *ngFor="let item of getPriorityDistribution()">
                  <div class="priority-info">
                    <mat-chip [class]="'priority-chip priority-' + item.priority" selected>
                      {{ item.label }}
                    </mat-chip>
                    <span class="priority-count">{{ item.count }}</span>
                  </div>
                  <div class="priority-bar">
                    <div class="priority-progress" 
                         [style.width.%]="getPercentage(item.count, statistics()?.totalLeads)">
                    </div>
                  </div>
                  <span class="priority-percentage">
                    {{ getPercentage(item.count, statistics()?.totalLeads) }}%
                  </span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions-grid">
          <mat-card class="action-card" (click)="loadHighValueLeads()">
            <mat-card-content>
              <mat-icon class="action-icon high-value">diamond</mat-icon>
              <h3>Высокоценные лиды</h3>
              <p>{{ highValueLeads().length }} лидов с высокой ценностью</p>
              <button mat-button color="primary">Просмотреть</button>
            </mat-card-content>
          </mat-card>

          <mat-card class="action-card" (click)="loadStaleLeads()">
            <mat-card-content>
              <mat-icon class="action-icon stale">schedule</mat-icon>
              <h3>Застоявшиеся лиды</h3>
              <p>{{ staleLeads().length }} лидов требуют внимания</p>
              <button mat-button color="warn">Проверить</button>
            </mat-card-content>
          </mat-card>

          <mat-card class="action-card" routerLink="/leads/list">
            <mat-card-content>
              <mat-icon class="action-icon manage">manage_accounts</mat-icon>
              <h3>Управление лидами</h3>
              <p>Полный список и фильтрация лидов</p>
              <button mat-button color="primary">Перейти</button>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-dashboard" *ngIf="!loading() && !statistics()?.totalLeads">
        <mat-icon class="empty-icon">people_outline</mat-icon>
        <h2>Добро пожаловать в CRM!</h2>
        <p>Начните работу с создания первого лида</p>
        <button mat-raised-button color="primary" routerLink="/leads/list">
          <mat-icon>add</mat-icon>
          Создать лид
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .dashboard-header h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 500;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .metric-card {
      transition: transform 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
    }

    .metric-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .metric-header mat-icon {
      color: #1976d2;
      font-size: 24px;
    }

    .metric-label {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
      font-weight: 500;
    }

    .metric-value {
      font-size: 2.5rem;
      font-weight: 600;
      color: #1976d2;
      line-height: 1;
      margin-bottom: 8px;
    }

    .metric-trend {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .metric-trend.positive {
      color: #4caf50;
    }

    .metric-percentage {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .metric-percentage.conversion {
      color: #4caf50;
      font-weight: 500;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .chart-card {
      min-height: 300px;
    }

    .status-distribution,
    .source-distribution,
    .priority-distribution {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .status-item,
    .source-item,
    .priority-item {
      display: grid;
      grid-template-columns: 2fr 3fr auto;
      gap: 16px;
      align-items: center;
    }

    .status-info,
    .source-info,
    .priority-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .status-count,
    .source-count,
    .priority-count {
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }

    .status-bar,
    .source-bar,
    .priority-bar {
      height: 8px;
      background-color: #f5f5f5;
      border-radius: 4px;
      overflow: hidden;
    }

    .status-progress,
    .source-progress,
    .priority-progress {
      height: 100%;
      background-color: #1976d2;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .status-percentage,
    .source-percentage,
    .priority-percentage {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
      min-width: 40px;
      text-align: right;
    }

    .source-label {
      font-weight: 500;
    }

    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .action-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .action-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .action-card mat-card-content {
      text-align: center;
      padding: 32px 24px;
    }

    .action-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .action-icon.high-value {
      color: #ff9800;
    }

    .action-icon.stale {
      color: #f44336;
    }

    .action-icon.manage {
      color: #4caf50;
    }

    .action-card h3 {
      margin: 0 0 8px;
      font-size: 1.25rem;
      font-weight: 500;
    }

    .action-card p {
      margin: 0 0 16px;
      color: rgba(0, 0, 0, 0.6);
    }

    .empty-dashboard {
      text-align: center;
      padding: 64px 24px;
    }

    .empty-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: rgba(0, 0, 0, 0.3);
      margin-bottom: 24px;
    }

    .empty-dashboard h2 {
      margin: 0 0 16px;
      font-weight: 500;
    }

    .empty-dashboard p {
      margin: 0 0 32px;
      color: rgba(0, 0, 0, 0.6);
    }

    /* Status chip styles */
    .status-chip {
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

    /* Priority chip styles */
    .priority-chip {
      font-size: 0.75rem;
      min-height: 24px;
    }

    .priority-low { background-color: #f5f5f5 !important; color: #616161 !important; }
    .priority-medium { background-color: #fff3e0 !important; color: #f57c00 !important; }
    .priority-high { background-color: #ffebee !important; color: #d32f2f !important; }
    .priority-urgent { background-color: #e1f5fe !important; color: #0277bd !important; }

    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .charts-grid {
        grid-template-columns: 1fr;
      }

      .quick-actions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LeadsDashboardComponent implements OnInit {
  private readonly leadService = inject(LeadService);

  loading = signal(false);
  statistics = signal<LeadStatistics | null>(null);
  highValueLeads = signal<Lead[]>([]);
  staleLeads = signal<Lead[]>([]);

  // Label mappings
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

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    
    this.leadService.getLeadStatistics().subscribe({
      next: (stats: LeadStatistics) => {
        this.statistics.set(stats);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error loading dashboard data:', error);
        this.loading.set(false);
      }
    });

    // Load additional data
    this.loadHighValueLeads();
    this.loadStaleLeads();
  }

  loadHighValueLeads(): void {
    this.leadService.getHighValueLeads().subscribe({
      next: (leads) => {
        this.highValueLeads.set(leads);
      },
      error: (error: unknown) => {
        console.error('Error loading high-value leads:', error);
      }
    });
  }

  loadStaleLeads(): void {
    this.leadService.getStaleLeads().subscribe({
      next: (leads) => {
        this.staleLeads.set(leads);
      },
      error: (error: unknown) => {
        console.error('Error loading stale leads:', error);
      }
    });
  }

  getPercentage(value?: number, total?: number): number {
    if (!value || !total || total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  getStatusDistribution(): Array<{status: LeadStatus, label: string, count: number}> {
    const stats = this.statistics();
    if (!stats?.byStatus) return [];

    return Object.entries(stats.byStatus).map(([status, count]) => ({
      status: status as LeadStatus,
      label: this.statusLabels[status as LeadStatus] || status,
      count
    })).sort((a, b) => b.count - a.count);
  }

  getSourceDistribution(): Array<{source: LeadSource, label: string, count: number}> {
    const stats = this.statistics();
    if (!stats?.bySource) return [];

    return Object.entries(stats.bySource).map(([source, count]) => ({
      source: source as LeadSource,
      label: this.sourceLabels[source as LeadSource] || source,
      count
    })).sort((a, b) => b.count - a.count);
  }

  getPriorityDistribution(): Array<{priority: LeadPriority, label: string, count: number}> {
    const stats = this.statistics();
    if (!stats?.byPriority) return [];

    return Object.entries(stats.byPriority).map(([priority, count]) => ({
      priority: priority as LeadPriority,
      label: this.priorityLabels[priority as LeadPriority] || priority,
      count
    })).sort((a, b) => b.count - a.count);
  }
}
