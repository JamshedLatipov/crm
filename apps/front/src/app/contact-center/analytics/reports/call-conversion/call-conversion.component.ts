import { Component, effect, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import { CallFilters, CallConversion } from '../../models/analytics.models';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';
import { CurrencyService } from '../../../../services/currency.service';

@Component({
  selector: 'app-call-conversion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    ReportFiltersComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
  ],
  templateUrl: './call-conversion.component.html',
  styleUrl: './call-conversion.component.scss',
})
export class CallConversionComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly currencyService = inject(CurrencyService);
  
  data = signal<CallConversion | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  agentColumns: CrmColumn[] = [
    { key: 'agent', label: 'Оператор' },
    { key: 'totalCalls', label: 'Всего звонков', cell: (row: any) => row.totalCalls.toString() },
    { key: 'callsWithLeads', label: 'С лидами', cell: (row: any) => row.callsWithLeads.toString() },
    { key: 'callsWithDeals', label: 'Со сделками', cell: (row: any) => row.callsWithDeals.toString() },
    { key: 'leadConversionRate', label: 'Конверсия в лиды', template: 'leadConversionTemplate' },
    { key: 'dealConversionRate', label: 'Конверсия в сделки', template: 'dealConversionTemplate' },
    { key: 'totalRevenue', label: 'Выручка', template: 'revenueTemplate' },
    { key: 'avgRevenue', label: 'Ср. выручка', template: 'avgRevenueTemplate' },
  ];

  trendColumns: CrmColumn[] = [
    { key: 'date', label: 'Дата' },
    { key: 'totalCalls', label: 'Звонков', cell: (row: any) => row.totalCalls.toString() },
    { key: 'callsWithLeads', label: 'С лидами', cell: (row: any) => row.callsWithLeads.toString() },
    { key: 'callsWithDeals', label: 'Со сделками', cell: (row: any) => row.callsWithDeals.toString() },
    { key: 'leadConversionRate', label: '% лидов', template: 'leadConversionTemplate' },
    { key: 'dealConversionRate', label: '% сделок', template: 'dealConversionTemplate' },
  ];

  dealStageColumns: CrmColumn[] = [
    { key: 'status', label: 'Статус' },
    { key: 'count', label: 'Количество', cell: (row: any) => row.count.toString() },
    { key: 'totalValue', label: 'Сумма', template: 'totalValueTemplate' },
  ];

  agentChartData: ChartConfiguration<'bar'>['data'] | null = null;
  trendChartData: ChartConfiguration<'line'>['data'] | null = null;
  dealStageChartData: ChartConfiguration<'pie'>['data'] | null = null;

  agentChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Производительность операторов с выручкой' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Количество' } },
      y1: { 
        beginAtZero: true, 
        position: 'right', 
        title: { display: true, text: `Выручка (${this.currencyService.currencySymbol()})` },
        grid: { drawOnChartArea: false }
      }
    }
  };

  trendChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Тренд конверсии во времени' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Процент конверсии (%)' } },
    }
  };

  dealStageChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'right' },
      title: { display: true, text: 'Распределение по стадиям сделок' },
    },
  };

  ngOnInit() {
    this.loadData({});
  }

  onFiltersChange(filters: CallFilters) {
    this.loadData(filters);
  }

  loadData(filters: CallFilters) {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsApi.getCallConversion(filters).subscribe({
      next: (data) => {
        this.data.set(data);
        this.prepareCharts(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load conversion data');
        console.error('Conversion data error:', err);
        this.loading.set(false);
      },
    });
  }

  prepareCharts(data: CallConversion) {
    // Agent performance chart
    const topAgents = data.byAgent.slice(0, 10);
    this.agentChartData = {
      labels: topAgents.map(a => a.agent),
      datasets: [
        {
          type: 'bar',
          label: 'Calls with Leads',
          data: topAgents.map(a => a.callsWithLeads),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: 'Calls with Deals',
          data: topAgents.map(a => a.callsWithDeals),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Total Revenue',
          data: topAgents.map(a => a.totalRevenue),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          yAxisID: 'y1',
          tension: 0.4,
        },
      ] as any,
    };

    // Trend chart
    const recentTrend = data.trend.slice(-30);
    this.trendChartData = {
      labels: recentTrend.map(t => new Date(t.date).toLocaleDateString('ru-RU')),
      datasets: [
        {
          label: 'Lead Conversion Rate',
          data: recentTrend.map(t => t.leadConversionRate),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
        },
        {
          label: 'Deal Conversion Rate',
          data: recentTrend.map(t => t.dealConversionRate),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
        },
      ],
    };

    // Deal stages pie chart
    this.dealStageChartData = {
      labels: data.dealStages.map(s => s.status),
      datasets: [
        {
          data: data.dealStages.map(s => s.count),
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(153, 102, 255, 0.8)',
          ],
        },
      ],
    };
  }

  formatCurrency(value: number): string {
    return this.currencyService.formatAmount(value);
  }
}
