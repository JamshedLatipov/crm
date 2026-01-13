import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../shared/components/crm-table/crm-table.component';
import { CampaignApiService } from '../../services/campaign-api.service';
import {
  OutboundCampaign,
  CampaignStatistics,
  ContactStatus,
  CallOutcome,
} from '../../models/campaign.models';

@Component({
  selector: 'app-campaign-statistics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatSnackBarModule,
    PageLayoutComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
  ],
  templateUrl: './campaign-statistics.component.html',
  styleUrls: ['./campaign-statistics.component.scss'],
})
export class CampaignStatisticsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly campaignApi = inject(CampaignApiService);
  private readonly snackBar = inject(MatSnackBar);

  campaignId = signal<string>('');
  loading = signal(false);
  statistics = signal<CampaignStatistics | null>(null);

  // Table columns for crm-table
  statusColumns: CrmColumn[] = [
    { key: 'status', label: 'Статус', template: 'statusTemplate' },
    { key: 'count', label: 'Количество', template: 'countTemplate' },
    { key: 'percentage', label: 'Процент', template: 'percentageTemplate' },
  ];

  // Old table columns (deprecated)
  displayedColumns = ['status', 'count', 'percentage'];
  callsColumns = ['phone', 'name', 'status', 'attempts', 'lastCallAt'];

  readonly ContactStatus = ContactStatus;
  readonly CallOutcome = CallOutcome;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.campaignId.set(id);
      this.loadStatistics(id);
    }
  }

  loadStatistics(id: string): void {
    this.loading.set(true);
    this.campaignApi.getStatistics(id).subscribe({
      next: (stats) => {
        this.statistics.set(stats);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
        this.snackBar.open('Ошибка загрузки статистики', 'ОК', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  back(): void {
    this.router.navigate(['/contact-center/campaigns']);
  }

  getStatusLabel(status: ContactStatus): string {
    const labels = {
      [ContactStatus.PENDING]: 'Ожидает',
      [ContactStatus.CALLING]: 'Звонок',
      [ContactStatus.ANSWERED]: 'Отвечен',
      [ContactStatus.BUSY]: 'Занято',
      [ContactStatus.NO_ANSWER]: 'Не отвечает',
      [ContactStatus.FAILED]: 'Ошибка',
      [ContactStatus.COMPLETED]: 'Завершен',
      [ContactStatus.EXCLUDED]: 'Исключен',
    };
    return labels[status] || status;
  }

  getStatusColor(status: ContactStatus): string {
    const colors: Record<ContactStatus, string> = {
      [ContactStatus.PENDING]: 'default',
      [ContactStatus.CALLING]: 'primary',
      [ContactStatus.ANSWERED]: 'accent',
      [ContactStatus.BUSY]: 'warn',
      [ContactStatus.NO_ANSWER]: 'warn',
      [ContactStatus.FAILED]: 'warn',
      [ContactStatus.COMPLETED]: 'accent',
      [ContactStatus.EXCLUDED]: 'default',
    };
    return colors[status] || 'default';
  }

  calculatePercentage(count: number): number {
    const total = this.statistics()?.totalContacts || 0;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getCampaignName(): string {
    return this.statistics()?.campaign?.name || 'Кампания';
  }

  exportToCSV(): void {
    const stats = this.statistics();
    if (!stats) return;

    const rows = [
      ['Статус', 'Количество', 'Процент'],
      ...stats.contactsByStatus.map((item) => [
        this.getStatusLabel(item.status),
        item.count.toString(),
        this.calculatePercentage(item.count) + '%',
      ]),
    ];

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `campaign_${this.campaignId()}_statistics.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
