import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Forecast,
  ForecastPeriod,
  ForecastComparison,
  CreateForecastDto,
  UpdateForecastDto,
  ForecastType,
  ForecastStatus,
} from '../models/forecasting.models';
import { environment } from '@crm/front/environments/environment';
import { CurrencyService } from '../../services/currency.service';

export interface ForecastQueryParams {
  type?: ForecastType;
  status?: ForecastStatus;
  ownerId?: string;
  team?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ForecastListResponse {
  data: Forecast[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class ForecastingService {
  private http = inject(HttpClient);
  private currencyService = inject(CurrencyService);
  private readonly apiUrl = environment.apiBase + '/forecasting';

  getForecasts(params?: ForecastQueryParams): Observable<ForecastListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            httpParams = httpParams.set(key, value.toISOString());
          } else {
            httpParams = httpParams.set(key, value.toString());
          }
        }
      });
    }

    return this.http.get<ForecastListResponse>(this.apiUrl, {
      params: httpParams,
    });
  }

  getForecast(id: string): Observable<Forecast> {
    return this.http.get<Forecast>(`${this.apiUrl}/${id}`);
  }

  createForecast(dto: CreateForecastDto): Observable<Forecast> {
    return this.http.post<Forecast>(this.apiUrl, dto);
  }

  updateForecast(id: string, dto: UpdateForecastDto): Observable<Forecast> {
    return this.http.put<Forecast>(`${this.apiUrl}/${id}`, dto);
  }

  deleteForecast(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  calculateForecast(
    id: string,
    includeHistorical = true
  ): Observable<Forecast> {
    return this.http.post<Forecast>(`${this.apiUrl}/${id}/calculate`, null, {
      params: { includeHistorical: includeHistorical.toString() },
    });
  }

  getPeriods(forecastId: string): Observable<ForecastPeriod[]> {
    return this.http.get<ForecastPeriod[]>(
      `${this.apiUrl}/${forecastId}/periods`
    );
  }

  updatePeriodActual(
    periodId: string,
    actualValue: number,
    metrics?: any
  ): Observable<ForecastPeriod> {
    return this.http.put<ForecastPeriod>(
      `${this.apiUrl}/periods/${periodId}/actual`,
      {
        actualValue,
        metrics,
      }
    );
  }

  getComparison(forecastId: string): Observable<ForecastComparison> {
    return this.http.get<ForecastComparison>(
      `${this.apiUrl}/${forecastId}/comparison`
    );
  }

  formatCurrency(value: number): string {
    return this.currencyService.formatAmount(value);
  }

  formatPercentage(value: number | string | null | undefined): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (numValue === null || numValue === undefined || isNaN(numValue)) {
      return '0%';
    }
    return `${numValue.toFixed(1)}%`;
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'primary';
    if (confidence >= 40) return 'warn';
    return 'accent';
  }

  getVarianceColor(variance: number): string {
    if (Math.abs(variance) <= 5) return 'success';
    if (Math.abs(variance) <= 15) return 'primary';
    if (Math.abs(variance) <= 30) return 'warn';
    return 'accent';
  }
}
