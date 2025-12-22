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
import { SoftphoneCallHistoryService } from '../../softphone/services/softphone-call-history.service';
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
    MatIconModule,
    MatDividerModule,
    MatCardModule,
    MatTooltipModule,
  ],
  templateUrl: './call-logs.component.html',
  styleUrl: './call-logs.component.scss',
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
      const rec = await firstValueFrom(this.svc.getById(null, uniqueId));
    
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
      const rec = await firstValueFrom(this.svc.getById(null, row.asteriskUniqueId));
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
      } catch (e) {}
    }
  }
}