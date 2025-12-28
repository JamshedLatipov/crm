import { Component, effect, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { ReportFiltersComponent } from '../../shared/components/report-filters/report-filters.component';
import { CallFilters, CallConversion } from '../../models/analytics.models';

@Component({
  selector: 'app-call-conversion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    ReportFiltersComponent,
  ],
  templateUrl: './call-conversion.component.html',
  styleUrl: './call-conversion.component.scss',
})
export class CallConversionComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);
  
  data = signal<CallConversion | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  agentColumns = ['agent', 'totalCalls', 'callsWithLeads', 'callsWithDeals', 'leadConversionRate', 'dealConversionRate', 'totalRevenue', 'avgRevenue'];
  trendColumns = ['date', 'totalCalls', 'callsWithLeads', 'callsWithDeals', 'leadConversionRate', 'dealConversionRate'];
  dealStageColumns = ['status', 'count', 'totalValue'];

  agentChartData: ChartConfiguration<'bar'>['data'] | null = null;
  trendChartData: ChartConfiguration<'line'>['data'] | null = null;
  dealStageChartData: ChartConfiguration<'pie'>['data'] | null = null;

  agentChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Agent Performance with Revenue' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Count' } },
      y1: { 
        beginAtZero: true, 
        position: 'right', 
        title: { display: true, text: 'Revenue (₽)' },
        grid: { drawOnChartArea: false }
      }
    }
  };

  trendChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Conversion Trend Over Time' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Conversion Rate (%)' } },
    }
  };

  dealStageChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'right' },
      title: { display: true, text: 'Deal Stages Distribution' },
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
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(value);
  }
}
