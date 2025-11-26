import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn } from '../../../shared/components/crm-table/crm-table.component';
import { RouterModule } from '@angular/router';
import { get, find } from 'lodash-es';
import { CallsService } from '../../services/calls.service';
import { UsersService, User } from '../../../users/users.service';

interface OpRow {
  id: string;
  userId?: string | number;
  name: string;
  calls: number;
  answered: number;
  answerRate: number;
  avgDuration: number;
}

@Component({
  selector: 'app-operators-report',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatFormFieldModule, MatInputModule, PageLayoutComponent, CrmTableComponent, RouterModule],
  templateUrl: './operators-report.component.html',
  styleUrls: ['./operators-report.component.scss']
})
export class OperatorsReportComponent implements OnInit {
  private svc = inject(CallsService);
  private usersSvc = inject(UsersService);

  loading = signal(false);
  rows = signal<OpRow[]>([]);
  filter = signal('');

  columns: CrmColumn[] = [
    { key: 'name', label: 'Оператор' },
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
    // load users first to map operator ids to names
    const firstDefined = (obj: any, keys: string[]) => {
      return (find(keys.map(k => get(obj, k)), v => v !== undefined && v !== null && v !== '') as any) ?? '';
    };

    this.usersSvc.getAllUsers().subscribe({
      next: (users: User[]) => {
        const nameMap: Record<string,string> = {};
        const userIdMap: Record<string,string|number> = {};

        (users || []).forEach(u => {
          const key = String(firstDefined(u, ['sipEndpointId', 'sip_endpoint_id', 'sipEndpoint', 'username', 'id']));
          const nameVal = firstDefined(u, ['fullName']) || (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : firstDefined(u, ['name', 'username']));
          const name = String(nameVal || key);
          if (key) {
            nameMap[key] = name;
            userIdMap[key] = u.id as any;
          }
        });

        this.svc.list(1, 2000, {}).subscribe({
          next: (res) => {
            const map: Record<string, { calls:number; answered:number; totalDur:number }> = {};
            const pickIt = (obj: any, keys: string[]) => firstDefined(obj, keys);

            (res.data || []).forEach((it: any) => {
              const op = String(pickIt(it, ['accountcode', 'user', 'operator'])) || 'unassigned';
              const entry = map[op] ??= { calls: 0, answered: 0, totalDur: 0 };
              entry.calls += 1;
              const disp = String(it.disposition || '').toUpperCase();
              if (disp === 'ANSWERED' || disp === 'OK') entry.answered += 1;
              entry.totalDur += Number(it.duration) || 0;
            });

            const rows: OpRow[] = Object.keys(map).map(k => ({
              id: k,
              userId: userIdMap[k],
              name: nameMap[k] || k,
              calls: map[k].calls,
              answered: map[k].answered,
              answerRate: map[k].answered / map[k].calls,
              avgDuration: Math.round((map[k].totalDur || 0) / (map[k].calls || 1))
            }));

            rows.sort((a,b) => b.calls - a.calls);
            this.rows.set(rows);
            this.loading.set(false);
          },
          error: (err) => { console.error('failed cdr', err); this.rows.set([]); this.loading.set(false); }
        });
      },
      error: () => {
        // fallback: still try to load cdr and show operator ids
        this.svc.list(1,2000,{}).subscribe({ next: (res) => {
          const map: Record<string, { calls:number; answered:number; totalDur:number }> = {};
          const pickIt = (obj: any, keys: string[]) => firstDefined(obj, keys);

          (res.data || []).forEach((it:any)=>{
            const op = String(pickIt(it, ['accountcode','user','operator'])) || 'unassigned';
            const entry = map[op] ??= { calls:0, answered:0, totalDur:0 };
            entry.calls += 1;
            const disp = String(it.disposition || '').toUpperCase();
            if (disp === 'ANSWERED' || disp === 'OK') entry.answered += 1;
            entry.totalDur += Number(it.duration) || 0;
          });

          const rows: OpRow[] = Object.keys(map).map(k=>({ id:k, name:k, calls:map[k].calls, answered:map[k].answered, answerRate: map[k].answered/map[k].calls, avgDuration: Math.round((map[k].totalDur||0)/(map[k].calls||1)) }));
          rows.sort((a,b)=>b.calls-a.calls); this.rows.set(rows); this.loading.set(false);
        }, error: (e)=>{ console.error(e); this.rows.set([]); this.loading.set(false); } });
      }
    });
  }

  get filtered() {
    const q = (this.filter() || '').toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter(r => r.name.toLowerCase().includes(q));
  }
}
