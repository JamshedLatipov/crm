import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../shared/components/crm-table/crm-table.component';
import { ForecastingService } from '../services/forecasting.service';
import { Forecast, ForecastPeriod, FORECAST_TYPE_LABELS, FORECAST_METHOD_LABELS, FORECAST_STATUS_LABELS } from '../models/forecasting.models';

@Component({
  selector: 'app-forecast-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    PageLayoutComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatTooltipModule,
    BaseChartDirective,
    CrmTableComponent,
    CrmColumnTemplateDirective
  ],
  templateUrl: './forecast-detail.component.html',
  styleUrls: ['./forecast-detail.component.scss']
})
export class ForecastDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private forecastingService = inject(ForecastingService);
  private dialog = inject(MatDialog);

  forecast = signal<Forecast | null>(null);
  periods = signal<ForecastPeriod[]>([]);
  loading = signal(true);
  calculating = signal(false);

  readonly typeLabels = FORECAST_TYPE_LABELS;
  readonly methodLabels = FORECAST_METHOD_LABELS;
  readonly statusLabels = FORECAST_STATUS_LABELS;

  // Chart.js configurations
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // График 1: Линейный график Цель vs Прогноз vs Факт
  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 }, // Отключаем анимацию для производительности
    plugins: {
      legend: { 
        display: true, 
        position: 'top',
        labels: { 
          font: { size: 12 },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: { 
        display: true, 
        text: 'Цель vs Прогноз vs Факт',
        font: { size: 14, weight: 'bold' },
        padding: { top: 10, bottom: 20 }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        bodyFont: { size: 12 },
        titleFont: { size: 13, weight: 'bold' },
        displayColors: true,
        boxPadding: 4
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        ticks: {
          font: { size: 11 },
          color: '#6b7280'
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.06)'
        }
      },
      x: {
        ticks: {
          font: { size: 11 },
          color: '#6b7280',
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2,
        tension: 0.4
      },
      point: {
        radius: 3,
        hoverRadius: 6,
        hitRadius: 10
      }
    }
  };
  lineChartType: ChartType = 'line';

  // График 2: Столбчатая диаграмма variance
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { display: false },
      title: { 
        display: true, 
        text: 'Отклонения (Variance)',
        font: { size: 14, weight: 'bold' },
        padding: { top: 10, bottom: 20 }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        bodyFont: { size: 12 },
        titleFont: { size: 13, weight: 'bold' }
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        ticks: {
          font: { size: 11 },
          color: '#6b7280'
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.06)'
        }
      },
      x: {
        ticks: {
          font: { size: 11 },
          color: '#6b7280',
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false
        }
      }
    }
  };
  barChartType: ChartType = 'bar';

  // График 3: Круговая диаграмма распределения
  pieChartData: ChartData<'pie'> = { labels: ['Цель', 'Прогноз', 'Факт'], datasets: [] };
  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { 
        display: true, 
        position: 'right',
        labels: {
          font: { size: 12 },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 12,
          boxHeight: 12
        }
      },
      title: { 
        display: true, 
        text: 'Распределение значений',
        font: { size: 14, weight: 'bold' },
        padding: { top: 10, bottom: 20 }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        bodyFont: { size: 12 },
        titleFont: { size: 13, weight: 'bold' }
      }
    }
  };
  pieChartType: ChartType = 'pie';

  // График 4: Дополнительный график уверенности
  confidenceChartData: ChartData<'line'> = { labels: [], datasets: [] };
  confidenceChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { 
        display: true,
        labels: {
          font: { size: 12 },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: { 
        display: true, 
        text: 'Уверенность прогноза по периодам',
        font: { size: 14, weight: 'bold' },
        padding: { top: 10, bottom: 20 }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        bodyFont: { size: 12 },
        titleFont: { size: 13, weight: 'bold' }
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        max: 100,
        ticks: {
          font: { size: 11 },
          color: '#6b7280',
          callback: (value) => value + '%'
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.06)'
        }
      },
      x: {
        ticks: {
          font: { size: 11 },
          color: '#6b7280',
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2,
        tension: 0.4
      },
      point: {
        radius: 3,
        hoverRadius: 6,
        hitRadius: 10
      }
    }
  };
  confidenceChartType: ChartType = 'line';

  // Таблица периодов
  periodsColumns: CrmColumn[] = [
    { key: 'periodLabel', label: 'Период', template: 'periodLabelTemplate' },
    { key: 'target', label: 'Цель', template: 'targetTemplate' },
    { key: 'predicted', label: 'Прогноз', template: 'predictedTemplate' },
    { key: 'actual', label: 'Факт', template: 'actualTemplate' },
    { key: 'variance', label: 'Отклонение', template: 'varianceTemplate' },
    { key: 'confidence', label: 'Уверенность', template: 'confidenceTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' }
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadForecast(id);
      this.loadPeriods(id);
    }
  }

  loadForecast(id: string) {
    this.loading.set(true);
    this.forecastingService.getForecast(id).subscribe({
      next: (forecast) => {
        this.forecast.set(forecast);
        this.loading.set(false);
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading forecast:', error);
        this.loading.set(false);
        this.router.navigate(['/forecasting']);
      }
    });
  }

  loadPeriods(forecastId: string) {
    this.forecastingService.getPeriods(forecastId).subscribe({
      next: (periods) => {
        this.periods.set(periods);
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading periods:', error);
      }
    });
  }

  updateCharts() {
    const periods = this.periods();
    if (periods.length === 0) return;

    const labels = periods.map(p => p.periodLabel);
    const targetData = periods.map(p => p.targetValue || 0);
    const predictedData = periods.map(p => p.predictedValue || 0);
    const actualData = periods.map(p => p.actualValue || 0);
    const varianceData = periods.map(p => p.variance || 0);
    const confidenceData = periods.map(p => (p.confidence || 0) * 100);

    // График 1: Линейный (используем цвета проекта #4285f4, #10b981, #f59e0b)
    this.lineChartData = {
      labels,
      datasets: [
        { 
          data: targetData, 
          label: 'Цель', 
          borderColor: '#4285f4', // Основной цвет проекта
          backgroundColor: 'rgba(66, 133, 244, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        { 
          data: predictedData, 
          label: 'Прогноз', 
          borderColor: '#10b981', // Success зеленый
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        { 
          data: actualData, 
          label: 'Факт', 
          borderColor: '#f59e0b', // Warning оранжевый
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    };

    // График 2: Столбчатая диаграмма
    this.barChartData = {
      labels,
      datasets: [{
        data: varianceData,
        label: 'Отклонение',
        backgroundColor: varianceData.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
        borderColor: varianceData.map(v => v >= 0 ? '#10b981' : '#ef4444'),
        borderWidth: 2
      }]
    };

    // График 3: Круговая диаграмма (используем цвета проекта)
    const forecast = this.forecast();
    if (forecast) {
      this.pieChartData = {
        labels: ['Цель', 'Прогноз', 'Факт'],
        datasets: [{
          data: [
            forecast.targetValue || 0,
            forecast.predictedValue || 0,
            forecast.actualValue || 0
          ],
          backgroundColor: [
            'rgba(66, 133, 244, 0.7)',   // #4285f4
            'rgba(16, 185, 129, 0.7)',   // #10b981
            'rgba(245, 158, 11, 0.7)'    // #f59e0b
          ],
          borderColor: [
            '#4285f4',
            '#10b981',
            '#f59e0b'
          ],
          borderWidth: 2
        }]
      };
    }

    // График 4: Уверенность (используем фиолетовый как accent)
    this.confidenceChartData = {
      labels,
      datasets: [{
        data: confidenceData,
        label: 'Уверенность (%)',
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    };

    // Обновить графики
    this.chart?.update();
  }

  calculate() {
    const forecast = this.forecast();
    if (!forecast) return;
    
    this.calculating.set(true);
    this.forecastingService.calculateForecast(forecast.id).subscribe({
      next: () => {
        this.loadForecast(forecast.id);
        this.loadPeriods(forecast.id);
        this.calculating.set(false);
      },
      error: (error) => {
        console.error('Error calculating forecast:', error);
        this.calculating.set(false);
      }
    });
  }

  editPeriodActual(period: ForecastPeriod) {
    const actualValue = prompt(`Введите фактическое значение для ${period.periodLabel}:`, period.actualValue?.toString() || '0');
    if (actualValue !== null) {
      const value = parseFloat(actualValue);
      if (!isNaN(value)) {
        this.forecastingService.updatePeriodActual(period.id, value).subscribe({
          next: () => {
            const forecast = this.forecast();
            if (forecast) {
              this.loadPeriods(forecast.id);
              this.loadForecast(forecast.id);
            }
          },
          error: (error) => {
            console.error('Error updating period:', error);
            alert('Ошибка при обновлении значения');
          }
        });
      }
    }
  }

  exportToCSV() {
    const forecast = this.forecast();
    const periods = this.periods();
    if (!forecast || periods.length === 0) return;

    const headers = ['Период', 'Цель', 'Прогноз', 'Факт', 'Отклонение', 'Уверенность (%)'];
    const rows = periods.map(p => [
      p.periodLabel,
      p.targetValue || 0,
      p.predictedValue || 0,
      p.actualValue || 0,
      p.variance || 0,
      ((p.confidence || 0) * 100).toFixed(2)
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `forecast_${forecast.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  getTotalVariance(): number {
    return this.periods().reduce((sum, p) => sum + (p.variance || 0), 0);
  }

  /**
   * Рассчитать среднюю точность прогноза
   */
  getAverageAccuracy(): number {
    const periods = this.periods().filter(p => p.actualValue != null && p.actualValue > 0);
    if (periods.length === 0) return 0;

    const accuracies = periods.map(p => {
      const actual = p.actualValue || 0;
      const predicted = p.predictedValue || 0;
      if (actual === 0) return 0;
      
      const error = Math.abs(actual - predicted);
      const accuracy = Math.max(0, (1 - error / actual)) * 100;
      return accuracy;
    });

    return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  }

  /**
   * Получить количество периодов с данными
   */
  getPeriodsWithData(): { total: number; withActual: number; withPredicted: number } {
    const periods = this.periods();
    return {
      total: periods.length,
      withActual: periods.filter(p => p.actualValue != null).length,
      withPredicted: periods.filter(p => p.predictedValue != null).length
    };
  }

  /**
   * Рассчитать MAPE (Mean Absolute Percentage Error)
   */
  getMAPE(): number {
    const periods = this.periods().filter(p => p.actualValue != null && p.actualValue > 0);
    if (periods.length === 0) return 0;

    const mape = periods.reduce((sum, p) => {
      const actual = p.actualValue || 0;
      const predicted = p.predictedValue || 0;
      if (actual === 0) return sum;
      
      const ape = Math.abs((actual - predicted) / actual) * 100;
      return sum + ape;
    }, 0) / periods.length;

    return mape;
  }

  /**
   * Получить лучший и худший период по точности
   */
  getBestAndWorstPeriods(): { best: ForecastPeriod | null; worst: ForecastPeriod | null } {
    const periods = this.periods().filter(p => p.actualValue != null && p.actualValue > 0);
    if (periods.length === 0) return { best: null, worst: null };

    const periodsWithAccuracy = periods.map(p => {
      const actual = p.actualValue || 0;
      const predicted = p.predictedValue || 0;
      const error = Math.abs(actual - predicted);
      const accuracy = actual === 0 ? 0 : Math.max(0, (1 - error / actual)) * 100;
      
      return { period: p, accuracy };
    });

    periodsWithAccuracy.sort((a, b) => b.accuracy - a.accuracy);

    return {
      best: periodsWithAccuracy[0]?.period || null,
      worst: periodsWithAccuracy[periodsWithAccuracy.length - 1]?.period || null
    };
  }

  /**
   * Рассчитать процент достижения цели
   */
  getTargetAchievement(): number {
    const forecast = this.forecast();
    if (!forecast || !forecast.targetValue || !forecast.actualValue) return 0;
    
    return (forecast.actualValue / forecast.targetValue) * 100;
  }

  formatCurrency(value: number | undefined): string {
    return this.forecastingService.formatCurrency(value || 0);
  }

  formatPercentage(value: number | undefined): string {
    return this.forecastingService.formatPercentage(value || 0);
  }

  formatDateRange(start: Date | undefined, end: Date | undefined): string {
    if (!start || !end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`;
  }

  getVarianceColor(variance: number): string {
    if (variance > 0) return 'positive';
    if (variance < 0) return 'negative';
    return 'neutral';
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }
}
