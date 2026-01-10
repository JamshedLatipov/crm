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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ForecastingService } from '../services/forecasting.service';
import { UserService, Manager } from '../../shared/services/user.service';
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
    MatChipsModule,
    MatExpansionModule,
    MatDividerModule,
    MatListModule,
    MatTooltipModule
  ],
  templateUrl: './forecast-form.component.html',
  styleUrls: ['./forecast-form.component.scss']
})
export class ForecastFormComponent {
  forecastForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  managers = signal<Manager[]>([]);
  loadingManagers = signal(false);
  periodPreview = signal<string[]>([]);

  forecastTypes = Object.values(ForecastType);
  forecastMethods = Object.values(ForecastMethod);
  periodTypes = Object.values(ForecastPeriodType);

  typeLabels = FORECAST_TYPE_LABELS;
  methodLabels = FORECAST_METHOD_LABELS;
  periodLabels = FORECAST_PERIOD_TYPE_LABELS;

  constructor(
    private fb: FormBuilder,
    private forecastingService: ForecastingService,
    private userService: UserService,
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
      ownerId: [''],
      team: [''],
      description: [''],
      tags: [[]],
      // Расширенные параметры для алгоритмов
      advancedParams: this.fb.group({
        windowSize: [3, [Validators.min(2), Validators.max(12)]],  // для Moving Average
        alpha: [0.3, [Validators.min(0.1), Validators.max(0.9)]],   // для Exponential Smoothing
        minDataPoints: [5, [Validators.min(3), Validators.max(20)]], // минимальное кол-во данных
        useSeasonality: [false],                                     // учет сезонности
        confidenceLevel: [0.95, [Validators.min(0.8), Validators.max(0.99)]] // уровень уверенности
      })
    });

    this.loadManagers();
    this.setupFormListeners();
  }

  private setupFormListeners(): void {
    // Обновление предпросмотра периодов при изменении дат или типа периода
    this.forecastForm.valueChanges.subscribe(() => {
      this.updatePeriodPreview();
    });
  }

  get advancedParams() {
    return this.forecastForm.get('advancedParams') as FormGroup;
  }

  /**
   * Получить релевантные параметры для выбранного метода
   */
  getRelevantParams(): string[] {
    const method = this.forecastForm.get('method')?.value;
    
    switch (method) {
      case ForecastMethod.MOVING_AVERAGE:
        return ['windowSize', 'minDataPoints'];
      case ForecastMethod.EXPONENTIAL_SMOOTHING:
        return ['alpha', 'useSeasonality', 'minDataPoints'];
      case ForecastMethod.WEIGHTED_AVERAGE:
        return ['windowSize', 'minDataPoints'];
      case ForecastMethod.LINEAR_TREND:
        return ['minDataPoints', 'confidenceLevel'];
      case ForecastMethod.PIPELINE_CONVERSION:
        return ['minDataPoints', 'confidenceLevel'];
      case ForecastMethod.HISTORICAL_AVERAGE:
        return ['minDataPoints'];
      default:
        return [];
    }
  }

  /**
   * Проверить, отображается ли параметр для текущего метода
   */
  isParamRelevant(paramName: string): boolean {
    return this.getRelevantParams().includes(paramName);
  }

  /**
   * Получить подсказку для параметра
   */
  getParamTooltip(paramName: string): string {
    const tooltips: Record<string, string> = {
      windowSize: 'Количество последних периодов для расчета среднего (2-12)',
      alpha: 'Коэффициент сглаживания: больше = больший вес недавним данным (0.1-0.9)',
      minDataPoints: 'Минимальное количество исторических данных для прогноза (3-20)',
      useSeasonality: 'Учитывать сезонные колебания в данных',
      confidenceLevel: 'Уровень доверительной вероятности прогноза (80%-99%)'
    };
    return tooltips[paramName] || '';
  }

  private loadManagers(): void {
    this.loadingManagers.set(true);
    this.userService.getManagers().subscribe({
      next: (managers) => {
        this.managers.set(managers);
        this.loadingManagers.set(false);
      },
      error: (err) => {
        console.error('Error loading managers:', err);
        this.loadingManagers.set(false);
      }
    });
  }

  private updatePeriodPreview(): void {
    const startDate = this.forecastForm.get('startDate')?.value;
    const endDate = this.forecastForm.get('endDate')?.value;
    const periodType = this.forecastForm.get('periodType')?.value;

    if (!startDate || !endDate || !periodType) {
      this.periodPreview.set([]);
      return;
    }

    const periods = this.calculatePeriods(new Date(startDate), new Date(endDate), periodType);
    this.periodPreview.set(periods);
  }

  private calculatePeriods(start: Date, end: Date, periodType: ForecastPeriodType): string[] {
    const periods: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      let label = '';
      const next = new Date(current);

      switch (periodType) {
        case ForecastPeriodType.DAILY:
          label = current.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
          next.setDate(next.getDate() + 1);
          break;
        case ForecastPeriodType.WEEKLY:
          const weekEnd = new Date(current);
          weekEnd.setDate(weekEnd.getDate() + 6);
          label = `Неделя ${current.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}`;
          next.setDate(next.getDate() + 7);
          break;
        case ForecastPeriodType.MONTHLY:
          label = current.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
          next.setMonth(next.getMonth() + 1);
          break;
        case ForecastPeriodType.QUARTERLY:
          const quarter = Math.floor(current.getMonth() / 3) + 1;
          label = `Q${quarter} ${current.getFullYear()}`;
          next.setMonth(next.getMonth() + 3);
          break;
        case ForecastPeriodType.YEARLY:
          label = current.getFullYear().toString();
          next.setFullYear(next.getFullYear() + 1);
          break;
      }

      periods.push(label);
      current.setTime(next.getTime());

      // Защита от бесконечного цикла
      if (periods.length > 100) break;
    }

    return periods;
  }

  onSubmit(): void {
    if (this.forecastForm.invalid) {
      this.forecastForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.forecastForm.value;
    const createDto: any = {
      name: formValue.name,
      type: formValue.type,
      method: formValue.method,
      periodType: formValue.periodType,
      startDate: formValue.startDate.toISOString(),
      endDate: formValue.endDate.toISOString(),
      targetValue: formValue.targetValue,
      description: formValue.description,
      tags: formValue.tags,
      // Добавить расширенные параметры
      config: {
        windowSize: formValue.advancedParams.windowSize,
        alpha: formValue.advancedParams.alpha,
        minDataPoints: formValue.advancedParams.minDataPoints,
        useSeasonality: formValue.advancedParams.useSeasonality,
        confidenceLevel: formValue.advancedParams.confidenceLevel
      }
    };

    // Добавить опциональные поля
    if (formValue.ownerId) {
      createDto.ownerId = formValue.ownerId;
    }
    if (formValue.team) {
      createDto.team = formValue.team;
    }

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

  getMethodDetailedInfo(method: ForecastMethod): { title: string; description: string; bestFor: string; formula: string } {
    const info: Record<ForecastMethod, { title: string; description: string; bestFor: string; formula: string }> = {
      [ForecastMethod.LINEAR_TREND]: {
        title: 'Линейный тренд',
        description: 'Использует линейную регрессию для построения прямой линии тренда на основе исторических данных.',
        bestFor: 'Подходит для данных со стабильным линейным ростом или падением',
        formula: 'y = ax + b, где a - угол наклона, b - точка пересечения'
      },
      [ForecastMethod.WEIGHTED_AVERAGE]: {
        title: 'Взвешенное среднее',
        description: 'Средневзвешенное значение, где последние периоды имеют больший вес.',
        bestFor: 'Подходит когда недавние тренды более важны чем старые данные',
        formula: 'Σ(w_i × x_i) / Σw_i, где w_i - вес периода'
      },
      [ForecastMethod.PIPELINE_CONVERSION]: {
        title: 'Конверсия воронки',
        description: 'Прогнозирует на основе исторической конверсии сделок в воронке продаж.',
        bestFor: 'Идеален для прогноза продаж на основе текущей воронки',
        formula: 'Прогноз = (Сделки в воронке) × (Средняя конверсия) × (Средний размер)'
      },
      [ForecastMethod.MOVING_AVERAGE]: {
        title: 'Скользящее среднее',
        description: 'Среднее значение по последним N периодам для сглаживания колебаний.',
        bestFor: 'Хорош для сглаживания шума и выявления общего тренда',
        formula: 'MA = (x_1 + x_2 + ... + x_n) / n'
      },
      [ForecastMethod.EXPONENTIAL_SMOOTHING]: {
        title: 'Экспоненциальное сглаживание',
        description: 'Применяет экспоненциальное сглаживание с параметром alpha для предсказания.',
        bestFor: 'Отлично работает с сезонными данными и трендами',
        formula: 'S_t = α × x_t + (1-α) × S_(t-1), где α - параметр сглаживания'
      },
      [ForecastMethod.HISTORICAL_AVERAGE]: {
        title: 'Историческое среднее',
        description: 'Простое среднее арифметическое всех исторических значений.',
        bestFor: 'Базовый метод для начальных оценок при стабильных данных',
        formula: 'Среднее = Σx_i / n'
      }
    };
    return info[method];
  }

  getPeriodsCount(): number {
    return this.periodPreview().length;
  }
}
