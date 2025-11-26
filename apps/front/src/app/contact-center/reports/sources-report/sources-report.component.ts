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
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn } from '../../../shared/components/crm-table/crm-table.component';

interface SourceRow {
  key: string; // src or dst
  calls: number;
  answered: number;
  answerRate: number; // 0..1
  avgDuration: number; // seconds
}

@Component({
  selector: 'app-sources-report',
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
  templateUrl: './sources-report.component.html',
  styleUrls: ['./sources-report.component.scss']
})
export class SourcesReportComponent implements OnInit {
  private svc = inject(CallsService);

  loading = signal(false);
  rows = signal<SourceRow[]>([]);
  filter = signal('');

  // Columns used by CrmTableComponent
  columns: CrmColumn[] = [
    { key: 'key', label: 'Номер' },
    { key: 'calls', label: 'Звонков', cell: (r: any) => String(r.calls) },
    { key: 'answered', label: 'Отвечено', cell: (r: any) => String(r.answered) },
    { key: 'answerRate', label: 'Процент ответов', cell: (r: any) => `${((r.answerRate||0)*100).toFixed(1)}%` },
    { key: 'avgDuration', label: 'Средняя дл.', cell: (r: any) => this.formatDuration(r.avgDuration) },
  ];

  ngOnInit(): void {
    this.load();
  }

  formatDuration(sec?: number) {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  load() {
    this.loading.set(true);
    // Fetch a reasonable chunk and aggregate on client-side for MVP
    this.svc.list(1, 2000, {}).subscribe({
      next: (res) => {
        const rowsMap: Record<string, { calls: number; answered: number; totalDuration: number }> = {};
        (res.data || []).forEach((it: any) => {
          const key = (it.dst || it.src || 'unknown').toString();
          if (!rowsMap[key]) rowsMap[key] = { calls: 0, answered: 0, totalDuration: 0 };
          rowsMap[key].calls += 1;
          if ((it.disposition || '').toString().toUpperCase() === 'ANSWERED' || (it.disposition || '').toString().toUpperCase() === 'OK') rowsMap[key].answered += 1;
          rowsMap[key].totalDuration += Number(it.duration) || 0;
        });

        const rows: SourceRow[] = Object.keys(rowsMap).map(k => ({
          key: k,
          calls: rowsMap[k].calls,
          answered: rowsMap[k].answered,
          answerRate: rowsMap[k].answered / rowsMap[k].calls,
          avgDuration: Math.round((rowsMap[k].totalDuration || 0) / (rowsMap[k].calls || 1))
        }));

        rows.sort((a,b) => b.calls - a.calls);
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load CDR for sources report', err);
        this.rows.set([]);
        this.loading.set(false);
      }
    });
  }

  get filtered() {
    const q = (this.filter() || '').toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter(r => r.key.toLowerCase().includes(q));
  }
}
