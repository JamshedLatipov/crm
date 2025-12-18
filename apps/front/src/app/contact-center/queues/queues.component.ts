import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { concat, shareReplay } from 'rxjs';
import { QueuesService, QueueRecord } from '../services/queues.service';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import {
  CrmTableComponent,
  CrmColumn,
  CrmColumnTemplateDirective,
} from '../../shared/components/crm-table/crm-table.component';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { format } from 'date-fns';
import { formatDurationHuman } from '../../shared/utils/date.util';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { QueueFormDialogComponent } from './queue-form-dialog.component';
import { QueueMembersDialogComponent } from './queue-members-dialog.component';

@Component({
  selector: 'app-contact-center-queues',
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    QueueFormDialogComponent,
    MatDialogModule,
  ],
  templateUrl: './queues.component.html',
  styleUrls: ['./queues.component.scss'],
})
export class QueuesPageComponent {
  private svc = inject(QueuesService);
  dialog = inject(MatDialog);

  queues$ = this.svc
    .list()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  columns: CrmColumn[] = [
    { key: 'id', label: 'ID', width: '6%' },
    { key: 'name', label: 'Служба', width: '10%' },
    { key: 'description', label: 'Описание', width: '10%' },
    { key: 'context', label: 'Контекст', width: '8%' },
    { key: 'strategy', label: 'Стратегия', width: '8%' },
    { key: 'musicclass', label: 'Music Class', width: '8%' },
    { key: 'maxlen', label: 'Макс. длина', width: '6%' },
    {
      key: 'timeout',
      label: 'Таймаут',
      width: '6%',
      cell: (row: any) => formatDurationHuman(row.timeout),
    },
    {
      key: 'retry',
      label: 'Retry',
      width: '6%',
      cell: (row: any) => formatDurationHuman(row.retry),
    },
    {
      key: 'wrapuptime',
      label: 'Wrap-up',
      width: '6%',
      cell: (row: any) => formatDurationHuman(row.wrapuptime),
    },
    {
      key: 'announce_frequency',
      label: 'Announce',
      width: '6%',
      cell: (row: any) => formatDurationHuman(row.announce_frequency),
    },
    { key: 'joinempty', label: 'Join empty', width: '6%' },
    { key: 'leavewhenempty', label: 'Leave when empty', width: '6%' },
    { key: 'ringinuse', label: 'Ring in use', width: '6%' },
    {
      key: 'actions',
      label: 'Действия',
      width: '10%',
      template: 'actionsTemplate',
    },
  ];

  // using shared formatDurationHuman

  async add() {
    const dialog = this.dialog.open(QueueFormDialogComponent, {
      data: { mode: 'create' },
    });
    const res = await dialog.afterClosed().toPromise();
    if (res?.confirmed && res.value) {
      await this.svc.create(res.value).toPromise();
      this.reload();
    }
  }

  async edit(row: QueueRecord) {
    const dialog = this.dialog.open(QueueFormDialogComponent, {
      data: { mode: 'edit', payload: row },
    });
    const res = await dialog.afterClosed().toPromise();
    if (res?.confirmed && res.value) {
      await this.svc.update(row.id, res.value).toPromise();
      this.reload();
    }
  }

  async removeRow(row: QueueRecord) {
    if (!confirm(`Удалить службу "${row.name}"?`)) return;
    await this.svc.remove(row.id).toPromise();
    this.reload();
  }

  reload() {
    this.queues$ = this.svc
      .list()
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  openMembers(row: QueueRecord) {
    const dialog = this.dialog.open(QueueMembersDialogComponent, {
      data: { queueName: row.name },
    });
    dialog.afterClosed().subscribe(() => this.reload());
  }
}
