import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { CallFilters, QueuePerformance } from '../../models/analytics.models';

@Component({
  selector: 'app-queue-performance',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    ReportFiltersComponent,
  ],
  templateUrl: './queue-performance.component.html',
  styleUrls: ['./queue-performance.component.scss'],
})
export class QueuePerformanceComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);

  data = signal<QueuePerformance | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  displayedColumnsQueue: string[] = [
    'queue',
    'totalCalls',
    'answeredCalls',
    'abandonedCalls',
    'answerRate',
    'avgWaitTime',
    'maxWaitTime',
    'avgTalkTime',
    'serviceLevelCompliance',
  ];

  displayedColumnsAgents: string[] = ['queue', 'agent', 'callsHandled', 'avgHandleTime'];

  hasData = computed(() => {
    const d = this.data();
    return d && d.totalCalls > 0;
  });

  // Chart for hourly distribution
  hourlyChartData = computed<ChartConfiguration['data']>(() => {
    const d = this.data();
    if (!d) {
      return { datasets: [] };
    }

    return {
      labels: d.hourlyStats.map((h) => `${h.hour}:00`),
      datasets: [
        {
          label: 'Всего звонков',
          data: d.hourlyStats.map((h) => h.totalCalls),
          backgroundColor: 'rgba(33, 150, 243, 0.5)',
          borderColor: 'rgba(33, 150, 243, 1)',
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Отвечено',
          data: d.hourlyStats.map((h) => h.answeredCalls),
          backgroundColor: 'rgba(76, 175, 80, 0.5)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Среднее время ожидания (сек)',
          data: d.hourlyStats.map((h) => h.avgWaitTime),
          backgroundColor: 'rgba(255, 152, 0, 0.5)',
          borderColor: 'rgba(255, 152, 0, 1)',
          borderWidth: 2,
          type: 'line',
          yAxisID: 'y1',
        },
      ],
    };
  });

  hourlyChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: 'Распределение звонков по часам',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        title: {
          display: true,
          text: 'Количество звонков',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Время ожидания (сек)',
        },
      },
    },
  };

  ngOnInit(): void {
    this.loadData({
      startDate: this.getDefaultStartDate(),
      endDate: this.getDefaultEndDate(),
    });
  }

  onFiltersChange(filters: CallFilters): void {
    this.loadData(filters);
  }

  private loadData(filters: CallFilters): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsApi.getQueuePerformance(filters).subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading queue performance data:', err);
        this.error.set('Ошибка загрузки данных');
        this.loading.set(false);
      },
    });
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getAnswerRateClass(rate: number): string {
    if (rate >= 90) return 'excellent';
    if (rate >= 80) return 'good';
    if (rate >= 70) return 'warning';
    return 'danger';
  }

  getSlaClass(rate: number): string {
    if (rate >= 85) return 'excellent';
    if (rate >= 75) return 'good';
    if (rate >= 65) return 'warning';
    return 'danger';
  }
}
