import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { CampaignService } from '../../../services/campaign.service';
import { Campaign } from '../../../models/notification.models';

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
    MatProgressSpinnerModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
    PageLayoutComponent
  ],
  template: `
    <app-page-layout
      title="Кампании уведомлений"
      [subtitle]="'Всего: ' + campaigns().length + ' кампаний'"
    >
      <div page-actions>
        <button mat-raised-button color="primary" routerLink="/notifications/campaigns/new">
          <mat-icon>add</mat-icon>
          Создать кампанию
        </button>
        <button mat-stroked-button [matMenuTriggerFor]="filterMenu">
          <mat-icon>filter_list</mat-icon>
          Фильтры
        </button>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (campaigns().length === 0) {
        <div class="empty-state">
          <mat-icon>campaign</mat-icon>
          <h3>Нет кампаний</h3>
          <p>Создайте первую кампанию для рассылки уведомлений</p>
          <button mat-raised-button color="primary" routerLink="/notifications/campaigns/new">
            <mat-icon>add</mat-icon>
            Создать кампанию
          </button>
        </div>
      } @else {
        <div class="modern-table-container">
          <div class="table-wrapper">
            <table mat-table [dataSource]="campaigns()" class="modern-table">
              
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Название</th>
                <td mat-cell *matCellDef="let campaign">
                  <div class="campaign-name">
                    <strong>{{ campaign.name }}</strong>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="channel">
                <th mat-header-cell *matHeaderCellDef>Канал</th>
                <td mat-cell *matCellDef="let campaign">
                  <div class="channel-badge" [class]="'channel-' + campaign.channel.toLowerCase()">
                    <mat-icon>{{ getChannelIcon(campaign.channel) }}</mat-icon>
                    <span>{{ campaign.channel }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Статус</th>
                <td mat-cell *matCellDef="let campaign">
                  <span class="status-badge" [class]="'status-' + campaign.status">
                    {{ getStatusLabel(campaign.status) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="progress">
                <th mat-header-cell *matHeaderCellDef>Прогресс</th>
                <td mat-cell *matCellDef="let campaign">
                  <div class="progress-info">
                    <span>{{ campaign.sentCount }} / {{ campaign.totalRecipients }}</span>
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="(campaign.sentCount / campaign.totalRecipients) * 100"></div>
                    </div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="scheduledAt">
                <th mat-header-cell *matHeaderCellDef>Запланировано</th>
                <td mat-cell *matCellDef="let campaign">
                  {{ campaign.scheduledAt ? (campaign.scheduledAt | date:'dd.MM.yyyy HH:mm') : '—' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="actions-column">Действия</th>
                <td mat-cell *matCellDef="let campaign" class="actions-column">
                  @if (campaign.status === 'draft') {
                    <button mat-icon-button (click)="startCampaign(campaign)" matTooltip="Запустить">
                      <mat-icon>play_arrow</mat-icon>
                    </button>
                  }
                  @if (campaign.status === 'running') {
                    <button mat-icon-button (click)="pauseCampaign(campaign)" matTooltip="Приостановить">
                      <mat-icon>pause</mat-icon>
                    </button>
                  }
                  <button mat-icon-button [routerLink]="['/notifications/campaigns', campaign.id]" matTooltip="Редактировать">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button [routerLink]="['/notifications/campaigns', campaign.id, 'stats']" matTooltip="Статистика">
                    <mat-icon>bar_chart</mat-icon>
                  </button>
                  <button mat-icon-button [matMenuTriggerFor]="actionMenu" matTooltip="Еще">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  
                  <mat-menu #actionMenu="matMenu">
                    <button mat-menu-item (click)="deleteCampaign(campaign)">
                      <mat-icon>delete</mat-icon>
                      <span>Удалить</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
            </table>
          </div>
        </div>
      }

      <mat-menu #filterMenu="matMenu">
        <button mat-menu-item>
          <mat-icon>filter_list</mat-icon>
          <span>По статусу</span>
        </button>
        <button mat-menu-item>
          <mat-icon>swap_vert</mat-icon>
          <span>По дате</span>
        </button>
      </mat-menu>
    </app-page-layout>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 80px 20px;
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      
      mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        color: #9ca3af;
        margin-bottom: 16px;
      }
      
      h3 {
        font-size: 24px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 8px 0;
      }
      
      p {
        font-size: 16px;
        color: #6b7280;
        margin: 0 0 24px 0;
      }
    }

    .modern-table-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .modern-table {
      width: 100%;
      
      th {
        background: #f9fafb;
        color: #374151;
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        border-bottom: 2px solid #e5e7eb;
      }
      
      td {
        padding: 16px 20px;
        border-bottom: 1px solid #f3f4f6;
      }
      
      .table-row {
        transition: background-color 0.2s;
        
        &:hover {
          background-color: #f9fafb;
        }
      }
    }

    .campaign-name {
      strong {
        color: #111827;
        font-size: 15px;
      }
    }

    .channel-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      
      &.channel-sms {
        background: #e0f2fe;
        color: #0369a1;
      }
      
      &.channel-email {
        background: #fed7aa;
        color: #c2410c;
      }
      
      &.channel-webhook {
        background: #e9d5ff;
        color: #7c3aed;
      }
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      
      &.status-draft {
        background: #f3f4f6;
        color: #4b5563;
      }
      
      &.status-scheduled {
        background: #dbeafe;
        color: #1e40af;
      }
      
      &.status-running {
        background: #fef3c7;
        color: #b45309;
      }
      
      &.status-completed {
        background: #d1fae5;
        color: #065f46;
      }
      
      &.status-failed {
        background: #fee2e2;
        color: #991b1b;
      }
    }

    .progress-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 120px;
      
      > span {
        font-size: 13px;
        color: #6b7280;
      }
    }

    .progress-bar {
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4285f4 0%, #667eea 100%);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .actions-column {
      text-align: right;
      width: 150px;
    }
  `]
})
export class CampaignListComponent implements OnInit {
  private readonly campaignService = inject(CampaignService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  loading = this.campaignService.isLoading;
  campaigns = this.campaignService.campaigns;
  error = this.campaignService.error;
  displayedColumns = ['name', 'channel', 'status', 'progress', 'scheduledAt', 'actions'];

  ngOnInit() {
    this.loadCampaigns();
  }

  loadCampaigns() {
    this.campaignService.getAll().subscribe({
      error: (error) => {
        this.snackBar.open('Ошибка загрузки кампаний', 'Закрыть', { duration: 3000 });
      }
    });
  }

  startCampaign(campaign: Campaign) {
    this.campaignService.start(campaign.id).subscribe({
      next: () => {
        this.snackBar.open('Кампания запущена', 'Закрыть', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Ошибка запуска кампании', 'Закрыть', { duration: 3000 });
      }
    });
  }

  pauseCampaign(campaign: Campaign) {
    this.campaignService.pause(campaign.id).subscribe({
      next: () => {
        this.snackBar.open('Кампания приостановлена', 'Закрыть', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Ошибка приостановки кампании', 'Закрыть', { duration: 3000 });
      }
    });
  }

  deleteCampaign(campaign: Campaign) {
    if (confirm(`Удалить кампанию "${campaign.name}"?`)) {
      this.campaignService.delete(campaign.id).subscribe({
        next: () => {
          this.snackBar.open('Кампания удалена', 'Закрыть', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Ошибка удаления кампании', 'Закрыть', { duration: 3000 });
        }
      });
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      scheduled: 'Запланирована',
      running: 'Выполняется',
      paused: 'Приостановлена',
      completed: 'Завершена',
      cancelled: 'Отменена',
      failed: 'Ошибка'
    };
    return labels[status] || status;
  }

  getChannelIcon(channel: string): string {
    const icons: Record<string, string> = {
      SMS: 'sms',
      EMAIL: 'email',
      WEBHOOK: 'webhook'
    };
    return icons[channel] || 'notifications';
  }
}
