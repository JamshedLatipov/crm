import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../shared/components/crm-table/crm-table.component';
import { ForecastingService } from '../services/forecasting.service';
import { Forecast, FORECAST_STATUS_LABELS, FORECAST_METHOD_LABELS, FORECAST_TYPE_LABELS } from '../models/forecasting.models';

@Component({
  selector: 'app-forecasting-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageLayoutComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './forecasting-dashboard.component.html',
  styleUrls: ['./forecasting-dashboard.component.scss']
})
export class ForecastingDashboardComponent implements OnInit {
  private forecastingService = inject(ForecastingService);

  forecasts = signal<Forecast[]>([]);
  loading = signal(true);

  readonly statusLabels = FORECAST_STATUS_LABELS;
  readonly methodLabels = FORECAST_METHOD_LABELS;
  readonly typeLabels = FORECAST_TYPE_LABELS;

  // crm-table columns
  columns: CrmColumn[] = [
    { key: 'name', label: 'Название', template: 'nameTemplate' },
    { key: 'type', label: 'Тип', template: 'typeTemplate' },
    { key: 'method', label: 'Метод', template: 'methodTemplate' },
    { key: 'period', label: 'Период', template: 'periodTemplate' },
    { key: 'target', label: 'Цель', template: 'targetTemplate' },
    { key: 'predicted', label: 'Прогноз', template: 'predictedTemplate' },
    { key: 'actual', label: 'Факт', template: 'actualTemplate' },
    { key: 'confidence', label: 'Уверенность', template: 'confidenceTemplate' },
    { key: 'status', label: 'Статус', template: 'statusTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' },
  ];

  ngOnInit() {
    this.loadForecasts();
  }

  getAverageConfidence(): number {
    const forecasts = this.forecasts();
    if (forecasts.length === 0) return 0;
    
    const validForecasts = forecasts.filter(f => f.confidence != null);
    if (validForecasts.length === 0) return 0;
    
    const sum = validForecasts.reduce((acc, f) => {
      const confidence = typeof f.confidence === 'string' ? parseFloat(f.confidence) : f.confidence;
      return acc + (isNaN(confidence) ? 0 : confidence);
    }, 0);
    
    return sum / validForecasts.length;
  }

  getAverageAccuracy(): number {
    const forecasts = this.forecasts();
    if (forecasts.length === 0) return 0;
    
    const validForecasts = forecasts.filter(f => f.accuracy != null);
    if (validForecasts.length === 0) return 0;
    
    const sum = validForecasts.reduce((acc, f) => {
      const accuracy = typeof f.accuracy === 'string' ? parseFloat(f.accuracy) : f.accuracy;
      return acc + (isNaN(accuracy) ? 0 : accuracy);
    }, 0);
    
    return sum / validForecasts.length;
  }

  loadForecasts() {
    this.loading.set(true);
    this.forecastingService.getForecasts({}).subscribe({
      next: (response) => {
        this.forecasts.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading forecasts:', error);
        this.loading.set(false);
      }
    });
  }

  calculateForecast(id: string) {
    this.forecastingService.calculateForecast(id).subscribe({
      next: (forecast) => {
        console.log('Forecast calculated:', forecast);
        this.loadForecasts();
      },
      error: (error) => {
        console.error('Error calculating forecast:', error);
      }
    });
  }

  deleteForecast(id: string) {
    if (confirm('Вы уверены, что хотите удалить этот прогноз?')) {
      this.forecastingService.deleteForecast(id).subscribe({
        next: () => {
          this.loadForecasts();
        },
        error: (error) => {
          console.error('Error deleting forecast:', error);
        }
      });
    }
  }

  formatCurrency(value: number): string {
    return this.forecastingService.formatCurrency(value);
  }

  formatPercentage(value: number): string {
    return this.forecastingService.formatPercentage(value);
  }

  getConfidenceColor(confidence: number): string {
    return this.forecastingService.getConfidenceColor(confidence);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'completed': return 'accent';
      case 'draft': return 'warn';
      default: return '';
    }
  }

  formatDateRange(start: Date, end: Date): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`;
  }
}
