import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import { CallFilters, CallsOverview } from '../../models/analytics.models';

@Component({
  selector: 'app-calls-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatGridListModule,
    BaseChartDirective,
    ReportFiltersComponent,
  ],
  templateUrl: './calls-overview.component.html',
  styleUrls: ['./calls-overview.component.scss'],
})
export class CallsOverviewComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);

  loading = signal(false);
  data = signal<CallsOverview | null>(null);
  error = signal<string | null>(null);

  // Computed chart data - will only recalculate when data() changes
  directionChartData = computed(() => {
    const overview = this.data();
    if (!overview) return null;

    return {
      labels: ['Входящие', 'Исходящие', 'Внутренние'],
      datasets: [
        {
          data: [
            overview.inboundCalls,
            overview.outboundCalls,
            overview.internalCalls,
          ],
          backgroundColor: ['#4caf50', '#2196f3', '#ff9800'],
        },
      ],
    };
  });

  statusChartData = computed(() => {
    const overview = this.data();
    if (!overview) return null;

    return {
      labels: overview.statusDistribution.map((s) => s.status),
      datasets: [
        {
          data: overview.statusDistribution.map((s) => s.count),
          backgroundColor: [
            '#4caf50',
            '#f44336',
            '#ff9800',
            '#9e9e9e',
          ],
        },
      ],
    };
  });

  callsByDayChartData = computed(() => {
    const overview = this.data();
    if (!overview) return null;

    console.log('callsByDay data:', overview.callsByDay);

    if (!overview.callsByDay || overview.callsByDay.length === 0) {
      console.warn('No callsByDay data available');
      return null;
    }

    const chartData = {
      labels: overview.callsByDay.map((d) => {
        const date = new Date(d.period);
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
        });
      }),
      datasets: [
        {
          label: 'Звонки',
          data: overview.callsByDay.map((d) => d.count),
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };

    console.log('callsByDayChartData:', chartData);
    return chartData;
  });

  callsByHourChartData = computed(() => {
    const overview = this.data();
    if (!overview) return null;

    // Create array with all hours 0-23
    const hourlyData = new Array(24).fill(0);
    overview.callsByHour.forEach((h) => {
      hourlyData[h.period as number] = h.count;
    });

    return {
      labels: hourlyData.map((_, i) => `${i}:00`),
      datasets: [
        {
          data: hourlyData,
          backgroundColor: '#2196f3',
        },
      ],
    };
  });

  // Chart configurations
  pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 3,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
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

    this.analyticsApi.getCallsOverview(filters).subscribe({
      next: (response: CallsOverview) => {
        console.log('Calls Overview Response:', response);
        console.log('callsByDay data:', response.callsByDay);
        this.data.set(response);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading calls overview:', err);
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

  getAnswerRate(): number {
    const overview = this.data();
    if (!overview || overview.totalCalls === 0) return 0;
    return Math.round((overview.answeredCalls / overview.totalCalls) * 100);
  }
}
