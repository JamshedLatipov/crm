import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { StageAnalytics, PipelineAnalytics } from '../../../dtos';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

interface ForecastData {
  period: string;
  predictedDeals: number;
  predictedRevenue: number;
  confidence: number;
}

@Component({
  selector: 'app-forecast-component',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './forecast-component.component.html',
  styleUrls: ['./forecast-component.component.scss']
})
export class ForecastComponent implements AfterViewInit, OnDestroy {
  @Input() analytics: PipelineAnalytics | null = null;
  @ViewChild('forecastCanvas', { static: false }) forecastCanvas!: ElementRef<HTMLCanvasElement>;

  private forecastChart: Chart | null = null;
  forecastPeriod: '3m' | '6m' | '1y' = '6m';
  targetRevenue: number = 10000000; // Цель на период

  periods = [
    { value: '3m', label: '3 месяца' },
    { value: '6m', label: '6 месяцев' },
    { value: '1y', label: '1 год' }
  ];

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnDestroy() {
    this.forecastChart?.destroy();
  }

  onPeriodChange() {
    this.renderChart();
  }

  onTargetChange() {
    this.renderChart();
  }

  private renderChart() {
    if (!this.forecastCanvas?.nativeElement) return;

    const ctx = this.forecastCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const forecastData = this.generateForecastData();

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: forecastData.map(d => d.period),
        datasets: [
          {
            label: 'Прогноз сделок',
            data: forecastData.map(d => d.predictedDeals),
            borderColor: '#667eea',
            backgroundColor: '#667eea20',
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Прогноз дохода',
            data: forecastData.map(d => d.predictedRevenue),
            borderColor: '#28a745',
            backgroundColor: '#28a74520',
            tension: 0.4,
            yAxisID: 'y1'
          },
          {
            label: 'Целевая доход',
            data: Array(forecastData.length).fill(this.targetRevenue),
            borderColor: '#dc3545',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            yAxisID: 'y1'
          }
        ]
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
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  if (context.datasetIndex === 1 || context.datasetIndex === 2) {
                    label += new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'TJS',
                      minimumFractionDigits: 0
                    }).format(context.parsed.y);
                  } else {
                    label += Math.round(context.parsed.y).toString();
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
              text: 'Период'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Количество сделок'
            },
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Доход (SM)'
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: (value) => {
                return new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'TJS',
                  notation: 'compact'
                }).format(value as number);
              }
            }
          }
        }
      }
    };

    this.forecastChart?.destroy();
    this.forecastChart = new Chart(ctx, config);
  }

  private generateForecastData(): ForecastData[] {
    const periods = this.getForecastPeriods();
    const baseDeals = this.analytics?.totalDeals || 10;
    const baseRevenue = this.analytics?.totalAmount || 1000000;
    const avgDealSize = this.analytics?.averageDealSize || 100000;

    const data: ForecastData[] = [];
    let cumulativeDeals = baseDeals;
    let cumulativeRevenue = baseRevenue;

    for (let i = 0; i < periods.length; i++) {
      // Простая модель роста с сезонностью
      const growthRate = 1.05 + Math.sin(i * 0.5) * 0.1; // Рост 5% + сезонность
      const confidence = Math.max(0.6, 1 - i * 0.1); // Уверенность уменьшается со временем

      cumulativeDeals = Math.round(cumulativeDeals * growthRate);
      cumulativeRevenue = cumulativeDeals * avgDealSize;

      data.push({
        period: periods[i],
        predictedDeals: cumulativeDeals,
        predictedRevenue: cumulativeRevenue,
        confidence: confidence
      });
    }

    return data;
  }

  private getForecastPeriods(): string[] {
    const now = new Date();
    const periods: string[] = [];

    switch (this.forecastPeriod) {
      case '3m':
        for (let i = 1; i <= 3; i++) {
          const date = new Date(now);
          date.setMonth(date.getMonth() + i);
          periods.push(date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }));
        }
        break;
      case '6m':
        for (let i = 1; i <= 6; i++) {
          const date = new Date(now);
          date.setMonth(date.getMonth() + i);
          periods.push(date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }));
        }
        break;
      case '1y':
        for (let i = 3; i <= 12; i += 3) {
          const date = new Date(now);
          date.setMonth(date.getMonth() + i);
          periods.push(date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }));
        }
        break;
    }

    return periods;
  }

  getForecastSummary() {
    const data = this.generateForecastData();
    if (data.length === 0) return null;

    const final = data[data.length - 1];
    const targetMet = final.predictedRevenue >= this.targetRevenue;

    return {
      finalDeals: final.predictedDeals,
      finalRevenue: final.predictedRevenue,
      targetMet,
      confidence: final.confidence
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'TJS',
      minimumFractionDigits: 0
    }).format(amount);
  }
}