import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import {
  CrmTableComponent,
  CrmColumn,
  CrmColumnTemplateDirective,
} from '../../shared/components/crm-table/crm-table.component';
import { SoftphoneCallHistoryService } from '../../softphone/components/softphone-call-history/softphone-call-history.service';
import { CallScriptsService } from '../../shared/services/call-scripts.service';
import { firstValueFrom } from 'rxjs';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'app-call-logs',
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatCardModule,
    MatTooltipModule,
    MatSliderModule,
  ],
  template: `
    <app-page-layout [title]="'Логи звонков'">
      <div page-actions>
        <button mat-button (click)="reload()">Обновить</button>
      </div>

      <crm-table
        [columns]="columns"
        [data]="logs()"
        [pageSize]="20"
        [showPaginator]="true"
        (rowClick)="view($event)"
      >
        <ng-template crmColumnTemplate="createdAt" let-row>
          {{ row.createdAt ? (row.createdAt | date : 'dd.MM.y HH:mm:ss') : '' }}
        </ng-template>
        <ng-template crmColumnTemplate="asteriskUniqueId" let-row>
          <a
            class="unique-id-link"
            (click)="openDetail(row.asteriskUniqueId)"
            >{{ row.asteriskUniqueId || '-' }}</a
          >
        </ng-template>
        <ng-template crmColumnTemplate="createdBy" let-row>
          <span>{{ row.createdBy || '-' }}</span>
        </ng-template>
        <ng-template crmColumnTemplate="scriptTitle" let-row>
          <span>{{ row.scriptTitle }}</span>
        </ng-template>
        <ng-template crmColumnTemplate="note" let-row>
          <span [title]="row.note">{{ row.note || '-' }}</span>
        </ng-template>
        <ng-template crmColumnTemplate="status" let-row>
          <span>{{ row.status }}</span>
        </ng-template>
      </crm-table>
      <div *ngIf="showDetailSidebar()" class="right-detail-panel">
          <mat-card *ngIf="detailRecord(); else noDetail">
            <mat-card-header class="card-header">
              <mat-card-title>Детали CDR</mat-card-title>
              <div class="actions">
                <button mat-icon-button matTooltip="Копировать UniqueID" (click)="copyUniqueId(detailRecord().uniqueid)">
                  <mat-icon>content_copy</mat-icon>
                </button>
                <button mat-icon-button (click)="closeDetail()" matTooltip="Закрыть">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </mat-card-header>
            <mat-divider></mat-divider>
            <mat-card-content>
              <div class="field"><strong>Дата/время:</strong> {{ detailRecord().calldate | date:'dd.MM.y HH:mm:ss' }}</div>
              <mat-divider></mat-divider>
              <div class="field"><strong>Источник:</strong> {{ detailRecord().src || '-' }}</div>
              <div class="field"><strong>Назначение:</strong> {{ detailRecord().dst || '-' }}</div>
              <mat-divider></mat-divider>
              <div class="field"><strong>Длительность:</strong> {{ detailRecord().duration ? detailRecord().duration + ' s' : '-' }}</div>
              <div class="field"><strong>Диспозиция:</strong> {{ detailRecord().disposition || '-' }}</div>
              <mat-divider></mat-divider>
              <div class="field"><strong>Канал:</strong> {{ detailRecord().channel || '-' }}</div>
              <div class="field"><strong>Dst Channel:</strong> {{ detailRecord().dstchannel || '-' }}</div>
              <mat-divider></mat-divider>
              <div class="field"><strong>Контекст:</strong> {{ detailRecord().dcontext || '-' }}</div>
              <div class="field"><strong>Уникальный ID:</strong> <code class="unique-id">{{ detailRecord().uniqueid || '-' }}</code></div>
              <mat-divider></mat-divider>
              <div class="field"><strong>Заметки:</strong> {{ detailRecord().userfield || '-' }}</div>
              <mat-divider></mat-divider>
              <div class="meta">
                <div><strong>Создал (ID):</strong> {{ detailRecord().user_id || detailRecord().user || '-' }}</div>
                <div><strong>Скрипт:</strong> {{ detailRecord().scriptTitle || '-' }}</div>
              </div>
            </mat-card-content>
          </mat-card>
          <ng-template #noDetail>
            <div class="no-detail">Детали не найдены</div>
          </ng-template>
      </div>
    </app-page-layout>
  `,
  styles: [
    `
      .call-logs-page {
        padding: 1rem;
      }
      .unique-id-link {
        cursor: pointer;
        color: var(--crm-text-link, #145ea8);
        text-decoration: none;
        border-bottom: 1px dotted rgba(0,0,0,0.06);
      }
      /* Right side detail panel — neutral site tokens */
      .right-detail-panel {
        position: fixed;
        right: 0;
        top: 0;
        width: min(420px, 36%);
        max-width: 480px;
        height: 100vh;
        background: var(--crm-surface, #ffffff);
        box-shadow: 0 6px 18px rgba(12,16,20,0.06);
        z-index: 1200;
        padding: 1rem;
        overflow: auto;
        transform: translateX(100%);
        animation: slideIn 220ms ease-out forwards;
        border-left: 1px solid rgba(0,0,0,0.04);
        display: flex;
        flex-direction: column;
      }
      .right-detail-panel mat-card {
        border-radius: 6px;
        box-shadow: none;
        background: transparent;
      }
      .card-header { padding: 0; display: flex; align-items: center; justify-content: space-between }
      .card-header .actions { display:flex; gap:6px; align-items:center }
      .unique-id { background: var(--crm-code-bg,#f5f6f8); padding: 2px 6px; border-radius: 3px; font-family: monospace }
      .no-detail { padding: 1rem; color: rgba(0,0,0,0.55) }

      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `,
  ],
})
export class CallLogsComponent implements OnInit {
  private svc = inject(SoftphoneCallHistoryService);
  private scriptsSvc = inject(CallScriptsService);
  logs = signal<any[]>([]);

  columns: CrmColumn[] = [
    { key: 'createdAt', label: 'Время' },
    { key: 'clientCallId', label: 'Клиентский ID' },
    { key: 'callId', label: 'ID звонка' },
    { key: 'sipCallId', label: 'SIP Call-ID' },
    { key: 'asteriskUniqueId', label: 'Общий уникальный ID' },
    { key: 'createdBy', label: 'Создал (ID)' },
    { key: 'scriptTitle', label: 'Скрипт' },
    { key: 'note', label: 'Заметка', width: '40%' },
    { key: 'status', label: 'Статус' },
  ];

  ngOnInit(): void {
    this.reload();
  }
  reload() {
    this.svc.listCallLogs(200, 0).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : res?.length ? res : [];
        this.logs.set(arr as any[]);
      },
      error: () => {
        this.logs.set([]);
      },
    });
  }

  // Sidebar state for CDR details
  showDetailSidebar = signal(false);
  detailRecord = signal<any | null>(null);

  async openDetail(uniqueId: string | null) {
    if (!uniqueId) return;
    this.showDetailSidebar.set(true);
    try {
      const rec = await this.svc.getById(uniqueId);
    
      this.detailRecord.set(rec || null);
    } catch (e) {
      this.detailRecord.set(null);
    }
  }

  closeDetail() {
    this.showDetailSidebar.set(false);
    this.detailRecord.set(null);
  }

  async view(row: any) {
    if (!row.asteriskUniqueId) return;

    this.showDetailSidebar.set(true);
    try {
      const rec = await this.svc.getById(row.asteriskUniqueId);
      this.detailRecord.set(rec || null);
    } catch (e) {
      this.detailRecord.set(null);
    }
  }

  copyUniqueId(val: string | null) {
    if (!val) return;
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).catch(() => {});
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = val;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {
        // Fallback copy failed, clipboard API not available
      }
    }
  }
}
