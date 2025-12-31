import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import {
  ContactCenterMonitoringService,
  OperatorStatus,
  QueueStatus,
  ActiveCall,
  ContactCenterStats,
} from '../services/contact-center-monitoring.service';
import { CrmTableComponent, CrmColumnTemplateDirective } from '../../shared/components/crm-table/crm-table.component';
import type { CrmColumn } from '../../shared/components/crm-table/crm-table.component';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';

interface DailyMetrics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  avgWaitTime: number;
  slaCompliance: number;
}

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressBarModule,
    MatCardModule,
    MatTabsModule,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    PageLayoutComponent,
  ],
  templateUrl: './supervisor-dashboard.component.html',
  styleUrls: ['./supervisor-dashboard.component.scss'],
})
export class SupervisorDashboardComponent implements OnInit, OnDestroy {
  private monitoringSvc = inject(ContactCenterMonitoringService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  operators = signal<OperatorStatus[]>([]);
  queues = signal<QueueStatus[]>([]);
  activeCalls = signal<ActiveCall[]>([]);
  stats = signal<ContactCenterStats>({ totalUniqueWaiting: 0 });
  lastUpdate = signal<Date>(new Date());
  
  // Filters
  selectedStatusFilter = signal<string>('all');
  selectedQueueFilter = signal<string>('all');

  // Computed metrics
  totalOperators = computed(() => this.operators().length);
  
  onlineOperators = computed(() => 
    this.operators().filter(op => op.status !== 'offline').length
  );
  
  idleOperators = computed(() => 
    this.operators().filter(op => op.status === 'idle').length
  );
  
  busyOperators = computed(() => 
    this.operators().filter(op => op.status === 'on_call').length
  );
  
  wrapUpOperators = computed(() => 
    this.operators().filter(op => op.status === 'wrap_up').length
  );
  
  totalQueues = computed(() => this.queues().length);
  
  totalWaiting = computed(() => this.stats().totalUniqueWaiting);
  
  totalActiveCalls = computed(() => this.activeCalls().length);
  
  // Critical queues (waiting >= 3 or wait time >= 60s)
  criticalQueues = computed(() => 
    this.queues().filter(q => q.waiting >= 3 || q.longestWaitingSeconds >= 60).length
  );
  
  // Filtered operators
  filteredOperators = computed(() => {
    const filter = this.selectedStatusFilter();
    if (filter === 'all') return this.operators();
    return this.operators().filter(op => op.status === filter);
  });
  
  // Daily metrics (calculated from queues data)
  dailyMetrics = computed<DailyMetrics>(() => {
    const queues = this.queues();
    const totalCalls = queues.reduce((sum, q) => sum + (q.totalCallsToday || 0), 0);
    const answeredCalls = queues.reduce((sum, q) => sum + (q.answeredCallsToday || 0), 0);
    const missedCalls = queues.reduce((sum, q) => sum + (q.abandonedToday || 0), 0);
    
    // Avg service level as SLA compliance
    const avgServiceLevel = queues.length > 0
      ? queues.reduce((sum, q) => sum + (q.serviceLevel || 0), 0) / queues.length
      : 0;
    
    // Calculate avg duration and wait time from active calls
    const calls = this.activeCalls();
    const avgDuration = calls.length > 0
      ? calls.reduce((sum, c) => sum + c.duration, 0) / calls.length
      : 0;
    
    const avgWaitTime = queues.length > 0
      ? queues.reduce((sum, q) => sum + (q.longestWaitingSeconds || 0), 0) / queues.length
      : 0;
    
    return {
      totalCalls,
      answeredCalls,
      missedCalls,
      avgDuration: Math.round(avgDuration),
      avgWaitTime: Math.round(avgWaitTime),
      slaCompliance: Math.round(avgServiceLevel),
    };
  });

  // Table columns
  operatorColumns: CrmColumn[] = [
    {
      key: 'name',
      label: 'Оператор',
      width: '20%',
      template: 'operatorNameTemplate',
    },
    {
      key: 'status',
      label: 'Статус',
      width: '15%',
      template: 'operatorStatusTemplate',
    },
    {
      key: 'statusDuration',
      label: 'Время в статусе',
      width: '12%',
      template: 'statusDurationTemplate',
    },
    {
      key: 'currentCall',
      label: 'Текущий звонок',
      width: '20%',
      template: 'currentCallTemplate',
    },
    {
      key: 'callsToday',
      label: 'Звонков сегодня',
      width: '10%',
    },
    {
      key: 'avgHandleTime',
      label: 'Ср. время',
      width: '10%',
      template: 'avgHandleTimeTemplate',
    },
    {
      key: 'actions',
      label: 'Действия',
      width: '13%',
      template: 'actionsTemplate',
    },
  ];

  queueColumns: CrmColumn[] = [
    {
      key: 'name',
      label: 'Очередь',
      width: '25%',
      template: 'queueNameTemplate',
    },
    {
      key: 'waiting',
      label: 'Ожидают',
      width: '10%',
      template: 'waitingTemplate',
    },
    {
      key: 'callsInService',
      label: 'В работе',
      width: '10%',
    },
    {
      key: 'availableMembers',
      label: 'Доступно',
      width: '10%',
      template: 'membersTemplate',
    },
    {
      key: 'longestWaitingSeconds',
      label: 'Макс. ожидание',
      width: '15%',
      template: 'longestWaitTemplate',
    },
    {
      key: 'serviceLevel',
      label: 'SLA',
      width: '15%',
      template: 'serviceLevelTemplate',
    },
    {
      key: 'actions',
      label: 'Действия',
      width: '15%',
      template: 'queueActionsTemplate',
    },
  ];

  activeCallColumns: CrmColumn[] = [
    {
      key: 'callerIdNum',
      label: 'Номер',
      width: '15%',
      template: 'callerTemplate',
    },
    {
      key: 'operator',
      label: 'Оператор',
      width: '20%',
    },
    {
      key: 'queue',
      label: 'Очередь',
      width: '15%',
    },
    {
      key: 'duration',
      label: 'Длительность',
      width: '12%',
      template: 'durationTemplate',
    },
    {
      key: 'state',
      label: 'Состояние',
      width: '13%',
      template: 'stateTemplate',
    },
    {
      key: 'actions',
      label: 'Действия',
      width: '25%',
      template: 'callActionsTemplate',
    },
  ];

  ngOnInit() {
    console.log('[SupervisorDashboard] Component initialized');
    
    // Subscribe to all data streams
    combineLatest([
      this.monitoringSvc.getOperators(),
      this.monitoringSvc.getQueues(),
      this.monitoringSvc.getActiveCalls(),
      this.monitoringSvc.getStats(),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([operators, queues, calls, stats]) => {
        this.operators.set(operators);
        this.queues.set(queues);
        this.activeCalls.set(calls);
        this.stats.set(stats);
        this.lastUpdate.set(new Date());
        
        console.log('[SupervisorDashboard] Data updated:', {
          operators: operators.length,
          queues: queues.length,
          calls: calls.length,
          waiting: stats.totalUniqueWaiting,
        });
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Filter methods
  setStatusFilter(status: string) {
    this.selectedStatusFilter.set(status);
  }

  // Formatting helpers
  formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return '—';
    
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}ч ${mins}м`;
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatStatus(status: OperatorStatus['status']): string {
    const statusMap: Record<string, string> = {
      idle: 'Доступен',
      on_call: 'На звонке',
      wrap_up: 'Завершение',
      offline: 'Оффлайн',
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: OperatorStatus['status']): string {
    return `status-${status}`;
  }

  getQueueStatusClass(queue: QueueStatus): string {
    if (queue.waiting >= 5 || queue.longestWaitingSeconds >= 60) {
      return 'queue-critical';
    }
    if (queue.waiting >= 3 || queue.longestWaitingSeconds >= 30) {
      return 'queue-warning';
    }
    return 'queue-normal';
  }

  formatLastUpdate(): string {
    const diff = Math.floor((new Date().getTime() - this.lastUpdate().getTime()) / 1000);
    if (diff < 5) return 'только что';
    if (diff < 60) return `${diff} сек назад`;
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    return this.lastUpdate().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  // Actions
  refreshData() {
    console.log('[SupervisorDashboard] Manual refresh triggered');
    this.monitoringSvc.fetchQueuesSnapshot().subscribe();
    this.monitoringSvc.fetchOperatorsSnapshot().subscribe();
    this.monitoringSvc.fetchActiveCallsSnapshot().subscribe();
    this.lastUpdate.set(new Date());
  }

  // Operator actions
  whisperCall(operator: OperatorStatus) {
    console.log('[SupervisorDashboard] Whisper call to:', operator.name);
    // TODO: Implement whisper functionality
    alert(`Функция "Подслушать" для ${operator.name} будет реализована в следующей версии`);
  }

  bargeCall(operator: OperatorStatus) {
    console.log('[SupervisorDashboard] Barge into call:', operator.name);
    // TODO: Implement barge functionality
    alert(`Функция "Вмешаться" для ${operator.name} будет реализована в следующей версии`);
  }

  viewOperatorDetails(operator: OperatorStatus) {
    console.log('[SupervisorDashboard] View operator details:', operator.name);
    const encodedId = encodeURIComponent(operator.id);
    this.router.navigate(['/contact-center/operator', encodedId]);
  }

  // Queue actions
  pauseQueue(queue: QueueStatus) {
    console.log('[SupervisorDashboard] Pause queue:', queue.name);
    // TODO: Implement queue pause
    alert(`Функция "Приостановить" для очереди ${queue.name} будет реализована в следующей версии`);
  }

  resumeQueue(queue: QueueStatus) {
    console.log('[SupervisorDashboard] Resume queue:', queue.name);
    // TODO: Implement queue resume
  }

  // Call actions
  transferCall(call: ActiveCall) {
    console.log('[SupervisorDashboard] Transfer call:', call.uniqueid);
    // TODO: Implement call transfer
    alert('Функция "Перевести" будет реализована в следующей версии');
  }

  hangupCall(call: ActiveCall) {
    console.log('[SupervisorDashboard] Hangup call:', call.uniqueid);
    // TODO: Implement hangup
    const confirm = window.confirm(`Завершить звонок от ${call.callerIdNum}?`);
    if (confirm) {
      alert('Функция "Завершить" будет реализована в следующей версии');
    }
  }

  recordCall(call: ActiveCall) {
    console.log('[SupervisorDashboard] Record call:', call.uniqueid);
    // TODO: Implement call recording
    alert('Функция "Записать" будет реализована в следующей версии');
  }
}
