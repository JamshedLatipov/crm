import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';

import { LeadService } from '../../services/lead.service';
import { LeadStatistics, Lead, LeadStatus, LeadSource, LeadPriority } from '../../models/lead.model';

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
  templateUrl: './leads-dashboard.component.html',
  styleUrls: ['./leads-dashboard.component.scss']
})
export class LeadsDashboardComponent implements OnInit {
  private readonly leadService = inject(LeadService);

  loading = signal(false);
  statistics = signal<LeadStatistics | null>(null);
  highValueLeads = signal<Lead[]>([]);
  staleLeads = signal<Lead[]>([]);

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

  trackByStatus(_index: number, item: {status: LeadStatus, label: string, count: number}) {
    return item.status;
  }

  trackBySource(_index: number, item: {source: LeadSource, label: string, count: number}) {
    return item.source;
  }

  trackByPriority(_index: number, item: {priority: LeadPriority, label: string, count: number}) {
    return item.priority;
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.leadService.getLeadStatistics().subscribe({
      next: (stats: LeadStatistics) => {
        this.statistics.set(stats);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error loading dashboard data:', error as any);
        this.loading.set(false);
      }
    });

    this.loadHighValueLeads();
    this.loadStaleLeads();
  }

  loadHighValueLeads(): void {
    this.leadService.getHighValueLeads().subscribe({
      next: (leads) => this.highValueLeads.set(leads),
      error: (error: unknown) => console.error('Error loading high-value leads:', error as any)
    });
  }

  loadStaleLeads(): void {
    this.leadService.getStaleLeads().subscribe({
      next: (leads) => this.staleLeads.set(leads),
      error: (error: unknown) => console.error('Error loading stale leads:', error as any)
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
      label: this.statusLabels[status as LeadStatus] || (status as string),
      count: count as number
    })).sort((a, b) => b.count - a.count);
  }

  getSourceDistribution(): Array<{source: LeadSource, label: string, count: number}> {
    const stats = this.statistics();
    if (!stats?.bySource) return [];

    return Object.entries(stats.bySource).map(([source, count]) => ({
      source: source as LeadSource,
      label: this.sourceLabels[source as LeadSource] || (source as string),
      count: count as number
    })).sort((a, b) => b.count - a.count);
  }

  getPriorityDistribution(): Array<{priority: LeadPriority, label: string, count: number}> {
    const stats = this.statistics();
    if (!stats?.byPriority) return [];

    return Object.entries(stats.byPriority).map(([priority, count]) => ({
      priority: priority as LeadPriority,
      label: this.priorityLabels[priority as LeadPriority] || (priority as string),
      count: count as number
    })).sort((a, b) => b.count - a.count);
  }
}
