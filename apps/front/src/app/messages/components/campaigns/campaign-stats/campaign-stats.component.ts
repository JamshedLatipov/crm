import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { 
  Chart,
  ChartConfiguration, 
  ChartData, 
  registerables 
} from 'chart.js';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { NotificationService } from '../../../services/notification.service';

// Регистрируем все компоненты Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-campaign-stats',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    PageLayoutComponent,
    BaseChartDirective
  ],
  templateUrl: './campaign-stats.component.html',
  styleUrl: './campaign-stats.component.scss'
})
export class CampaignStatsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);

  campaignId = signal<string>('');
  loading = signal(true);
  campaign = signal<any>(null);
  stats = signal({
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    total: 0,
    deliveryRate: 0,
    startedAt: null as string | null,
    completedAt: null as string | null
  });

  progressPercent = computed(() => {
    const s = this.stats();
    if (s.total === 0) return 0;
    return Math.round((s.sent / s.total) * 100);
  });

  deliveryRatePercent = computed(() => {
    const s = this.stats();
    if (s.sent === 0) return 0;
    return Math.round((s.delivered / s.sent) * 100);
  });

  failureRatePercent = computed(() => {
    const s = this.stats();
    if (s.sent === 0) return 0;
    return Math.round((s.failed / s.sent) * 100);
  });

  // Данные для круговой диаграммы (распределение статусов)
  pieChartType = 'doughnut' as const;
  pieChartData = signal<ChartData<'doughnut'>>({
    labels: ['Доставлено', 'Ошибки', 'Ожидает'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [
        '#10b981', // Зелёный для доставленных
        '#f59e0b', // Оранжевый для ошибок
        '#3b82f6'  // Синий для ожидающих
      ],
      borderWidth: 0,
      hoverOffset: 10
    }]
  });

  pieChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Данные для линейного графика (отправки по времени)
  lineChartType = 'line' as const;
  lineChartData = signal<ChartData<'line'>>({
    labels: [],
    datasets: [
      {
        label: 'Отправлено',
        data: [],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Доставлено',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Ошибки',
        data: [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  });

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.campaignId.set(id);
      this.loadCampaignStats(id);
    }
  }

  private loadCampaignStats(campaignId: string): void {
    this.loading.set(true);

    this.notificationService.getCampaignStats(campaignId).subscribe({
      next: (data) => {
        console.log('Campaign stats loaded:', data);
        
        this.campaign.set(data.campaign);
        
        const campaign = data.campaign;
        const messagesByStatus = data.messagesByStatus || {};
        
        // Используем данные из кампании (totalSent, totalDelivered, totalFailed)
        // они более надёжны, чем подсчёт по статусам сообщений
        const totalSent = campaign.totalSent || 0;
        const delivered = campaign.totalDelivered || 0;
        const failed = campaign.totalFailed || 0;
        const pending = messagesByStatus['pending'] || 0;
        const total = campaign.totalRecipients || 0;
        
        // Процент доставляемости считаем от отправленных
        const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;

        this.stats.set({
          sent: totalSent,
          delivered,
          failed,
          pending,
          total,
          deliveryRate,
          startedAt: campaign.startedAt 
            ? new Date(campaign.startedAt).toLocaleString('ru-RU') 
            : null,
          completedAt: campaign.completedAt 
            ? new Date(campaign.completedAt).toLocaleString('ru-RU') 
            : null
        });

        // Обновляем данные для круговой диаграммы
        this.updatePieChart(delivered, failed, pending);

        // Загружаем данные для линейного графика
        this.loadTimelineData(campaignId);

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading campaign stats:', error);
        this.loading.set(false);
      }
    });
  }

  private updatePieChart(delivered: number, failed: number, pending: number): void {
    this.pieChartData.set({
      labels: ['Доставлено', 'Ошибки', 'Ожидает'],
      datasets: [{
        data: [delivered, failed, pending],
        backgroundColor: [
          '#10b981', // Зелёный
          '#f59e0b', // Оранжевый
          '#3b82f6'  // Синий
        ],
        borderWidth: 0,
        hoverOffset: 10
      }]
    });
  }

  private loadTimelineData(campaignId: string): void {
    this.notificationService.getCampaignTimeline(campaignId, 'hour', 24).subscribe({
      next: (data) => {
        console.log('Timeline data loaded:', data);
        this.updateLineChart(data.timeline);
      },
      error: (error) => {
        console.error('Error loading timeline data:', error);
        // Если ошибка, показываем пустой график
        this.updateLineChart([]);
      }
    });
  }

  private updateLineChart(timeline: Array<{ timestamp: string; sent: number; delivered: number; failed: number }>): void {
    if (timeline.length === 0) {
      // Пустые данные
      this.lineChartData.set({
        labels: [],
        datasets: [
          {
            label: 'Отправлено',
            data: [],
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Доставлено',
            data: [],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Ошибки',
            data: [],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      });
      return;
    }

    // Форматируем метки времени для отображения
    const labels = timeline.map(point => {
      const date = new Date(point.timestamp);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    });

    const sentData = timeline.map(point => point.sent);
    const deliveredData = timeline.map(point => point.delivered);
    const failedData = timeline.map(point => point.failed);

    this.lineChartData.set({
      labels,
      datasets: [
        {
          label: 'Отправлено',
          data: sentData,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Доставлено',
          data: deliveredData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Ошибки',
          data: failedData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    });
  }
}
