import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import {
  CrmTableComponent,
  CrmColumn,
  CrmColumnTemplateDirective,
} from '../../shared/components/crm-table/crm-table.component';
import { SoftphoneCallHistoryService } from '../../softphone/components/softphone-call-history/softphone-call-history.service';
import { CallScriptsService } from '../../shared/services/call-scripts.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-call-logs',
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    MatButtonModule,
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
          <span title="{{ row.asteriskUniqueId }}">{{
            row.asteriskUniqueId || '-'
          }}</span>
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
    </app-page-layout>
  `,
  styles: [
    `
      .call-logs-page {
        padding: 1rem;
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
    this.loadScripts().then(() => this.reload());
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

  private async loadScripts() {
    const list = await firstValueFrom(this.scriptsSvc.getActiveCallScripts());
    this.logs.set(list);
  }

  view(row: any) {
    console.log('View call log', row);
  }
}
