import { Routes } from '@angular/router';

export const FORECASTING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => 
      import('./forecasting-dashboard/forecasting-dashboard.component').then(m => m.ForecastingDashboardComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./forecast-form/forecast-form.component').then(m => m.ForecastFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./forecast-detail/forecast-detail.component').then(m => m.ForecastDetailComponent)
  }
];
