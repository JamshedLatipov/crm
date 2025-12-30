import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ForecastingService } from '../services/forecasting.service';
import { 
  ForecastType, 
  ForecastMethod, 
  ForecastPeriodType,
  FORECAST_TYPE_LABELS,
  FORECAST_METHOD_LABELS,
  FORECAST_PERIOD_TYPE_LABELS
} from '../models/forecasting.models';

@Component({
  selector: 'app-forecast-form',
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './forecast-form.component.html',
  styleUrls: ['./forecast-form.component.scss']
})
export class ForecastFormComponent {
  forecastForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  forecastTypes = Object.values(ForecastType);
  forecastMethods = Object.values(ForecastMethod);
  periodTypes = Object.values(ForecastPeriodType);

  typeLabels = FORECAST_TYPE_LABELS;
  methodLabels = FORECAST_METHOD_LABELS;
  periodLabels = FORECAST_PERIOD_TYPE_LABELS;

  constructor(
    private fb: FormBuilder,
    private forecastingService: ForecastingService,
    private router: Router
  ) {
    this.forecastForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      type: [ForecastType.REVENUE, Validators.required],
      method: [ForecastMethod.LINEAR_TREND, Validators.required],
      periodType: [ForecastPeriodType.MONTHLY, Validators.required],
      startDate: [new Date(), Validators.required],
      endDate: [new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), Validators.required],
      targetValue: [null, [Validators.required, Validators.min(0)]],
      description: [''],
      tags: [[]]
    });
  }

  onSubmit(): void {
    if (this.forecastForm.invalid) {
      this.forecastForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.forecastForm.value;
    const createDto = {
      name: formValue.name,
      type: formValue.type,
      method: formValue.method,
      periodType: formValue.periodType,
      startDate: formValue.startDate.toISOString(),
      endDate: formValue.endDate.toISOString(),
      targetValue: formValue.targetValue,
      description: formValue.description,
      tags: formValue.tags
    };

    this.forecastingService.createForecast(createDto).subscribe({
      next: (forecast) => {
        this.loading.set(false);
        // Автоматически запустить расчет прогноза
        this.forecastingService.calculateForecast(forecast.id).subscribe({
          next: () => {
            this.router.navigate(['/forecasting']);
          },
          error: (err) => {
            console.error('Failed to calculate forecast:', err);
            // Все равно перейти на дашборд
            this.router.navigate(['/forecasting']);
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Ошибка создания прогноза: ' + (err.error?.message || err.message));
        console.error('Failed to create forecast:', err);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/forecasting']);
  }

  getMethodDescription(method: ForecastMethod): string {
    const descriptions: Record<ForecastMethod, string> = {
      [ForecastMethod.LINEAR_TREND]: 'Линейная регрессия на основе исторических данных',
      [ForecastMethod.WEIGHTED_AVERAGE]: 'Средневзвешенное с большим весом для недавних периодов',
      [ForecastMethod.PIPELINE_CONVERSION]: 'Прогноз на основе конверсии сделок в воронке',
      [ForecastMethod.MOVING_AVERAGE]: 'Скользящее среднее для сглаживания колебаний',
      [ForecastMethod.EXPONENTIAL_SMOOTHING]: 'Экспоненциальное сглаживание с трендом',
      [ForecastMethod.HISTORICAL_AVERAGE]: 'Простое среднее исторических значений'
    };
    return descriptions[method];
  }
}
