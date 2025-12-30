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
    plugins: {
      legend: { display: true, position: 'top' },
      title: { display: true, text: 'Цель vs Прогноз vs Факт' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };
  lineChartType: ChartType = 'line';

  // График 2: Столбчатая диаграмма variance
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Отклонения (Variance)' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };
  barChartType: ChartType = 'bar';

  // График 3: Круговая диаграмма распределения
  pieChartData: ChartData<'pie'> = { labels: ['Цель', 'Прогноз', 'Факт'], datasets: [] };
  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'right' },
      title: { display: true, text: 'Распределение значений' }
    }
  };
  pieChartType: ChartType = 'pie';

  // График 4: Дополнительный график уверенности
  confidenceChartData: ChartData<'line'> = { labels: [], datasets: [] };
  confidenceChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Уверенность прогноза по периодам' }
    },
    scales: {
      y: { beginAtZero: true, max: 100 }
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

    // График 1: Линейный
    this.lineChartData = {
      labels,
      datasets: [
        { 
          data: targetData, 
          label: 'Цель', 
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        { 
          data: predictedData, 
          label: 'Прогноз', 
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        },
        { 
          data: actualData, 
          label: 'Факт', 
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true
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

    // График 3: Круговая диаграмма
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
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
          borderColor: ['#2563eb', '#059669', '#d97706'],
          borderWidth: 2
        }]
      };
    }

    // График 4: Уверенность
    this.confidenceChartData = {
      labels,
      datasets: [{
        data: confidenceData,
        label: 'Уверенность (%)',
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true
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
