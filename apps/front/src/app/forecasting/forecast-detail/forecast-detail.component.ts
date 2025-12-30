import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { ForecastingService } from '../services/forecasting.service';
import { Forecast } from '../models/forecasting.models';

@Component({
  selector: 'app-forecast-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageLayoutComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './forecast-detail.component.html',
  styleUrls: ['./forecast-detail.component.scss']
})
export class ForecastDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private forecastingService = inject(ForecastingService);

  forecast: Forecast | null = null;
  loading = true;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadForecast(id);
    }
  }

  loadForecast(id: string) {
    this.loading = true;
    this.forecastingService.getForecast(id).subscribe({
      next: (forecast) => {
        this.forecast = forecast;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading forecast:', error);
        this.loading = false;
        this.router.navigate(['/forecasting']);
      }
    });
  }

  calculate() {
    if (!this.forecast) return;
    
    this.loading = true;
    this.forecastingService.calculateForecast(this.forecast.id).subscribe({
      next: () => {
        this.loadForecast(this.forecast!.id);
      },
      error: (error) => {
        console.error('Error calculating forecast:', error);
        this.loading = false;
      }
    });
  }

  formatCurrency(value: number): string {
    return this.forecastingService.formatCurrency(value);
  }

  formatPercentage(value: number): string {
    return this.forecastingService.formatPercentage(value);
  }

  formatDateRange(start: Date, end: Date): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`;
  }
}
