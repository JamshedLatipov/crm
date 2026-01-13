import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { CallFilters, IvrAnalysis } from '../../models/analytics.models';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';

@Component({
  selector: 'app-ivr-analysis',
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
  templateUrl: './ivr-analysis.component.html',
  styleUrls: ['./ivr-analysis.component.scss'],
})
export class IvrAnalysisComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);

  data = signal<IvrAnalysis | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  columnsPaths: CrmColumn[] = [
    { key: 'path', label: 'Путь' },
    { key: 'callCount', label: 'Кол-во звонков', cell: (row: any) => row.callCount.toString() },
    { key: 'percentage', label: '%', template: 'percentageTemplate' },
    { key: 'avgTimeInIvr', label: 'Ср. время в IVR', template: 'avgTimeTemplate' },
    { key: 'completionRate', label: 'Завершенность', template: 'completionTemplate' },
  ];

  columnsNodes: CrmColumn[] = [
    { key: 'nodeName', label: 'Узел' },
    { key: 'visits', label: 'Посещений', cell: (row: any) => row.visits.toString() },
    { key: 'exitCount', label: 'Выходов', cell: (row: any) => row.exitCount.toString() },
    { key: 'exitRate', label: 'Процент выхода', template: 'exitRateTemplate' },
  ];

  columnsDtmf: CrmColumn[] = [
    { key: 'digit', label: 'Цифра' },
    { key: 'nodeName', label: 'Узел' },
    { key: 'count', label: 'Кол-во', cell: (row: any) => row.count.toString() },
    { key: 'percentage', label: '%', template: 'percentageTemplate' },
  ];

  hasData = computed(() => {
    const d = this.data();
    return d && d.totalSessions > 0;
  });

  pathsChartData = computed<ChartConfiguration['data']>(() => {
    const d = this.data();
    if (!d || d.paths.length === 0) return { datasets: [] };
    return {
      labels: d.paths.slice(0, 5).map(p => p.path.length > 30 ? p.path.substring(0, 30) + '...' : p.path),
      datasets: [{
        data: d.paths.slice(0, 5).map(p => p.callCount),
        backgroundColor: ['rgba(33, 150, 243, 0.8)', 'rgba(76, 175, 80, 0.8)', 'rgba(255, 152, 0, 0.8)', 'rgba(156, 39, 176, 0.8)', 'rgba(255, 235, 59, 0.8)'],
      }],
    };
  });

  dtmfChartData = computed<ChartConfiguration['data']>(() => {
    const d = this.data();
    if (!d || d.dtmfSelections.length === 0) return { datasets: [] };
    return {
      labels: d.dtmfSelections.map(dtmf => `${dtmf.digit} (${dtmf.nodeName})`),
      datasets: [{
        label: 'Выборы',
        data: d.dtmfSelections.map(dtmf => dtmf.count),
        backgroundColor: 'rgba(33, 150, 243, 0.6)',
      }],
    };
  });

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
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
    this.analyticsApi.getIvrAnalysis(filters).subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading IVR analysis:', err);
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

  getCompletionClass(rate: number): string {
    if (rate >= 80) return 'excellent';
    if (rate >= 70) return 'good';
    if (rate >= 60) return 'warning';
    return 'danger';
  }
}
