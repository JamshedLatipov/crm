import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, share, Subject, takeUntil, filter } from 'rxjs';
import {
  ContactCenterMonitoringService,
  OperatorStatus,
  QueueStatus,
  ActiveCall,
  ContactCenterStats,
} from '../services/contact-center-monitoring.service';
import { CrmTableComponent, CrmColumnTemplateDirective } from '../../shared/components/crm-table/crm-table.component';
import type { CrmColumn } from '../../shared/components/crm-table/crm-table.component';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MatIconModule } from '@angular/material/icon';
import { PageLayoutComponent } from '@crm/front/app/shared/page-layout/page-layout.component';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

// Register all Chart.js components
Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-online-monitoring',
  standalone: true,
  imports: [
    CommonModule,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    BaseChartDirective,
    MatIconModule,
    PageLayoutComponent,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  templateUrl: './online-monitoring.component.html',
  styleUrls: ['./online-monitoring.component.scss'],
})
export class OnlineMonitoringComponent implements OnInit, OnDestroy {
  private svc = inject(ContactCenterMonitoringService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  operators = signal<OperatorStatus[]>([]);
  queues = signal<QueueStatus[]>([]);
  activeCalls = signal<ActiveCall[]>([]);
  stats = signal<ContactCenterStats>({ totalUniqueWaiting: 0 });
  lastUpdate = signal<Date | null>(null);
  
  // Alert thresholds
  private readonly CRITICAL_WAIT_THRESHOLD = 60; // 60 секунд
  private readonly WARNING_WAIT_THRESHOLD = 30; // 30 секунд
  private readonly CRITICAL_QUEUE_SIZE = 5; // 5+ ожидающих
  
  // Audio alert
  private alertAudio?: HTMLAudioElement;
  private lastAlertTime = 0;
  private readonly ALERT_COOLDOWN = 30000; // 30 секунд между алертами

  // Computed values
  totalOperators = computed(() => {
    const count = this.operators().length;
    console.log(`[Computed] totalOperators: ${count}`);
    return count;
  });
  
  activeOperators = computed(() => {
    const ops = this.operators().filter(op => op.status !== 'offline');
    console.log(`[Computed] activeOperators: ${ops.length} / ${this.operators().length}`);
    return ops.length;
  });
  
  totalQueues = computed(() => this.queues().length);
  
  // Используем уникальное количество ожидающих из stats
  totalWaiting = computed(() => {
    const waiting = this.stats().totalUniqueWaiting;
    console.log(`[Computed] totalWaiting (from stats): ${waiting}`);
    return waiting;
  });
  
  // Активные звонки = сумма callsInService из всех очередей
  totalActiveCalls = computed(() => {
    const total = this.queues().reduce((sum, q) => sum + (q.callsInService || 0), 0);
    console.log(`[Computed] totalActiveCalls (callsInService sum): ${total}`);
    return total;
  });
  
  // Операторы на звонках (для справки и сравнения)
  operatorsOnCall = computed(() => {
    const count = this.operators().filter(op => op.status === 'on_call').length;
    console.log(`[Computed] operatorsOnCall: ${count}`);
    return count;
  });
  
  avgServiceLevel = computed(() => {
    const queues = this.queues();
    if (queues.length === 0) return 0;
    const total = queues.reduce((sum, q) => sum + (q.serviceLevel || 0), 0);
    const avg = Math.round(total / queues.length);
    console.log(`[Computed] avgServiceLevel: ${avg}%`);
    return avg;
  });
  
  // Sorted queues by priority (most waiting first, then longest wait)
  sortedQueues = computed(() => {
    const queues = [...this.queues()];
    return queues.sort((a, b) => {
      // First: by waiting count descending
      if (b.waiting !== a.waiting) {
        return b.waiting - a.waiting;
      }
      // Then: by longest wait descending
      return b.longestWaitingSeconds - a.longestWaitingSeconds;
    });
  });
  
  // Critical queues count
  criticalQueues = computed(() => {
    return this.queues().filter(q => 
      q.waiting >= this.CRITICAL_QUEUE_SIZE || 
      q.longestWaitingSeconds >= this.CRITICAL_WAIT_THRESHOLD
    ).length;
  });

  // Direct WebSocket streams with fallback to polling
  operators$: Observable<OperatorStatus[]> = this.svc.getOperators().pipe(
    share()
  );

  queues$: Observable<QueueStatus[]> = this.svc.getQueues().pipe(
    share()
  );

  activeCalls$: Observable<ActiveCall[]> = this.svc.getActiveCalls().pipe(
    share()
  );

  stats$: Observable<ContactCenterStats> = this.svc.getStats().pipe(
    share()
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
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
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
    
    // Initialize audio alert (optional sound effect)
    // this.alertAudio = new Audio('/assets/sounds/alert.mp3');
    
    this.operators$.pipe(takeUntil(this.destroy$)).subscribe((operators) => {
      console.log('[OnlineMonitoring] ===== OPERATORS UPDATE =====');
      console.log('[OnlineMonitoring] Operators received:', operators.length);
      
      // Валидация данных операторов
      if (!Array.isArray(operators)) {
        console.error('[OnlineMonitoring] ERROR: operators is not an array!', operators);
        return;
      }
      
      // Детальный лог операторов
      operators.forEach((op, idx) => {
        console.log(`  [${idx}] ${op.name}: status=${op.status}, statusDuration=${op.statusDuration}s, currentCall=${op.currentCall}, currentCallDuration=${op.currentCallDuration}s`);
        
        // Валидация полей оператора
        if (!op.id || !op.name) {
          console.warn(`  WARNING: Operator ${idx} missing id or name`, op);
        }
        if (op.status === 'on_call' && !op.currentCall) {
          console.warn(`  WARNING: Operator ${op.name} is on_call but has no currentCall`);
        }
        if (op.currentCall && !op.currentCallDuration) {
          console.warn(`  WARNING: Operator ${op.name} has currentCall but no duration`);
        }
      });
      
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

      // Create new array reference to trigger Chart.js update with animation
      this.chartData.datasets[0].data = [
        statusCounts.idle,
        statusCounts.on_call,
        statusCounts.wrap_up,
        statusCounts.offline,
      ];
      // Force new reference to trigger change detection
      this.chartData = { ...this.chartData };
      this.cdr.detectChanges();
    });

    this.queues$.pipe(takeUntil(this.destroy$)).subscribe((queues) => {
      console.log('[OnlineMonitoring] ===== QUEUES UPDATE =====');
      const now = new Date();
      console.log(`[${now.toISOString()}] Queues received:`, queues.length);
      this.lastUpdate.set(now);
      
      // Валидация данных очередей
      if (!Array.isArray(queues)) {
        console.error('[OnlineMonitoring] ERROR: queues is not an array!', queues);
        return;
      }
      
      // Детальный лог очередей
      let totalWaitingSum = 0;
      let totalCallsInService = 0;
      
      queues.forEach((q, idx) => {
        console.log(`  [${idx}] ${q.name}:`);
        console.log(`      waiting: ${q.waiting}`);
        console.log(`      callsInService: ${q.callsInService}`);
        console.log(`      longestWaiting: ${q.longestWaitingSeconds}s`);
        console.log(`      availableMembers: ${q.availableMembers}/${q.totalMembers}`);
        console.log(`      serviceLevel: ${q.serviceLevel}%`);
        
        totalWaitingSum += q.waiting || 0;
        totalCallsInService += q.callsInService || 0;
        
        // Валидация данных очередей
        if (!q.id || !q.name) {
          console.warn(`    WARNING: Queue ${idx} missing id or name`, q);
        }
        if (q.waiting < 0 || q.callsInService < 0) {
          console.error(`    ERROR: Queue ${q.name} has negative values! waiting=${q.waiting}, callsInService=${q.callsInService}`);
        }
      });
      
      console.log(`[OnlineMonitoring] Summary: totalWaiting(sum)=${totalWaitingSum}, totalCallsInService=${totalCallsInService}`);
      console.log('[OnlineMonitoring] Raw queues data:', JSON.stringify(queues, null, 2));
      
      this.queues.set(queues);
      
      // Check for critical conditions and trigger alert
      this.checkCriticalConditions(queues);
      
      this.cdr.detectChanges();
    });

    this.activeCalls$.pipe(takeUntil(this.destroy$)).subscribe((calls) => {
      console.log('[OnlineMonitoring] ===== ACTIVE CALLS UPDATE =====');
      console.log('[OnlineMonitoring] Active calls received:', calls.length);
      
      if (!Array.isArray(calls)) {
        console.error('[OnlineMonitoring] ERROR: activeCalls is not an array!', calls);
        return;
      }
      
      calls.forEach((call, idx) => {
        console.log(`  [${idx}] ${call.callerIdNum} -> ${call.operator || 'unknown'}: duration=${call.duration}s, state=${call.state}, queue=${call.queue || 'none'}`);
      });
      
      this.activeCalls.set(calls);
      this.cdr.detectChanges();
    });

    this.stats$.pipe(takeUntil(this.destroy$)).subscribe((stats) => {
      console.log('[OnlineMonitoring] ===== STATS UPDATE =====');
      console.log('[OnlineMonitoring] Stats received:', stats);
      
      if (!stats || typeof stats.totalUniqueWaiting !== 'number') {
        console.error('[OnlineMonitoring] ERROR: Invalid stats object!', stats);
        return;
      }
      
      console.log(`[OnlineMonitoring] totalUniqueWaiting: ${stats.totalUniqueWaiting}`);
      this.stats.set(stats);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    console.log('[OnlineMonitoring] Component destroyed, cleaning up subscriptions');
    this.destroy$.next();
    this.destroy$.complete();
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
    if (seconds === null || seconds === undefined) return '—';
    
    // Для времени больше часа показываем часы
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}ч ${mins}м`;
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getStatusDurationLabel(status: OperatorStatus['status'] | undefined): string {
    switch (status) {
      case 'on_call':
        return 'В звонке';
      case 'idle':
        return 'Доступен';
      case 'offline':
        return 'Оффлайн';
      case 'wrap_up':
        return 'Завершение';
      default:
        return 'В статусе';
    }
  }
  
  /**
   * Get queue status class based on waiting count and longest wait time
   */
  getQueueStatusClass(queue: QueueStatus): string {
    if (queue.waiting >= this.CRITICAL_QUEUE_SIZE || 
        queue.longestWaitingSeconds >= this.CRITICAL_WAIT_THRESHOLD) {
      return 'queue-critical';
    }
    if (queue.waiting > 0 && queue.longestWaitingSeconds >= this.WARNING_WAIT_THRESHOLD) {
      return 'queue-warning';
    }
    return 'queue-normal';
  }
  
  /**
   * Check for critical queue conditions and trigger alerts
   */
  private checkCriticalConditions(queues: QueueStatus[]) {
    const now = Date.now();
    const criticalQueues = queues.filter(q => 
      q.waiting >= this.CRITICAL_QUEUE_SIZE || 
      q.longestWaitingSeconds >= this.CRITICAL_WAIT_THRESHOLD
    );
    
    if (criticalQueues.length > 0 && (now - this.lastAlertTime) > this.ALERT_COOLDOWN) {
      console.warn('[OnlineMonitoring] CRITICAL: Queues need attention:', criticalQueues.map(q => q.name));
      this.playAlert();
      this.lastAlertTime = now;
    }
  }
  
  /**
   * Play alert sound
   */
  private playAlert() {
    if (this.alertAudio) {
      this.alertAudio.play().catch(err => {
        console.warn('[OnlineMonitoring] Failed to play alert sound:', err);
      });
    }
    // Browser notification (if permission granted)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Контакт-центр: Внимание!', {
        body: `${this.criticalQueues()} очередей требуют внимания`,
        icon: '/assets/icons/alert.png',
        tag: 'queue-alert',
      });
    }
  }
  
  /**
   * Manual refresh button handler
   */
  refreshData() {
    console.log('[OnlineMonitoring] Manual refresh triggered');
    // Force re-fetch from backend via REST
    this.svc.fetchQueuesSnapshot().subscribe(queues => {
      console.log('[OnlineMonitoring] Manual refresh complete:', queues.length);
    });
    this.svc.fetchOperatorsSnapshot().subscribe(operators => {
      console.log('[OnlineMonitoring] Operators refreshed:', operators.length);
    });
    this.lastUpdate.set(new Date());
  }
  
  /**
   * Request notification permission
   */
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('[OnlineMonitoring] Notification permission:', permission);
      });
    }
  }
  
  /**
   * Format last update time
   */
  formatLastUpdate(): string {
    const lastUpdate = this.lastUpdate();
    if (!lastUpdate) return 'Нет данных';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    
    if (diff < 5) return 'только что';
    if (diff < 60) return `${diff} сек назад`;
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    return lastUpdate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
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
}
