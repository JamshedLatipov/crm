import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../shared/components/crm-table/crm-table.component';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { CampaignApiService } from '../../services/campaign-api.service';
import {
  OutboundCampaign,
  CampaignStatus,
  CampaignType,
} from '../../models/campaign.models';

@Component({
  selector: 'app-campaign-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    PageLayoutComponent,
  ],
  templateUrl: './campaign-list.component.html',
  styleUrls: ['./campaign-list.component.scss'],
})
export class CampaignListComponent implements OnInit {
  private readonly campaignApi = inject(CampaignApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  loading = signal(false);
  campaigns = signal<OutboundCampaign[]>([]);
  error = signal<string | null>(null);

  readonly CampaignStatus = CampaignStatus;
  readonly CampaignType = CampaignType;

  columns: CrmColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'type', label: 'Тип', template: 'typeTemplate' },
    { key: 'status', label: 'Статус', template: 'statusTemplate' },
    { key: 'queue', label: 'Очередь', template: 'queueTemplate' },
    { key: 'creator', label: 'Создатель', template: 'creatorTemplate' },
    { key: 'createdAt', label: 'Создана', template: 'dateTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' },
  ];

  ngOnInit(): void {
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.loading.set(true);
    this.error.set(null);

    this.campaignApi.getCampaigns().subscribe({
      next: (campaigns) => {
        this.campaigns.set(campaigns);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading campaigns:', err);
        this.error.set('Ошибка загрузки кампаний');
        this.loading.set(false);
      },
    });
  }

  createCampaign(): void {
    this.router.navigate(['/contact-center/campaigns/new']);
  }

  editCampaign(campaign: OutboundCampaign): void {
    this.router.navigate(['/contact-center/campaigns', campaign.id, 'edit']);
  }

  uploadContacts(campaign: OutboundCampaign): void {
    this.router.navigate(['/contact-center/campaigns', campaign.id, 'contacts']);
  }

  viewStatistics(campaign: OutboundCampaign): void {
    this.router.navigate(['/contact-center/campaigns', campaign.id, 'statistics']);
  }

  startCampaign(campaign: OutboundCampaign): void {
    this.campaignApi.startCampaign(campaign.id).subscribe({
      next: () => {
        this.snackBar.open('Кампания запущена', 'ОК', { duration: 3000 });
        this.loadCampaigns();
      },
      error: (err) => {
        console.error('Error starting campaign:', err);
        this.snackBar.open('Ошибка запуска кампании', 'ОК', { duration: 3000 });
      },
    });
  }

  stopCampaign(campaign: OutboundCampaign): void {
    this.campaignApi.stopCampaign(campaign.id).subscribe({
      next: () => {
        this.snackBar.open('Кампания остановлена', 'ОК', { duration: 3000 });
        this.loadCampaigns();
      },
      error: (err) => {
        console.error('Error stopping campaign:', err);
        this.snackBar.open('Ошибка остановки кампании', 'ОК', { duration: 3000 });
      },
    });
  }

  pauseCampaign(campaign: OutboundCampaign): void {
    this.campaignApi.pauseCampaign(campaign.id).subscribe({
      next: () => {
        this.snackBar.open('Кампания приостановлена', 'ОК', { duration: 3000 });
        this.loadCampaigns();
      },
      error: (err) => {
        console.error('Error pausing campaign:', err);
        this.snackBar.open('Ошибка приостановки кампании', 'ОК', { duration: 3000 });
      },
    });
  }

  resumeCampaign(campaign: OutboundCampaign): void {
    this.campaignApi.resumeCampaign(campaign.id).subscribe({
      next: () => {
        this.snackBar.open('Кампания возобновлена', 'ОК', { duration: 3000 });
        this.loadCampaigns();
      },
      error: (err) => {
        console.error('Error resuming campaign:', err);
        this.snackBar.open('Ошибка возобновления кампании', 'ОК', { duration: 3000 });
      },
    });
  }

  deleteCampaign(campaign: OutboundCampaign): void {
    if (!confirm(`Удалить кампанию "${campaign.name}"?`)) {
      return;
    }

    this.campaignApi.deleteCampaign(campaign.id).subscribe({
      next: () => {
        this.snackBar.open('Кампания удалена', 'ОК', { duration: 3000 });
        this.loadCampaigns();
      },
      error: (err) => {
        console.error('Error deleting campaign:', err);
        this.snackBar.open('Ошибка удаления кампании', 'ОК', { duration: 3000 });
      },
    });
  }

  getStatusLabel(status: CampaignStatus): string {
    const labels: Record<CampaignStatus, string> = {
      [CampaignStatus.DRAFT]: 'Черновик',
      [CampaignStatus.SCHEDULED]: 'Запланирована',
      [CampaignStatus.RUNNING]: 'Активна',
      [CampaignStatus.PAUSED]: 'Приостановлена',
      [CampaignStatus.COMPLETED]: 'Завершена',
      [CampaignStatus.STOPPED]: 'Остановлена',
    };
    return labels[status];
  }

  getTypeLabel(type: CampaignType): string {
    const labels: Record<CampaignType, string> = {
      [CampaignType.IVR]: 'IVR',
      [CampaignType.AGENT]: 'Оператор',
      [CampaignType.HYBRID]: 'Гибрид',
    };
    return labels[type];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCreatorName(creator: { firstName: string; lastName: string; username: string }): string {
    const fullName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
    return fullName || creator.username;
  }
}
