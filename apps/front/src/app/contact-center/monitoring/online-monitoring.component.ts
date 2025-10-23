import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactCenterMonitoringService, OperatorStatus, QueueStatus } from './contact-center-monitoring.service';
import { NgForOf } from '@angular/common';

@Component({
  selector: 'app-online-monitoring',
  standalone: true,
  imports: [CommonModule, NgForOf],
  template: `
    <div style="padding:24px">
      <h2>Онлайн мониторинг</h2>
      <p>Здесь отображается состояние операторов и очередей в реальном времени.</p>

      <section style="margin-top:18px">
        <h3>Операторы</h3>
        <div class="operators-grid">
          <div *ngFor="let op of operators$ | async" class="operator-card">
            <div class="op-row">
              <div class="op-name">{{ op.name }}</div>
              <div class="op-status">{{ op.status }}</div>
            </div>
            <div class="op-meta">
              <span>Текущий звонок: {{ op.currentCall || '—' }}</span>
              <span>Среднее AHT: {{ op.avgHandleTime || '—' }}s</span>
            </div>
          </div>
        </div>
      </section>

      <section style="margin-top:18px">
        <h3>Очереди</h3>
        <div class="queues-grid">
          <div *ngFor="let q of queues$ | async" class="queue-card">
            <div class="queue-row">
              <div class="queue-name">{{ q.name }}</div>
              <div class="queue-stats">waiting: {{ q.waiting }} / in service: {{ q.callsInService }}</div>
            </div>
            <div class="queue-meta">Longest wait: {{ q.longestWaitingSeconds }}s</div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .operators-grid { display:flex; gap:12px; flex-wrap:wrap }
      .operator-card { width:220px; padding:12px; border-radius:8px; border:1px solid rgba(2,6,23,0.06); background:#fff }
      .op-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px }
      .op-name { font-weight:600 }
      .op-status { font-size:13px; color:#64748b }
      .op-meta { display:flex; justify-content:space-between; font-size:12px; color:#6b7280 }

      .queues-grid { display:flex; gap:12px; flex-wrap:wrap }
      .queue-card { width:320px; padding:12px; border-radius:8px; border:1px solid rgba(2,6,23,0.06); background:#fff }
      .queue-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px }
      .queue-name { font-weight:600 }
      .queue-stats { font-size:13px; color:#64748b }
      .queue-meta { font-size:12px; color:#6b7280 }
    `,
  ],
})
export class OnlineMonitoringComponent {
  private svc = inject(ContactCenterMonitoringService);

  // Observables the template can async-pipe
  operators$ = this.svc.getOperators();
  queues$ = this.svc.getQueues();
}
