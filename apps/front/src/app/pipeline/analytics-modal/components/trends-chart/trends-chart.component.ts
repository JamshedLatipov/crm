import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { StageAnalytics } from '../../../dtos';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-trends-chart',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule
  ],
  templateUrl: './trends-chart.component.html',
  styleUrls: ['./trends-chart.component.scss']
})
export class TrendsChartComponent implements AfterViewInit, OnDestroy {
  @Input() stages: StageAnalytics[] | null = null;
  @ViewChild('trendsCanvas', { static: false }) trendsCanvas!: ElementRef<HTMLCanvasElement>;

  private trendsChart: Chart | null = null;
  selectedMetric: 'count' | 'amount' | 'conversion' | 'time' = 'count';
  selectedPeriod: '7d' | '30d' | '90d' | '1y' = '30d';

  metrics = [
    { value: 'count', label: 'Количество сделок' },
    { value: 'amount', label: 'Сумма сделок' },
    { value: 'conversion', label: 'Конверсия' },
    { value: 'time', label: 'Время в этапе' }
  ];

  periods = [
    { value: '7d', label: '7 дней' },
    { value: '30d', label: '30 дней' },
    { value: '90d', label: '90 дней' },
    { value: '1y', label: '1 год' }
  ];

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnDestroy() {
    this.trendsChart?.destroy();
  }

  onMetricChange() {
    this.renderChart();
  }

  onPeriodChange() {
    this.renderChart();
  }

  private renderChart() {
    if (!this.stages || !this.trendsCanvas?.nativeElement) return;

    const ctx = this.trendsCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Генерируем демо-данные трендов (в реальности данные должны приходить с сервера)
    const trendData = this.generateTrendData();

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: trendData.labels,
        datasets: trendData.datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 14,
                weight: 'bold'
              },
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#333',
            bodyColor: '#666',
            borderColor: '#e0e0e0',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            padding: 12,
            titleFont: {
              size: 16,
              weight: 'bold'
            },
            bodyFont: {
              size: 15,
              weight: 'bold'
            },
            callbacks: {
              title: (context) => {
                return context[0].label;
              },
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  if (this.selectedMetric === 'amount') {
                    label += this.formatCurrency(context.parsed.y);
                  } else if (this.selectedMetric === 'conversion') {
                    label += Math.round(context.parsed.y) + '%';
                  } else if (this.selectedMetric === 'time') {
                    label += Math.round(context.parsed.y) + ' дней';
                  } else {
                    label += this.formatNumber(context.parsed.y);
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Период',
              font: {
                size: 16,
                weight: 'bold'
              },
              padding: { top: 10 }
            },
            ticks: {
              font: {
                size: 12
              },
              maxRotation: 45,
              minRotation: 0
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: this.getYAxisLabel(),
              font: {
                size: 16,
                weight: 'bold'
              },
              padding: { bottom: 10 }
            },
            beginAtZero: true,
            ticks: {
              font: {
                size: 14,
                weight: 'bold'
              },
              callback: (value) => {
                if (this.selectedMetric === 'amount') {
                  return this.formatCurrency(Number(value), true);
                } else if (this.selectedMetric === 'conversion') {
                  return Math.round(Number(value)) + '%';
                } else if (this.selectedMetric === 'time') {
                  return Math.round(Number(value)) + 'д';
                } else {
                  return this.formatNumber(Number(value), true);
                }
              }
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        elements: {
          point: {
            radius: 6,
            hoverRadius: 8
          },
          line: {
            borderWidth: 4
          }
        }
      }
    };

    this.trendsChart?.destroy();
    this.trendsChart = new Chart(ctx, config);
  }

  private generateTrendData() {
    const periods = this.getPeriodLabels();
    const datasets = this.stages?.map((stage, index) => {
      const data = periods.map(() => this.generateRandomValue(stage));
      return {
        label: stage.name,
        data,
        borderColor: this.getStageColor(index),
        backgroundColor: this.getStageColor(index) + '20',
        tension: 0.4,
        fill: false
      };
    }) || [];

    return {
      labels: periods,
      datasets
    };
  }

  private getPeriodLabels(): string[] {
    const now = new Date();
    const labels: string[] = [];

    switch (this.selectedPeriod) {
      case '7d':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }));
        }
        break;
      case '30d':
        for (let i = 29; i >= 0; i -= 7) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }));
        }
        break;
      case '90d':
        for (let i = 0; i < 12; i++) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (11 - i));
          labels.push(date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }));
        }
        break;
      case '1y':
        for (let i = 0; i < 12; i++) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (11 - i));
          labels.push(date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }));
        }
        break;
    }

    return labels;
  }

  private generateRandomValue(stage: StageAnalytics): number {
    const baseValue = this.getBaseValue(stage);

    // Добавляем случайную вариацию ±20%
    const variation = (Math.random() - 0.5) * 0.4;
    const value = baseValue * (1 + variation);

    return Math.max(0, value);
  }

  private getYAxisLabel(): string {
    switch (this.selectedMetric) {
      case 'count':
        return 'Количество сделок';
      case 'amount':
        return 'Сумма (SM)';
      case 'conversion':
        return 'Конверсия (%)';
      case 'time':
        return 'Дни';
      default:
        return '';
    }
  }

  getStageColor(index: number): string {
    const colors = [
      '#667eea',
      '#764ba2',
      '#f093fb',
      '#4facfe',
      '#43e97b',
      '#fa709a',
      '#ff9a9e',
      '#a8edea',
      '#fed6e3',
      '#d299c2'
    ];
    return colors[index % colors.length];
  }

  formatNumber(value: number, compact: boolean = false): string {
    if (compact && value >= 1000000) {
      return Math.round(value / 1000000) + 'M';
    } else if (compact && value >= 1000) {
      return Math.round(value / 1000) + 'K';
    } else {
      return new Intl.NumberFormat('ru-RU').format(Math.round(value));
    }
  }

  formatCurrency(value: number, compact: boolean = false): string {
    if (compact && value >= 1000000) {
      return Math.round(value / 1000000) + 'M SM';
    } else if (compact && value >= 1000) {
      return Math.round(value / 1000) + 'K SM';
    } else {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'TJS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
  }

  getBaseValue(stage: StageAnalytics): number {
    switch (this.selectedMetric) {
      case 'count':
        return stage.count;
      case 'amount':
        return stage.totalAmount || 0;
      case 'conversion':
        return stage.conversion;
      case 'time':
        return stage.averageTimeInStage || 0;
      default:
        return 0;
    }
  }

  getMetricLabel(): string {
    switch (this.selectedMetric) {
      case 'count':
        return 'сделок';
      case 'amount':
        return 'сумма';
      case 'conversion':
        return 'конверсия';
      case 'time':
        return 'время';
      default:
        return '';
    }
  }
}