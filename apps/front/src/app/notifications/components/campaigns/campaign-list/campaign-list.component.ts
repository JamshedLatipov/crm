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
  templateUrl: './campaign-list.component.html',
  styleUrl: './campaign-list.component.scss'
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
