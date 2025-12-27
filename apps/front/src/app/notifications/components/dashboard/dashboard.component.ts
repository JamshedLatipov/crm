import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-notifications-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    PageLayoutComponent
  ],
  template: `
    <app-page-layout
      title="Центр уведомлений"
      subtitle="Управление многоканальными рассылками"
    >
      <div page-actions>
        <button mat-raised-button color="primary" routerLink="/notifications/campaigns/new">
          <mat-icon>add</mat-icon>
          Создать кампанию
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon sms">
              <mat-icon>sms</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">SMS рассылки</div>
              <div class="stat-value">Скоро</div>
            </div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon email">
              <mat-icon>email</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">Email кампании</div>
              <div class="stat-value">Скоро</div>
            </div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon webhook">
              <mat-icon>webhook</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">Webhooks</div>
              <div class="stat-value">Скоро</div>
            </div>
          </div>
        </mat-card>
      </div>

      <!-- Info Card -->
      <mat-card class="info-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>info</mat-icon>
            Модуль в разработке
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="description">Центр уведомлений находится в разработке. Здесь будет доступно:</p>
          <ul class="feature-list">
            <li><mat-icon>check_circle</mat-icon>SMS рассылки через SMS.RU, SMSC.RU, Twilio</li>
            <li><mat-icon>check_circle</mat-icon>Email рассылки через SMTP</li>
            <li><mat-icon>check_circle</mat-icon>REST API/Webhooks для интеграций</li>
            <li><mat-icon>check_circle</mat-icon>Многоканальные кампании</li>
            <li><mat-icon>check_circle</mat-icon>Сегментация контактов</li>
            <li><mat-icon>check_circle</mat-icon>Аналитика и отчеты</li>
          </ul>
        </mat-card-content>
      </mat-card>
    </app-page-layout>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .stat-card {
      transition: all 0.3s ease;
      cursor: default;
      
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 8px;
    }

    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: white;
      }

      &.sms {
        background: linear-gradient(135deg, #06B6D4 0%, #0891B2 100%);
      }

      &.email {
        background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      }

      &.webhook {
        background: linear-gradient(135deg, #A855F7 0%, #9333EA 100%);
      }
    }

    .stat-info {
      flex: 1;
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
    }

    .info-card {
      mat-card-header {
        margin-bottom: 16px;
        
        mat-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 20px;
          font-weight: 600;
          
          mat-icon {
            color: var(--primary-color);
          }
        }
      }

      .description {
        font-size: 16px;
        color: #4b5563;
        margin-bottom: 16px;
      }

      .feature-list {
        list-style: none;
        padding: 0;
        margin: 0;
        
        li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          font-size: 15px;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          
          &:last-child {
            border-bottom: none;
          }
          
          mat-icon {
            color: #10b981;
            font-size: 20px;
            width: 20px;
            height: 20px;
          }
        }
      }
    }
  `],
})
export class DashboardComponent {}
