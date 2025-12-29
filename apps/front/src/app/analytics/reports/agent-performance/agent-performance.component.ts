import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import {
  CallFilters,
  AgentPerformance,
  AgentPerformanceResponse,
} from '../../models/analytics.models';

@Component({
  selector: 'app-agent-performance',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    ReportFiltersComponent,
  ],
  templateUrl: './agent-performance.component.html',
  styleUrls: ['./agent-performance.component.scss'],
})
export class AgentPerformanceComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);

  loading = signal(false);
  data = signal<AgentPerformance[]>([]);
  error = signal<string | null>(null);

  displayedColumns = [
    'agent',
    'totalCalls',
    'answeredCalls',
    'missedCalls',
    'avgTalkTime',
    'avgWaitTime',
    'totalTalkTime',
  ];

  ngOnInit(): void {
    // Data will be loaded when filters change
  }

  onFiltersChange(filters: CallFilters): void {
    this.loadData(filters);
  }

  loadData(filters: CallFilters): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsApi.getAgentPerformance(filters).subscribe({
      next: (response: AgentPerformanceResponse) => {
        this.data.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading agent performance:', err);
        this.error.set('Ошибка загрузки данных');
        this.loading.set(false);
      },
    });
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    } else if (minutes > 0) {
      return `${minutes}м ${secs}с`;
    } else {
      return `${secs}с`;
    }
  }

  exportToCSV(): void {
    const headers = [
      'Оператор',
      'Всего звонков',
      'Отвечено',
      'Пропущено',
      'Ср. время разговора',
      'Ср. время ожидания',
      'Общее время разговора',
    ];

    const rows = this.data().map((agent) => [
      agent.agent,
      agent.totalCalls.toString(),
      agent.answeredCalls.toString(),
      agent.missedCalls.toString(),
      this.formatTime(agent.avgTalkTime),
      this.formatTime(agent.avgWaitTime),
      this.formatTime(agent.totalTalkTime),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `agent-performance-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
