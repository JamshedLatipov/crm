import { Component, signal, inject, OnInit } from '@angular/core';
import { UsersService } from '../../users/users.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { CallsService, CdrItem } from '../services/calls.service';
import { ContactCenterMonitoringService, OperatorStatus } from '../services/contact-center-monitoring.service';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../shared/components/crm-table/crm-table.component';

@Component({
  selector: 'app-contact-center-calls',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PageLayoutComponent,
  CrmTableComponent,
  CrmColumnTemplateDirective,
  ],
  templateUrl: './calls-list.component.html',
  styleUrls: ['./calls-list.component.scss'],
})
export class ContactCenterCallsComponent implements OnInit {
  private svc = inject(CallsService);
  private opSvc = inject(ContactCenterMonitoringService);
  private usersSvc = inject(UsersService);

  // operator id -> name map
  operatorMap = signal<Record<string, string>>({});

  columns: CrmColumn[] = [
    {
      key: 'calldate',
      label: 'Время',
      cell: (r: any) => {
        try {
          const d = new Date(r.calldate);
          return d.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch {
          return r.calldate || '';
        }
      }
    },
    { key: 'src', label: 'От', cell: (r: any) => {
        const map = this.operatorMap();
        return (r.src && map[r.src]) ? map[r.src] : r.src;
      }
    },
    { key: 'dst', label: 'Кому', cell: (r: any) => {
        const map = this.operatorMap();
        return (r.dst && map[r.dst]) ? map[r.dst] : r.dst;
      }
    },
  { key: 'operator', label: 'Оператор', cell: (r: any) => r.operatorName || r.user || '' },
  { key: 'disposition', label: 'Статус', template: 'statusTemplate' },
    { key: 'duration', label: 'Длительность', cell: (r: any) => {
        const sec = Number(r.duration) || 0;
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
      }
    },
    { key: 'actions', label: '', template: 'actionsTemplate' }
  ];
  data = signal<CdrItem[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(20);
  loading = signal(false);
  srcFilter = signal('');
  dstFilter = signal('');
  dispositionFilter = signal('');

  get tableData() {
    return this.data();
  }



  dispositionInfo(d?: string) {
    const disp = (d || '').toString().toUpperCase();
    switch (disp) {
      case 'ANSWERED':
      case 'OK':
        return { text: 'Отвечен', icon: 'call_received', cls: 'status-chip answered' };
      case 'NO ANSWER':
      case 'NOANSWER':
      case 'NO-ANSWER':
        return { text: 'Без ответа', icon: 'call_missed', cls: 'status-chip no-answer' };
      case 'BUSY':
        return { text: 'Занят', icon: 'pause_circle_filled', cls: 'status-chip busy' };
      case 'FAILED':
      case 'CONGESTION':
      case 'CHANUNAVAIL':
        return { text: 'Ошибка', icon: 'error', cls: 'status-chip failed' };
      case 'VOICEMAIL':
        return { text: 'Голосовая почта', icon: 'voicemail', cls: 'status-chip voicemail' };
      default:
        return { text: disp || 'Неизвестно', icon: 'help_outline', cls: 'status-chip unknown' };
    }
  }

  ngOnInit() {
    // Load operators snapshot first to map operator ids to names
    this.opSvc.fetchOperatorsSnapshot().subscribe({
      next: (ops: OperatorStatus[]) => {
        const map: Record<string, string> = {};
        ops.forEach(o => { if (o && o.id) map[o.id] = o.name; });
        this.operatorMap.set(map);
      },
      error: () => {
        // ignore
      }
    });

    // Also fetch users via UsersService to map sip_endpoint_id -> fullName (show operator names for src/dst)
    this.usersSvc.getAllUsers().subscribe({
      next: (users) => {
        const map = { ...this.operatorMap() };
        (users || []).forEach(u => {
          const sip = u?.sipEndpointId || u?.sip_endpoint_id || u?.sipEndpoint || u?.sipEndpointId;
          const name = u?.firstName || u?.fullName || (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : u?.username) || u?.username;
          if (sip) map[sip] = name;
        });
        this.operatorMap.set(map);
        this.load();
      },
      error: () => {
        // fallback: load calls anyway
        this.load();
      }
    });
  }

  load(p = this.page(), l = this.limit()) {
    this.loading.set(true);
    this.svc.list(p, l, { src: this.srcFilter(), dst: this.dstFilter(), disposition: this.dispositionFilter() }).subscribe({
      next: (res) => {
        const map = this.operatorMap();
        const prepared = (res.data || []).map((it: any) => ({ ...it, operatorName: (it.user && map[it.user]) ? map[it.user] : it.user }));
        this.data.set(prepared);
        this.total.set(res.total || (res.data || []).length);
        this.page.set(res.page || p);
        this.limit.set(res.limit || l);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load calls', err);
        this.data.set([]);
        this.total.set(0);
        this.loading.set(false);
      }
    });
  }

  onPageChange(event: any) {
    const newPage = (event.pageIndex ?? 0) + 1;
    const newLimit = event.pageSize ?? this.limit();
    this.load(newPage, newLimit);
  }

  formatDuration(sec?: number) {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  view(item: CdrItem) {
    // For now just log; can route to details modal
    console.log('view call', item);
  }
}
