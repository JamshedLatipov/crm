import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { CallsService } from '../../services/calls.service';
import { IvrApiService } from '../../../ivr/ivr.service';
import { forkJoin } from 'rxjs';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn } from '../../../shared/components/crm-table/crm-table.component';

interface QueueRow {
  queue: string;
  calls: number;
  answered: number;
  answerRate: number;
  avgDuration: number;
}

@Component({
  selector: 'app-queues-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    PageLayoutComponent,
    CrmTableComponent,
  ],
  templateUrl: './queues-report.component.html',
  styleUrls: ['./queues-report.component.scss']
})
export class QueuesReportComponent implements OnInit {
  private svc = inject(CallsService);
  private ivr = inject(IvrApiService);

  loading = signal(false);
  rows = signal<QueueRow[]>([]);
  filter = signal('');

  columns: CrmColumn[] = [
    { key: 'queue', label: 'Служба (очередь)' },
    { key: 'calls', label: 'Звонков', cell: (r: any) => String(r.calls) },
    { key: 'answered', label: 'Отвечено', cell: (r: any) => String(r.answered) },
    { key: 'answerRate', label: 'Процент ответов', cell: (r: any) => `${((r.answerRate||0)*100).toFixed(1)}%` },
    { key: 'avgDuration', label: 'Средняя дл.', cell: (r: any) => this.formatDuration(r.avgDuration) },
  ];

  ngOnInit(): void {
    this.load();
  }

  private formatDuration(sec?: number) {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  load() {
    this.loading.set(true);
    // load both CDR and queues list, then merge
    forkJoin({ cdr: this.svc.list(1, 2000, {}), queues: this.ivr.queues() }).subscribe({
      next: ({ cdr, queues }) => {
        const map: Record<string, { calls:number; answered:number; totalDur:number }> = {};

        const pickQueue = (it: any) => {
          return (it?.queue || it?.queue_name || it?.dst || it?.dstchannel || it?.context || 'unknown').toString();
        };

        (cdr.data || []).forEach((it: any) => {
          const q = pickQueue(it) || 'unknown';
          const entry = map[q] ??= { calls:0, answered:0, totalDur:0 };
          entry.calls += 1;
          const disp = (it.disposition || '').toString().toUpperCase();
          if (disp === 'ANSWERED' || disp === 'OK') entry.answered += 1;
          entry.totalDur += Number(it.duration) || 0;
        });

        // ensure all queues from API are present (even if zero calls)
        (queues || []).forEach((q: any) => {
          const name = (q?.name ?? q?.id ?? '').toString() || 'unknown';
          if (!map[name]) map[name] = { calls: 0, answered: 0, totalDur: 0 };
        });

        const rows: QueueRow[] = Object.keys(map).map(k => ({
          queue: k,
          calls: map[k].calls,
          answered: map[k].answered,
          answerRate: map[k].calls ? map[k].answered / map[k].calls : 0,
          avgDuration: Math.round((map[k].totalDur || 0)/(map[k].calls || 1))
        }));

        rows.sort((a,b) => b.calls - a.calls);
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err) => { console.error('Failed to load queues report', err); this.rows.set([]); this.loading.set(false); }
    });
  }

  get filtered() {
    const q = (this.filter() || '').toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter(r => r.queue.toLowerCase().includes(q));
  }
}
