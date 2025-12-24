import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef,
  Input,
  TemplateRef,
  ViewChild,
  AfterViewInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, shareReplay } from 'rxjs';
import {
  ContactCenterMonitoringService,
  OperatorStatus,
  QueueStatus,
  ActiveCall,
} from '../services/contact-center-monitoring.service';
import { CrmTableComponent } from '../../shared/components/crm-table/crm-table.component';
import type { CrmColumn } from '../../shared/components/crm-table/crm-table.component';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MatIconModule } from '@angular/material/icon';
import { PageLayoutComponent } from '@crm/front/app/shared/page-layout/page-layout.component';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';

// Register all Chart.js components
Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-online-monitoring',
  standalone: true,
  imports: [
    CommonModule,
    CrmTableComponent,
    BaseChartDirective,
    MatIconModule,
    PageLayoutComponent,
    MatButtonModule,
    MatBadgeModule,
  ],
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
  @ViewChild('queueTitleTemplate') queueTitleTemplate!: TemplateRef<any>;
  @ViewChild('queueWaitingTemplate') queueWaitingTemplate!: TemplateRef<any>;
  @ViewChild('queueServiceLevelTemplate') queueServiceLevelTemplate!: TemplateRef<any>;
  @ViewChild('queueMembersTemplate') queueMembersTemplate!: TemplateRef<any>;

  @Input() templates: { [key: string]: TemplateRef<any> } = {};

  // Signals for reactive state
  operators = signal<OperatorStatus[]>([]);
  queues = signal<QueueStatus[]>([]);
  activeCalls = signal<ActiveCall[]>([]);

  // Computed values
  totalOperators = computed(() => this.operators().length);
  activeOperators = computed(() => this.operators().filter(op => op.status !== 'offline').length);
  totalQueues = computed(() => this.queues().length);
  totalWaiting = computed(() => this.queues().reduce((sum, q) => sum + q.waiting, 0));
  totalCallsInService = computed(() => this.queues().reduce((sum, q) => sum + q.callsInService, 0));
  avgServiceLevel = computed(() => {
    const queues = this.queues();
    if (queues.length === 0) return 0;
    const total = queues.reduce((sum, q) => sum + (q.serviceLevel || 0), 0);
    return Math.round(total / queues.length);
  });

  // Direct WebSocket streams with fallback to polling
  operators$: Observable<OperatorStatus[]> = this.svc.getOperators().pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  queues$: Observable<QueueStatus[]> = this.svc.getQueues().pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  activeCalls$: Observable<ActiveCall[]> = this.svc.getActiveCalls().pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Chart data
  chartData: ChartData<'pie'> = {
    labels: ['Доступен', 'На звонке', 'Завершение', 'Оффлайн'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ['#10b981', '#2563eb', '#f59e0b', '#6b7280'],
        hoverBackgroundColor: ['#059669', '#1d4ed8', '#d97706', '#4b5563'],
      },
    ],
  };

  chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        display: (context: any) => {
          return (
            context &&
            context.dataset &&
            context.dataset.data &&
            context.dataset.data.length > 0
          );
        },
        color: '#fff',
        font: {
          size: 14,
          weight: 'bold',
        },
        formatter: (value: number, context: any) => {
          if (!context || !context.dataset || !context.dataset.data) return '';
          const total = context.dataset.data.reduce(
            (a: number, b: number) => a + b,
            0
          );
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          return percentage + '%';
        },
      },
    },
  };

  ngOnInit() {
    console.log('[OnlineMonitoring] Component initialized');
    this.operators$.subscribe((operators) => {
      console.log('[OnlineMonitoring] Operators updated:', operators?.length || 0, operators);
      this.operators.set(operators);

      const statusCounts = {
        idle: 0,
        on_call: 0,
        wrap_up: 0,
        offline: 0,
      };
      (operators || []).forEach((op) => {
        if (op.status in statusCounts) {
          statusCounts[op.status as keyof typeof statusCounts]++;
        }
      });

      this.chartData = {
        ...this.chartData,
        datasets: [
          {
            ...this.chartData.datasets[0],
            data: [
              statusCounts.idle,
              statusCounts.on_call,
              statusCounts.wrap_up,
              statusCounts.offline,
            ],
          },
        ],
      };
      this.cdr.detectChanges();
    });

    this.queues$.subscribe((queues) => {
      console.log('[OnlineMonitoring] Queues updated:', queues?.length || 0, queues);
      this.queues.set(queues);
      this.cdr.detectChanges();
    });

    this.activeCalls$.subscribe((calls) => {
      console.log('[OnlineMonitoring] Active calls updated:', calls?.length || 0, calls);
      this.activeCalls.set(calls);
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit() {
    // Templates are now available after view init
  }

  getPercentage(status: string): number {
    const total = this.operators().length;
    if (total === 0) return 0;
    const count = this.operators().filter(
      (op) => op.status === status
    ).length;
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
        return '—';
    }
  }

  getStatusClass(s: OperatorStatus['status'] | undefined): string {
    switch (s) {
      case 'idle':
        return 'status-idle';
      case 'on_call':
        return 'status-on-call';
      case 'wrap_up':
        return 'status-wrap-up';
      case 'offline':
        return 'status-offline';
      default:
        return '';
    }
  }

  formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  columns: CrmColumn[] = [
    {
      key: 'title',
      label: 'Оператор',
      width: '20%',
      template: 'titleTemplate',
    },
    {
      key: 'status',
      label: 'Статус',
      width: '15%',
      template: 'statusTemplate',
    },
    {
      key: 'currentCall',
      label: 'Клиент',
      width: '15%',
      template: 'currentCallTemplate',
    },
    {
      key: 'avgHandleTime',
      label: 'Ср. время',
      width: '10%',
      template: 'avgHandleTimeTemplate',
    },
    {
      key: 'callsToday',
      label: 'Звонков',
      width: '10%',
    },
    {
      key: 'service',
      label: 'Очередь',
      width: '15%',
      template: 'serviceTemplate',
    },
    { key: 'actions', label: '', width: '15%', template: 'actionsTemplate' },
  ];

  queueColumns: CrmColumn[] = [
    {
      key: 'name',
      label: 'Очередь',
      width: '20%',
      template: 'queueTitleTemplate',
    },
    {
      key: 'waiting',
      label: 'Ожидают',
      width: '10%',
      template: 'queueWaitingTemplate',
    },
    {
      key: 'callsInService',
      label: 'В работе',
      width: '10%',
    },
    {
      key: 'totalCallsToday',
      label: 'Количество звонков',
      width: '12%',
    },
    {
      key: 'answeredCallsToday',
      label: 'Обработано',
      width: '10%',
    },
    {
      key: 'serviceLevel',
      label: 'Уровень сервиса',
      width: '13%',
      template: 'queueServiceLevelTemplate',
    },
    {
      key: 'members',
      label: 'Операторы',
      width: '10%',
      template: 'queueMembersTemplate',
    },
    {
      key: 'abandonedToday',
      label: 'Пропущено',
      width: '10%',
    },
  ];

  get tableTemplates(): { [key: string]: TemplateRef<any> } {
    return {
      titleTemplate: this.titleTemplate,
      statusTemplate: this.statusTemplate,
      currentCallTemplate: this.currentCallTemplate,
      avgHandleTimeTemplate: this.avgHandleTimeTemplate,
      serviceTemplate: this.serviceTemplate,
      actionsTemplate: this.actionsTemplate,
      tableTitleTemplate: this.tableTitleTemplate,
      queueTitleTemplate: this.queueTitleTemplate,
      queueWaitingTemplate: this.queueWaitingTemplate,
      queueServiceLevelTemplate: this.queueServiceLevelTemplate,
      queueMembersTemplate: this.queueMembersTemplate,
    };
  }
}
