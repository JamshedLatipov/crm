import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { CallFilters, AbandonedCalls } from '../../models/analytics.models';

@Component({
  selector: 'app-abandoned-calls',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    ReportFiltersComponent,
  ],
  templateUrl: './abandoned-calls.component.html',
  styleUrls: ['./abandoned-calls.component.scss'],
})
export class AbandonedCallsComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);

  data = signal<AbandonedCalls | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  displayedColumnsQueue: string[] = [
    'queue',
    'abandonedCount',
    'totalCalls',
    'abandonRate',
    'avgAbandonTime',
  ];

  displayedColumnsReasons: string[] = ['reason', 'count', 'percentage'];

  // Computed signals
  hasData = computed(() => {
    const d = this.data();
    return d && d.totalAbandoned > 0;
  });

  // Chart for hourly distribution
  hourlyChartData = computed<ChartConfiguration['data']>(() => {
    const d = this.data();
    if (!d) {
      return { datasets: [] };
    }

    return {
      labels: d.byHour.map((h) => `${h.period}:00`),
      datasets: [
        {
          label: 'Брошенные звонки',
          data: d.byHour.map((h) => h.count),
          backgroundColor: 'rgba(244, 67, 54, 0.5)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 2,
          fill: true,
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
        text: 'Распределение брошенных звонков по часам',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  // Chart for daily trend
  dailyChartData = computed<ChartConfiguration['data']>(() => {
    const d = this.data();
    if (!d) {
      return { datasets: [] };
    }

    return {
      labels: d.byDay.map((day) => day.period),
      datasets: [
        {
          label: 'Брошенные звонки',
          data: d.byDay.map((day) => day.count),
          backgroundColor: 'rgba(244, 67, 54, 0.2)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 2,
          fill: true,
        },
      ],
    };
  });

  dailyChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: 'Динамика брошенных звонков',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  // Pie chart for reasons
  reasonsChartData = computed<ChartConfiguration['data']>(() => {
    const d = this.data();
    if (!d) {
      return { datasets: [] };
    }

    return {
      labels: d.reasons.map((r) => r.reason),
      datasets: [
        {
          data: d.reasons.map((r) => r.count),
          backgroundColor: [
            'rgba(244, 67, 54, 0.8)',
            'rgba(255, 152, 0, 0.8)',
            'rgba(255, 235, 59, 0.8)',
            'rgba(76, 175, 80, 0.8)',
            'rgba(33, 150, 243, 0.8)',
          ],
        },
      ],
    };
  });

  reasonsChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      },
      title: {
        display: true,
        text: 'Причины отказа',
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

    this.analyticsApi.getAbandonedCalls(filters).subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading abandoned calls data:', err);
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

  getSeverityClass(rate: number): string {
    if (rate < 5) return 'excellent';
    if (rate < 10) return 'good';
    if (rate < 15) return 'warning';
    return 'danger';
  }
}
