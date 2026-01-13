import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import { CallFilters, SlaMetrics } from '../../models/analytics.models';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';

@Component({
  selector: 'app-sla-metrics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    BaseChartDirective,
    ReportFiltersComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
  ],
  templateUrl: './sla-metrics.component.html',
  styleUrls: ['./sla-metrics.component.scss'],
})
export class SlaMetricsComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);

  loading = signal(false);
  data = signal<SlaMetrics | null>(null);
  error = signal<string | null>(null);

  // Computed chart data
  trendChartData = computed(() => {
    const metrics = this.data();
    if (!metrics || metrics.trend.length === 0) return null;

    return {
      labels: metrics.trend.map((t) => {
        const date = new Date(t.date);
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
        });
      }),
      datasets: [
        {
          label: 'SLA соответствие (%)',
          data: metrics.trend.map((t) => t.complianceRate),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  });

  columns: CrmColumn[] = [
    { key: 'queue', label: 'Очередь' },
    { key: 'totalCalls', label: 'Всего звонков', cell: (row: any) => row.totalCalls.toString() },
    { key: 'compliantCalls', label: 'Соответствует SLA', template: 'compliantTemplate' },
    { key: 'violatedCalls', label: 'Нарушений', template: 'violatedTemplate' },
    { key: 'complianceRate', label: 'Соответствие', template: 'complianceRateTemplate' },
    { key: 'avgWaitTime', label: 'Ср. ожидание', template: 'avgWaitTimeTemplate' },
  ];

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      },
    },
  };

  ngOnInit(): void {
    // Data will be loaded when filters change from ReportFiltersComponent
  }

  onFiltersChange(filters: CallFilters): void {
    this.loadData(filters);
  }

  loadData(filters: CallFilters): void {
    // Prevent duplicate requests
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.analyticsApi.getSlaMetrics(filters).subscribe({
      next: (response: SlaMetrics) => {
        this.data.set(response);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading SLA metrics:', err);
        this.error.set('Ошибка загрузки данных. Попробуйте еще раз.');
        this.loading.set(false);
      },
    });
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}м ${secs}с`;
  }

  getComplianceClass(rate: number): string {
    if (rate >= 95) return 'excellent';
    if (rate >= 90) return 'good';
    if (rate >= 80) return 'warning';
    return 'danger';
  }
}
