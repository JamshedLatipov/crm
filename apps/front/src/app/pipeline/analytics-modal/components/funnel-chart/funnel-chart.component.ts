import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { StageAnalytics } from '../../../dtos';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-funnel-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './funnel-chart.component.html',
  styleUrls: ['./funnel-chart.component.scss']
})
export class FunnelChartComponent implements AfterViewInit, OnDestroy {
  @Input() stages: StageAnalytics[] | null = null;
  @ViewChild('funnelCanvas', { static: false }) funnelCanvas!: ElementRef<HTMLCanvasElement>;

  private funnelChart: Chart | null = null;

  ngAfterViewInit() {
    this.renderChart();
  }

  averageConversion(): number {
    if (!this.stages || !this.stages.length) return 0;
    const sum = this.stages.reduce((acc, s) => acc + (s.conversion || 0), 0);
    return sum / this.stages.length;
  }

  averageTime(): number {
    if (!this.stages || !this.stages.length) return 0;
    const sum = this.stages.reduce((acc, s) => acc + (s.averageTimeInStage || 0), 0);
    return Math.round(sum / this.stages.length);
  }

  bestStage(): StageAnalytics | null {
    if (!this.stages || !this.stages.length) return null;
    return this.stages.reduce((best, current) => 
      (current.conversion > best.conversion) ? current : best
    );
  }

  worstStage(): StageAnalytics | null {
    if (!this.stages || !this.stages.length) return null;
    return this.stages.reduce((worst, current) => 
      (current.conversion < worst.conversion) ? current : worst
    );
  }

  private getFunnelColor(index: number): string {
    const colors = [
      '#667eea',
      '#764ba2', 
      '#f093fb',
      '#4facfe',
      '#43e97b',
      '#fa709a'
    ];
    return colors[index % colors.length];
  }

  ngOnDestroy() {
    this.funnelChart?.destroy();
  }

  private renderChart() {
    if (!this.stages || !this.funnelCanvas?.nativeElement) return;

    const canvas = this.funnelCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем фиксированные размеры canvas
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    const labels = this.stages.map(s => s.name);
    const counts = this.stages.map(s => s.count);
    const conversions = this.stages.map(s => s.conversion);

    // Создаем градиентные цвета для каждого этапа
    const colors = this.stages.map((_, i) => this.getFunnelColor(i));

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Количество сделок',
            data: counts,
            backgroundColor: colors.map(color => color + '80'), // Прозрачные цвета
            borderColor: colors,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: 'Конверсия (%)',
            data: conversions,
            type: 'line',
            backgroundColor: '#ffffff',
            borderColor: '#ff6b6b',
            borderWidth: 2,
            pointBackgroundColor: '#ff6b6b',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y1',
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 12
              },
              padding: 16,
              usePointStyle: true,
              color: '#6b7280'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            titleColor: '#111827',
            bodyColor: '#6b7280',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            cornerRadius: 12,
            padding: 12,
            titleFont: {
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              size: 12
            },
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.x !== null) {
                  if (context.datasetIndex === 1) { // Конверсия
                    label += context.parsed.x.toFixed(1) + '%';
                  } else { // Количество
                    label += context.parsed.x.toFixed(0);
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Количество сделок',
              font: {
                size: 12,
                weight: 'bold'
              },
              color: '#6b7280'
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#6b7280'
            },
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.06)'
            }
          },
          y: {
            ticks: {
              font: {
                size: 11
              },
              color: '#6b7280'
            },
            grid: {
              display: false
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Конверсия (%)',
              font: {
                size: 12,
                weight: 'bold'
              },
              color: '#6b7280'
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#6b7280'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    };

    this.funnelChart?.destroy();
    this.funnelChart = new Chart(ctx, config);
  }
}
