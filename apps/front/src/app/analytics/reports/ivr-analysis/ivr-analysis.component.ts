import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { CallFilters, IvrAnalysis } from '../../models/analytics.models';

@Component({
  selector: 'app-ivr-analysis',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    ReportFiltersComponent,
  ],
  templateUrl: './ivr-analysis.component.html',
  styleUrls: ['./ivr-analysis.component.scss'],
})
export class IvrAnalysisComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);

  data = signal<IvrAnalysis | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  displayedColumnsPaths = ['path', 'callCount', 'percentage', 'avgTimeInIvr', 'completionRate'];
  displayedColumnsNodes = ['nodeName', 'visits', 'exitCount', 'exitRate'];
  displayedColumnsDtmf = ['digit', 'nodeName', 'count', 'percentage'];

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
    this.analyticsApi.getIvrAnalysis(filters).subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading IVR analysis:', err);
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

  getCompletionClass(rate: number): string {
    if (rate >= 80) return 'excellent';
    if (rate >= 70) return 'good';
    if (rate >= 60) return 'warning';
    return 'danger';
  }
}
