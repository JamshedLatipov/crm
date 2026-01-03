import { Component, OnInit, signal, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import './chart.config'; // Инициализация Chart.js
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { NotificationService } from '../../services/notification.service';
import { DashboardStats, ChannelStats, CampaignStats } from '../../models/notification.models';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PageLayoutComponent,
    BaseChartDirective
  ],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  
  selectedPeriod = 'week';
  loading = signal(false);
  error = signal<string | null>(null);
  
  stats = signal<DashboardStats>({
    total: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    deliveryRate: 0
  });

  channelStats = signal<ChannelStats[]>([]);
  topCampaigns = signal<CampaignStats[]>([]);

  // Данные для графика
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Всего отправлено',
        fill: true,
        tension: 0.4,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#667eea',
      },
      {
        data: [],
        label: 'Доставлено',
        fill: true,
        tension: 0.4,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#10b981',
      },
      {
        data: [],
        label: 'Ошибки',
        fill: true,
        tension: 0.4,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#ef4444',
      }
    ]
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 13,
            family: "'Inter', sans-serif"
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return ` ${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 12
          },
          precision: 0
        }
      }
    }
  };

  ngOnInit() {
    this.loadAnalytics();
  }

  onPeriodChange() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.loading.set(true);
    this.error.set(null);

    const { startDate, endDate } = this.getDateRange();
    
    console.log('Загрузка аналитики с параметрами:', { startDate, endDate, period: this.selectedPeriod });

    // Загрузка всех данных параллельно
    Promise.all([
      this.notificationService.getDashboardStats(startDate, endDate).toPromise(),
      this.notificationService.getChannelStats(startDate, endDate).toPromise(),
      this.notificationService.getTopCampaigns(5, startDate, endDate).toPromise(),
      this.loadChartData(startDate, endDate)
    ])
      .then(([dashboardStats, channelStats, campaigns]) => {
        console.log('Dashboard Stats:', dashboardStats);
        console.log('Channel Stats:', channelStats);
        console.log('Campaigns:', campaigns);
        
        if (dashboardStats) {
          this.stats.set(dashboardStats);
        }
        if (channelStats) {
          this.channelStats.set(channelStats);
        }
        if (campaigns) {
          this.topCampaigns.set(campaigns);
        }
        this.loading.set(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки аналитики:', err);
        this.error.set('Не удалось загрузить данные аналитики');
        this.loading.set(false);
      });
  }

  private async loadChartData(startDate?: string, endDate?: string): Promise<void> {
    if (!startDate || !endDate) {
      // Если нет диапазона, используем последние 7 дней
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      startDate = start.toISOString();
      endDate = end.toISOString();
    }

    try {
      const data = await this.notificationService.getStatsByDay(startDate, endDate).toPromise();
      
      if (data && data.length > 0) {
        this.lineChartData.labels = data.map((d: any) => {
          const date = new Date(d.date);
          return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
        });
        
        this.lineChartData.datasets[0].data = data.map((d: any) => d.total);
        this.lineChartData.datasets[1].data = data.map((d: any) => d.delivered);
        this.lineChartData.datasets[2].data = data.map((d: any) => d.failed);
        
        // Обновляем график
        this.chart?.update();
      }
    } catch (error) {
      console.error('Ошибка загрузки данных графика:', error);
    }
  }

  private getDateRange(): { startDate?: string; endDate?: string } {
    const endDate = new Date();
    const startDate = new Date();

    switch (this.selectedPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        // Без фильтрации по дате
        return {};
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }
}
