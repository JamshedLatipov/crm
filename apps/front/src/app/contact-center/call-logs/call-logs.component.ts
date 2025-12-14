import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../shared/components/crm-table/crm-table.component';
import { SoftphoneCallHistoryService } from '../../softphone/components/softphone-call-history/softphone-call-history.service';

@Component({
  selector: 'app-call-logs',
  standalone: true,
  imports: [CommonModule, PageLayoutComponent, CrmTableComponent, CrmColumnTemplateDirective, MatButtonModule],
  template: `
    <app-page-layout [title]="'Логи звонков'">
      <div page-actions>
        <button mat-button (click)="reload()">Обновить</button>
      </div>

      <crm-table [columns]="columns" [data]="logs()" [pageSize]="20" [showPaginator]="true" (rowClick)="view($event)">
        <ng-template crmColumnTemplate="createdAt" let-row>
          {{ (row.createdAt ? (row.createdAt | date:'dd.MM.y HH:mm:ss') : '') }}
        </ng-template>
        <ng-template crmColumnTemplate="asteriskUniqueId" let-row>
          <span title="{{ row.asteriskUniqueId }}">{{ row.asteriskUniqueId || '-' }}</span>
        </ng-template>
        <ng-template crmColumnTemplate="scriptBranch" let-row>
          <span>{{ row.scriptBranch || '-' }}</span>
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
  styles: [`.call-logs-page { padding: 1rem }`]
})
export class CallLogsComponent implements OnInit {
  private svc = inject(SoftphoneCallHistoryService);
  logs = signal<any[]>([]);

  columns: CrmColumn[] = [
    { key: 'createdAt', label: 'Время' },
    { key: 'clientCallId', label: 'Клиентский ID' },
    { key: 'callId', label: 'ID звонка' },
    { key: 'sipCallId', label: 'SIP Call-ID' },
    { key: 'asteriskUniqueId', label: 'Asterisk UniqueID' },
    { key: 'scriptBranch', label: 'Скрипт' },
    { key: 'note', label: 'Заметка', width: '40%' },
    { key: 'status', label: 'Статус' },
  ];

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.svc.listCallLogs(200, 0).subscribe({ next: (res) => {
      const arr = Array.isArray(res) ? res : (res?.length ? res : []);
      this.logs.set(arr as any[]);
    }, error: () => { this.logs.set([]); } });
  }

  view(row: any) {
    console.log('View call log', row);
  }
}
