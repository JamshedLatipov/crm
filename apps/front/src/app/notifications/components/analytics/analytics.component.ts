import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule
  ],
  template: `
    <div class="analytics-container">
      <div class="header">
        <h1>Аналитика уведомлений</h1>
        <div class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Период</mat-label>
            <mat-select [(value)]="selectedPeriod">
              <mat-option value="today">Сегодня</mat-option>
              <mat-option value="week">Неделя</mat-option>
              <mat-option value="month">Месяц</mat-option>
              <mat-option value="custom">Произвольный</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Общая статистика -->
      <div class="stats-grid">
        <mat-card>
          <mat-card-content>
            <div class="stat-item">
              <mat-icon color="primary">send</mat-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats().total }}</div>
                <div class="stat-label">Всего отправлено</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <div class="stat-item">
              <mat-icon color="accent">check_circle</mat-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats().delivered }}</div>
                <div class="stat-label">Доставлено</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <div class="stat-item">
              <mat-icon color="warn">error</mat-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats().failed }}</div>
                <div class="stat-label">Ошибки</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <div class="stat-item">
              <mat-icon>trending_up</mat-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats().deliveryRate }}%</div>
                <div class="stat-label">Доставляемость</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Статистика по каналам -->
      <mat-card class="channel-stats">
        <mat-card-header>
          <mat-card-title>Статистика по каналам</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="channels-grid">
            @for (channel of channelStats(); track channel.name) {
              <div class="channel-item">
                <h3>{{ channel.name }}</h3>
                <div class="channel-metrics">
                  <div class="metric">
                    <span class="metric-label">Отправлено:</span>
                    <span class="metric-value">{{ channel.sent }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Доставлено:</span>
                    <span class="metric-value">{{ channel.delivered }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Ошибки:</span>
                    <span class="metric-value error">{{ channel.failed }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Доставляемость:</span>
                    <span class="metric-value success">{{ channel.deliveryRate }}%</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- График (заглушка) -->
      <mat-card class="chart-card">
        <mat-card-header>
          <mat-card-title>График отправок</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-placeholder">
            <mat-icon>bar_chart</mat-icon>
            <p>График будет добавлен позже (Chart.js, ngx-charts или другая библиотека)</p>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Топ кампаний -->
      <mat-card class="campaigns-card">
        <mat-card-header>
          <mat-card-title>Топ кампаний</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="campaigns-list">
            @for (campaign of topCampaigns(); track campaign.id) {
              <div class="campaign-item">
                <div class="campaign-name">{{ campaign.name }}</div>
                <div class="campaign-stat">
                  {{ campaign.sent }} отправлено · 
                  {{ campaign.deliveryRate }}% доставлено
                </div>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .analytics-container {
      padding: 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: bold;
    }

    .stat-label {
      color: #666;
      font-size: 14px;
    }

    .channel-stats {
      margin-bottom: 24px;
    }

    .channels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-top: 16px;
    }

    .channel-item {
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .channel-item h3 {
      margin: 0 0 16px 0;
      color: #2196f3;
    }

    .channel-metrics {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric {
      display: flex;
      justify-content: space-between;
    }

    .metric-label {
      color: #666;
    }

    .metric-value {
      font-weight: bold;
      
      &.error {
        color: #f44336;
      }
      
      &.success {
        color: #4caf50;
      }
    }

    .chart-card {
      margin-bottom: 24px;
    }

    .chart-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      color: #999;
    }

    .chart-placeholder mat-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      opacity: 0.3;
    }

    .campaigns-list {
      margin-top: 16px;
    }

    .campaign-item {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      
      &:last-child {
        border-bottom: none;
      }
    }

    .campaign-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .campaign-stat {
      color: #666;
      font-size: 14px;
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  selectedPeriod = 'week';
  
  stats = signal({
    total: 12450,
    delivered: 11980,
    failed: 470,
    deliveryRate: 96.2
  });

  channelStats = signal([
    {
      name: 'SMS',
      sent: 5400,
      delivered: 5280,
      failed: 120,
      deliveryRate: 97.8
    },
    {
      name: 'Email',
      sent: 6200,
      delivered: 5900,
      failed: 300,
      deliveryRate: 95.2
    },
    {
      name: 'Webhook',
      sent: 850,
      delivered: 800,
      failed: 50,
      deliveryRate: 94.1
    }
  ]);

  topCampaigns = signal([
    { id: '1', name: 'Новогодняя акция', sent: 3200, deliveryRate: 98.1 },
    { id: '2', name: 'Приветствие новых клиентов', sent: 2850, deliveryRate: 97.5 },
    { id: '3', name: 'Напоминание о встрече', sent: 2100, deliveryRate: 96.8 },
    { id: '4', name: 'Еженедельная рассылка', sent: 1950, deliveryRate: 95.2 },
    { id: '5', name: 'Статус заказа', sent: 1500, deliveryRate: 99.0 }
  ]);

  ngOnInit() {
    // TODO: Загрузить данные через сервис
  }
}
