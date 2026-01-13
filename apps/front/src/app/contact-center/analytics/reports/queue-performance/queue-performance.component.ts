import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { CallFilters, QueuePerformance } from '../../models/analytics.models';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';

@Component({
  selector: 'app-queue-performance',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    ReportFiltersComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
  ],
  templateUrl: './queue-performance.component.html',
  styleUrls: ['./queue-performance.component.scss'],
})
export class QueuePerformanceComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);

  data = signal<QueuePerformance | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  columnsQueue: CrmColumn[] = [
    { key: 'queue', label: 'Очередь' },
    { key: 'totalCalls', label: 'Всего', cell: (row: any) => row.totalCalls.toString() },
    { key: 'answeredCalls', label: 'Отвечено', cell: (row: any) => row.answeredCalls.toString() },
    { key: 'abandonedCalls', label: 'Брошено', cell: (row: any) => row.abandonedCalls.toString() },
    { key: 'answerRate', label: '% ответов', template: 'answerRateTemplate' },
    { key: 'avgWaitTime', label: 'Ср. ожидание', template: 'avgWaitTimeTemplate' },
    { key: 'maxWaitTime', label: 'Макс. ожидание', template: 'maxWaitTimeTemplate' },
    { key: 'avgTalkTime', label: 'Ср. разговор', template: 'avgTalkTimeTemplate' },
    { key: 'serviceLevelCompliance', label: 'SLA %', template: 'slaTemplate' },
  ];

  columnsAgents: CrmColumn[] = [
    { key: 'queue', label: 'Очередь' },
    { key: 'agent', label: 'Оператор' },
    { key: 'callsHandled', label: 'Обработано звонков', cell: (row: any) => row.callsHandled.toString() },
    { key: 'avgHandleTime', label: 'Ср. время обработки', template: 'avgHandleTimeTemplate' },
  ];

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
    // Data will be loaded when filters change from ReportFiltersComponent
  }

  onFiltersChange(filters: CallFilters): void {
    this.loadData(filters);
  }

  private loadData(filters: CallFilters): void {
    // Prevent duplicate requests
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.analyticsApi.getQueuePerformance(filters).subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading queue performance data:', err);
        this.error.set('Ошибка загрузки данных. Попробуйте еще раз.');
        this.loading.set(false);
      },
    });
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
