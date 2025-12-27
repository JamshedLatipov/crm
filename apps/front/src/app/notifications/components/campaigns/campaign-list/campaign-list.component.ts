import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Campaign {
  id: string;
  name: string;
  status: string;
  channel: string;
  scheduledAt?: Date;
  sentCount: number;
  totalRecipients: number;
}

@Component({
  selector: 'app-campaign-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="campaign-list-container">
      <div class="header">
        <h1>Кампании уведомлений</h1>
        <button mat-raised-button color="primary" routerLink="/notifications/campaigns/new">
          <mat-icon>add</mat-icon>
          Создать кампанию
        </button>
      </div>

      @if (loading()) {
        <div class="loading">
          <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        </div>
      } @else {
        <table mat-table [dataSource]="campaigns()" class="campaigns-table">
          
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Название</th>
            <td mat-cell *matCellDef="let campaign">{{ campaign.name }}</td>
          </ng-container>

          <ng-container matColumnDef="channel">
            <th mat-header-cell *matHeaderCellDef>Канал</th>
            <td mat-cell *matCellDef="let campaign">
              <mat-chip>{{ campaign.channel }}</mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Статус</th>
            <td mat-cell *matCellDef="let campaign">
              <mat-chip [class]="'status-' + campaign.status">
                {{ getStatusLabel(campaign.status) }}
              </mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="progress">
            <th mat-header-cell *matHeaderCellDef>Прогресс</th>
            <td mat-cell *matCellDef="let campaign">
              {{ campaign.sentCount }} / {{ campaign.totalRecipients }}
            </td>
          </ng-container>

          <ng-container matColumnDef="scheduledAt">
            <th mat-header-cell *matHeaderCellDef>Запланировано</th>
            <td mat-cell *matCellDef="let campaign">
              {{ campaign.scheduledAt ? (campaign.scheduledAt | date:'short') : '—' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Действия</th>
            <td mat-cell *matCellDef="let campaign">
              <button mat-icon-button [routerLink]="['/notifications/campaigns', campaign.id]" matTooltip="Редактировать">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button [routerLink]="['/notifications/campaigns', campaign.id, 'stats']" matTooltip="Статистика">
                <mat-icon>bar_chart</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      }
    </div>
  `,
  styles: [`
    .campaign-list-container {
      padding: 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .campaigns-table {
      width: 100%;
    }

    mat-chip {
      &.status-draft { background-color: #9e9e9e; }
      &.status-scheduled { background-color: #2196f3; }
      &.status-running { background-color: #ff9800; }
      &.status-completed { background-color: #4caf50; }
      &.status-failed { background-color: #f44336; }
      color: white;
    }
  `]
})
export class CampaignListComponent implements OnInit {
  loading = signal(false);
  campaigns = signal<Campaign[]>([]);
  displayedColumns = ['name', 'channel', 'status', 'progress', 'scheduledAt', 'actions'];

  ngOnInit() {
    // TODO: Загрузить кампании через сервис
    this.campaigns.set([
      {
        id: '1',
        name: 'Пример кампании',
        status: 'draft',
        channel: 'SMS',
        sentCount: 0,
        totalRecipients: 100
      }
    ]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      scheduled: 'Запланирована',
      running: 'Выполняется',
      completed: 'Завершена',
      failed: 'Ошибка'
    };
    return labels[status] || status;
  }
}
