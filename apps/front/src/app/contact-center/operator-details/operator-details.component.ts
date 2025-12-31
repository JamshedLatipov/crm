import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, tap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import {
  ContactCenterMonitoringService,
  OperatorStatus,
} from '../services/contact-center-monitoring.service';
import { CrmTableComponent, CrmColumnTemplateDirective } from '../../shared/components/crm-table/crm-table.component';
import type { CrmColumn } from '../../shared/components/crm-table/crm-table.component';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { environment } from '@crm/front/environments/environment';

Chart.register(...registerables);

interface CallHistory {
  id: string;
  timestamp: Date;
  callerIdNum: string;
  callerIdName: string;
  duration: number;
  waitTime: number;
  queue: string;
  disposition: 'answered' | 'missed' | 'abandoned';
  recordingUrl?: string;
}

interface StatusHistory {
  timestamp: Date;
  status: string;
  duration: number;
  reason?: string;
}

interface OperatorStats {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  avgWaitTime: number;
  totalTalkTime: number;
  avgHandleTime: number;
  firstCallResolution: number;
  satisfaction: number;
}

@Component({
  selector: 'app-operator-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatDialogModule,
    BaseChartDirective,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    PageLayoutComponent,
  ],
  templateUrl: './operator-details.component.html',
  styleUrls: ['./operator-details.component.scss'],
})
export class OperatorDetailsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private monitoringSvc = inject(ContactCenterMonitoringService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  operatorId = signal<string | null>(null);
  operator = signal<OperatorStatus | null>(null);
  loading = signal<boolean>(true);
  
  // Mock data (в реальности будут API запросы)
  callHistory = signal<CallHistory[]>([]);
  statusHistory = signal<StatusHistory[]>([]);
  stats = signal<OperatorStats>({
    totalCalls: 0,
    answeredCalls: 0,
    missedCalls: 0,
    avgDuration: 0,
    avgWaitTime: 0,
    totalTalkTime: 0,
    avgHandleTime: 0,
    firstCallResolution: 0,
    satisfaction: 0,
  });

  // Time range filter
  selectedRange = signal<'today' | 'week' | 'month' | 'custom'>('today');
  
  // Custom date range
  startDate = new FormControl<Date | null>(null);
  endDate = new FormControl<Date | null>(null);
  maxDate = new Date(); // Today

  // Computed values
  answeredRate = computed(() => {
    const s = this.stats();
    if (s.totalCalls === 0) return 0;
    return Math.round((s.answeredCalls / s.totalCalls) * 100);
  });

  missedRate = computed(() => {
    const s = this.stats();
    if (s.totalCalls === 0) return 0;
    return Math.round((s.missedCalls / s.totalCalls) * 100);
  });

  // Charts
  callsChartData: ChartData<'bar'> = {
    labels: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
    datasets: [
      {
        label: 'Обработано',
        data: [45, 52, 48, 55, 50, 30, 25],
        backgroundColor: '#10b981',
      },
      {
        label: 'Пропущено',
        data: [3, 5, 2, 4, 3, 1, 2],
        backgroundColor: '#ef4444',
      },
    ],
  };

  callsChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  statusChartData: ChartData<'doughnut'> = {
    labels: ['На звонке', 'Доступен', 'Завершение', 'Перерыв'],
    datasets: [
      {
        data: [45, 30, 15, 10],
        backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#6b7280'],
      },
    ],
  };

  statusChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
    },
  };

  // Table columns
  callHistoryColumns: CrmColumn[] = [
    {
      key: 'timestamp',
      label: 'Время',
      width: '15%',
      template: 'timestampTemplate',
    },
    {
      key: 'callerIdNum',
      label: 'Номер',
      width: '15%',
      template: 'callerTemplate',
    },
    {
      key: 'queue',
      label: 'Очередь',
      width: '15%',
    },
    {
      key: 'waitTime',
      label: 'Ожидание',
      width: '10%',
      template: 'durationTemplate',
    },
    {
      key: 'duration',
      label: 'Длительность',
      width: '10%',
      template: 'durationTemplate',
    },
    {
      key: 'disposition',
      label: 'Результат',
      width: '15%',
      template: 'dispositionTemplate',
    },
    {
      key: 'actions',
      label: 'Действия',
      width: '20%',
      template: 'actionsTemplate',
    },
  ];

  statusHistoryColumns: CrmColumn[] = [
    {
      key: 'timestamp',
      label: 'Время',
      width: '15%',
      template: 'timestampTemplate',
    },
    {
      key: 'previousStatus',
      label: 'Из статуса',
      width: '20%',
      template: 'statusTemplate',
    },
    {
      key: 'status',
      label: 'В статус',
      width: '20%',
      template: 'statusTemplate',
    },
    {
      key: 'duration',
      label: 'Длительность',
      width: '15%',
      template: 'durationTemplate',
    },
    {
      key: 'reason',
      label: 'Причина',
      width: '30%',
    },
  ];

  ngOnInit() {
    // Load initial data
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        tap((params) => {
          const id = decodeURIComponent(params['id']);
          this.operatorId.set(id);
          this.loadOperatorData(id);
        })
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOperatorData(operatorId: string) {
    this.loading.set(true);

    const range = this.selectedRange();
    const startDate = range === 'custom' ? this.startDate.value : undefined;
    const endDate = range === 'custom' ? this.endDate.value : undefined;

    this.monitoringSvc
      .getOperatorDetails(operatorId, range, startDate || undefined, endDate || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('[OperatorDetails] Loaded data:', data);
          
          // Set operator info
          this.operator.set({
            id: data.operator.id,
            name: data.operator.name,
            fullName: data.operator.fullName,
            extension: data.operator.extension,
            status: data.operator.status as any,
            currentCall: data.operator.currentCall?.callerIdNum,
            currentCallDuration: data.operator.currentCall?.duration,
          });

          // Set stats
          this.stats.set(data.stats);

          // Set call history
          this.callHistory.set(data.callHistory);

          // Set status history and calculate durations
          const statusHist = data.statusHistory.map((s: any, idx: number, arr: any[]) => {
            const nextStatus = arr[idx + 1];
            const duration = nextStatus
              ? Math.floor((new Date(s.timestamp).getTime() - new Date(nextStatus.timestamp).getTime()) / 1000)
              : 0;

            return {
              ...s,
              timestamp: new Date(s.timestamp),
              duration,
            };
          });
          this.statusHistory.set(statusHist);

          // Update charts
          this.updateCharts(data.callHistory, statusHist);

          this.loading.set(false);
        },
        error: (err) => {
          console.error('[OperatorDetails] Failed to load operator:', err);
          this.loading.set(false);
        },
      });
  }

  private updateCharts(callHistory: any[], statusHistory: any[]) {
    // Update calls chart - group by date
    const callsByDate = new Map<string, { answered: number; missed: number }>();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => callsByDate.set(date, { answered: 0, missed: 0 }));

    callHistory.forEach(call => {
      const date = new Date(call.timestamp).toISOString().split('T')[0];
      const bucket = callsByDate.get(date);
      if (bucket) {
        if (call.disposition === 'answered') {
          bucket.answered++;
        } else if (call.disposition === 'missed') {
          bucket.missed++;
        }
      }
    });

    const labels = last7Days.map(d => {
      const date = new Date(d);
      return `${date.getDate()}.${date.getMonth() + 1}`;
    });

    const answeredData = last7Days.map(d => callsByDate.get(d)?.answered || 0);
    const missedData = last7Days.map(d => callsByDate.get(d)?.missed || 0);

    this.callsChartData = {
      labels,
      datasets: [
        {
          label: 'Принято',
          data: answeredData,
          backgroundColor: '#10b981',
        },
        {
          label: 'Пропущено',
          data: missedData,
          backgroundColor: '#ef4444',
        },
      ],
    };

    // Update status distribution chart
    const statusCounts = new Map<string, number>();
    statusHistory.forEach(s => {
      statusCounts.set(s.status, (statusCounts.get(s.status) || 0) + 1);
    });

    const statusLabels = Array.from(statusCounts.keys());
    const statusData = Array.from(statusCounts.values());
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#6b7280'];

    this.statusChartData = {
      labels: statusLabels.map(s => this.getStatusLabel(s)),
      datasets: [
        {
          data: statusData,
          backgroundColor: colors.slice(0, statusLabels.length),
        },
      ],
    };
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'idle': 'Готов',
      'on_call': 'На звонке',
      'wrap_up': 'После звонка',
      'offline': 'Не в сети',
      'break': 'Перерыв',
      'lunch': 'Обед',
    };
    return labels[status] || status;
  }

  // Actions
  goBack() {
    this.router.navigate(['/contact-center/supervisor']);
  }

  changeRange(range: 'today' | 'week' | 'month' | 'custom') {
    this.selectedRange.set(range);
    
    // Reset custom dates for predefined ranges
    if (range !== 'custom') {
      this.startDate.setValue(null);
      this.endDate.setValue(null);
    }
    
    const id = this.operatorId();
    if (id) {
      this.loadOperatorData(id);
    }
  }
  
  applyCustomDateRange() {
    const start = this.startDate.value;
    const end = this.endDate.value;
    
    if (!start || !end) {
      alert('Пожалуйста, выберите начальную и конечную дату');
      return;
    }
    
    if (start > end) {
      alert('Начальная дата не может быть позже конечной');
      return;
    }
    
    this.selectedRange.set('custom');
    const id = this.operatorId();
    if (id) {
      this.loadOperatorData(id);
    }
  }

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

  formatTimestamp(date: Date): string {
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      idle: 'Доступен',
      on_call: 'На звонке',
      wrap_up: 'Завершение',
      offline: 'Оффлайн',
      break: 'Перерыв',
      lunch: 'Обед',
      meeting: 'Встреча',
      training: 'Обучение',
      away: 'Отошел',
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getDispositionClass(disposition: string): string {
    return `disposition-${disposition}`;
  }

  formatDisposition(disposition: string): string {
    const map: Record<string, string> = {
      answered: 'Обработан',
      missed: 'Пропущен',
      abandoned: 'Сброшен',
    };
    return map[disposition] || disposition;
  }

  listenCall(call: CallHistory) {
    console.log('[OperatorDetails] Listen call:', call.id, call.recordingUrl);
    
    if (!call.recordingUrl) {
      alert('Запись звонка недоступна');
      return;
    }

    this.dialog.open(AudioPlayerDialog, {
      width: '500px',
      data: {
        url: call.recordingUrl,
        callerIdNum: call.callerIdNum,
        callerIdName: call.callerIdName,
        timestamp: call.timestamp,
      }
    });
  }

  viewCallDetails(call: CallHistory) {
    console.log('[OperatorDetails] View call details:', call.id);
    // TODO: Navigate to call details
  }

  exportData() {
    console.log('[OperatorDetails] Export data');
    alert('Экспорт данных будет реализован в следующей версии');
  }
}

// Audio Player Dialog Component
@Component({
  selector: 'audio-player-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>headphones</mat-icon>
      Запись звонка
    </h2>
    <mat-dialog-content>
      <div class="call-info">
        <p><strong>Звонящий:</strong> {{ data.callerIdNum }}</p>
        @if (data.callerIdName) {
          <p><strong>Имя:</strong> {{ data.callerIdName }}</p>
        }
        <p><strong>Время:</strong> {{ formatTimestamp(data.timestamp) }}</p>
        <p><strong>URL:</strong> <code>{{ data.url }}</code></p>
      </div>
      
      @if (loading()) {
        <div class="loading">
          <mat-icon>hourglass_empty</mat-icon>
          <p>Загрузка записи...</p>
        </div>
      } @else if (error()) {
        <div class="error">
          <mat-icon>error</mat-icon>
          <p>{{ error() }}</p>
        </div>
      }
      
      <!-- Always render audio element, control visibility via CSS -->
      <audio 
        #audioEl
        controls 
        [src]="env.apiBase + data.url" 
        class="audio-player"
        [style.display]="loading() || error() ? 'none' : 'block'"
        (error)="onError($event)" 
        (loadstart)="onLoadStart()" 
        (loadeddata)="onLoadedData()"
        (canplay)="onCanPlay()"
        preload="auto"
      >
        Ваш браузер не поддерживает аудио плеер.
      </audio>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Закрыть</button>
      @if (!error() && !loading()) {
        <a mat-raised-button color="primary" [href]="data.url" download>
          <mat-icon>download</mat-icon>
          Скачать
        </a>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .call-info {
      margin-bottom: 20px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      
      p {
        margin: 8px 0;
        font-size: 14px;
        
        strong {
          color: #666;
        }
      }
      
      code {
        font-size: 12px;
        background: white;
        padding: 2px 6px;
        border-radius: 4px;
        word-break: break-all;
      }
    }
    
    .audio-player {
      width: 100%;
      margin: 20px 0;
    }
    
    .loading, .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      color: #666;
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }
      
      p {
        margin: 0;
      }
    }
    
    .error {
      color: #ef4444;
    }
    
    mat-dialog-content {
      min-height: 200px;
    }
    
    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      
      mat-icon {
        color: #3b82f6;
      }
    }
  `]
})
export class AudioPlayerDialog {
  data = inject<any>(MAT_DIALOG_DATA);
  loading = signal(true);
  error = signal<string | null>(null);
  env = environment;

  constructor() {
    console.log('[AudioPlayerDialog] Initialized with data:', this.data);
    console.log('[AudioPlayerDialog] Audio URL:', this.data.url);
  }

  formatTimestamp(date: Date): string {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onLoadStart() {
    console.log('[AudioPlayerDialog] Audio load started');
    this.loading.set(true);
    this.error.set(null);
  }

  onLoadedData() {
    console.log('[AudioPlayerDialog] Audio data loaded');
  }

  onCanPlay() {
    console.log('[AudioPlayerDialog] Audio can play');
    this.loading.set(false);
  }

  onError(event: any) {
    console.error('[AudioPlayerDialog] Audio error:', event);
    console.error('[AudioPlayerDialog] Error details:', event.target?.error);
    this.loading.set(false);
    this.error.set('Не удалось загрузить запись. Возможно, файл не существует или был удален.');
  }
}

