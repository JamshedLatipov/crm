import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-campaign-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="stats-container">
      <h1>Статистика кампании</h1>

      <div class="stats-grid">
        <mat-card>
          <mat-card-content>
            <div class="stat-item">
              <mat-icon color="primary">send</mat-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats().sent }}</div>
                <div class="stat-label">Отправлено</div>
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

      <mat-card class="progress-card">
        <mat-card-header>
          <mat-card-title>Прогресс отправки</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-progress-bar 
            mode="determinate" 
            [value]="progressPercent()">
          </mat-progress-bar>
          <p class="progress-text">
            {{ stats().sent }} из {{ stats().total }} ({{ progressPercent() }}%)
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .stats-container {
      padding: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin: 24px 0;
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

    .progress-card {
      margin-top: 24px;
    }

    .progress-text {
      margin-top: 8px;
      text-align: center;
      color: #666;
    }
  `]
})
export class CampaignStatsComponent implements OnInit {
  campaignId = signal<string>('');
  stats = signal({
    sent: 850,
    delivered: 820,
    failed: 30,
    total: 1000,
    deliveryRate: 96.5
  });

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.campaignId.set(id || '');
    // TODO: Загрузить статистику через сервис
  }

  progressPercent(): number {
    const s = this.stats();
    return Math.round((s.sent / s.total) * 100);
  }
}
