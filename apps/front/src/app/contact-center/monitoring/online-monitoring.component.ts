import { Component, inject, OnInit, ChangeDetectorRef, Input, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { concat, Observable, shareReplay } from 'rxjs';
import { ContactCenterMonitoringService, OperatorStatus, QueueStatus } from '../services/contact-center-monitoring.service';
import { CrmTableComponent } from '../../shared/components/crm-table/crm-table.component';
import type { CrmColumn } from '../../shared/components/crm-table/crm-table.component';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MatIconModule } from '@angular/material/icon';
import { PageLayoutComponent } from '@crm/front/app/shared/page-layout/page-layout.component';

// Register all Chart.js components
Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-online-monitoring',
  standalone: true,
  imports: [CommonModule, CrmTableComponent, BaseChartDirective, MatIconModule, PageLayoutComponent],
  templateUrl: './online-monitoring.component.html',
  styleUrls: ['./online-monitoring.component.scss'],
})
export class OnlineMonitoringComponent implements OnInit, AfterViewInit {
  private svc = inject(ContactCenterMonitoringService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('titleTemplate') titleTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('currentCallTemplate') currentCallTemplate!: TemplateRef<any>;
  @ViewChild('avgHandleTimeTemplate') avgHandleTimeTemplate!: TemplateRef<any>;
  @ViewChild('serviceTemplate') serviceTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  @ViewChild('tableTitleTemplate') tableTitleTemplate!: TemplateRef<any>;

  @Input() templates: { [key: string]: TemplateRef<any> } = {};

  // Combine a one-time REST snapshot (fast initial render) with the live WS stream.
  // concat will emit the snapshot first (HTTP completes) and then forward live updates from WS.
  operators$: Observable<OperatorStatus[]> = concat(
    this.svc.fetchOperatorsSnapshot(),
    this.svc.getOperators()
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  queues$: Observable<QueueStatus[]> = concat(
    this.svc.fetchQueuesSnapshot(),
    this.svc.getQueues()
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  // Chart data
  chartData: ChartData<'pie'> = {
    labels: ['Доступен', 'На звонке', 'Завершение', 'Оффлайн'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#10b981', '#2563eb', '#f59e0b', '#6b7280'],
      hoverBackgroundColor: ['#059669', '#1d4ed8', '#d97706', '#4b5563']
    }]
  };

  chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // Hide legend since we have custom legend
      },
      datalabels: {
        display: (context: any) => {
          return context && context.dataset && context.dataset.data && context.dataset.data.length > 0;
        },
        color: '#fff',
        font: {
          size: 14,
          weight: 'bold'
        },
        formatter: (value: number, context: any) => {
          if (!context || !context.dataset || !context.dataset.data) return '';
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          return percentage + '%';
        }
      }
    }
  };

  private currentOperators: OperatorStatus[] = [];

  ngOnInit() {
    this.operators$.subscribe(operators => {
      console.log('Operators data:', operators);
      this.currentOperators = operators;

      // If no data, use mock data for testing
      if (!operators || operators.length === 0) {
        console.log('Using mock data');
        operators = [
          { id: '1', name: 'Operator 1', status: 'idle' as const },
          { id: '2', name: 'Operator 2', status: 'on_call' as const },
          { id: '3', name: 'Operator 3', status: 'wrap_up' as const },
          { id: '4', name: 'Operator 4', status: 'offline' as const },
          { id: '5', name: 'Operator 5', status: 'idle' as const },
        ];
        this.currentOperators = operators;
      }

      const statusCounts = {
        idle: 0,
        on_call: 0,
        wrap_up: 0,
        offline: 0
      };
      operators.forEach(op => {
        if (op.status in statusCounts) {
          statusCounts[op.status as keyof typeof statusCounts]++;
        }
      });
      console.log('Status counts:', statusCounts);
      // Create new dataset to trigger change detection
      this.chartData = {
        ...this.chartData,
        datasets: [{
          ...this.chartData.datasets[0],
          data: [
            statusCounts.idle,
            statusCounts.on_call,
            statusCounts.wrap_up,
            statusCounts.offline
          ]
        }]
      };
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit() {
    // Templates are now available after view init
  }

  getPercentage(status: string): number {
    const total = this.currentOperators.length;
    if (total === 0) return 0;
    const count = this.currentOperators.filter(op => op.status === status).length;
    return Math.round((count / total) * 100);
  }

  formatStatus(s: OperatorStatus['status'] | undefined) {
    switch (s) {
      case 'idle':
        return 'Доступен';
      case 'on_call':
        return 'На звонке';
      case 'wrap_up':
        return 'Завершение';
      case 'offline':
        return 'Оффлайн';
      default:
        return '\u2014';
    }
  }

  // compute percent from numbers so template is safe
  computePercentFromNumbers(waiting: number, callsInService: number) {
    const denom = (callsInService ?? 0) + (waiting ?? 0) + 1;
    const pct = (waiting / denom) * 100;
    return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
  }

  // crm-table column definitions for operators
  columns: CrmColumn[] = [
    { key: 'title', label: 'Оператор', width: '30%', template: 'titleTemplate' },
    { key: 'status', label: 'Статус', width: '15%', template: 'statusTemplate' },
    { key: 'currentCall', label: 'Клиент', width: '20%', template: 'currentCallTemplate' },
    { key: 'avgHandleTime', label: 'Время в статусе', width: '15%', template: 'avgHandleTimeTemplate' },
    { key: 'service', label: 'Сервис', width: '10%', template: 'serviceTemplate' },
    { key: 'actions', label: '', width: '10%', template: 'actionsTemplate' },
  ];

  get tableTemplates(): { [key: string]: TemplateRef<any> } {
    return {
      titleTemplate: this.titleTemplate,
      statusTemplate: this.statusTemplate,
      currentCallTemplate: this.currentCallTemplate,
      avgHandleTimeTemplate: this.avgHandleTimeTemplate,
      serviceTemplate: this.serviceTemplate,
      actionsTemplate: this.actionsTemplate,
      tableTitleTemplate: this.tableTitleTemplate
    };
  }

}
