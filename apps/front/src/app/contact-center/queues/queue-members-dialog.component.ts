import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import {
  QueueMembersService,
  QueueMemberRecord,
} from '../services/queue-members.service';
import {
  CrmTableComponent,
  CrmColumn,
} from '../../shared/components/crm-table/crm-table.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-queue-members-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    CrmTableComponent,
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Участники очереди: {{ data.queueName }}</h2>
    <mat-dialog-content>
      <div style="margin-bottom:8px">
        <button mat-stroked-button color="primary" (click)="add()">
          Добавить участника
        </button>
      </div>
      <crm-table [data]="members" [columns]="columns"></crm-table>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button mat-button (click)="close()">Закрыть</button></mat-dialog-actions
    >
  `,
})
export class QueueMembersDialogComponent implements OnInit {
  private svc = inject(QueueMembersService);
  private fb = inject(FormBuilder);
  members: QueueMemberRecord[] = [];
  data = inject(MAT_DIALOG_DATA) as { queueName: string };
  dialogRef = inject(MatDialogRef) as MatDialogRef<QueueMembersDialogComponent>;

  columns: CrmColumn[] = [
    { key: 'id', label: 'ID', width: '6%' },
    {
      key: 'userName',
      label: 'Пользователь',
      cell: (row) => this.getUserName(row),
    },
    { key: 'userEmail', label: 'Email', cell: (row) => row.user?.email || '-' },
    { key: 'member_name', label: 'Эндпоинт' },
    { key: 'member_interface', label: 'Интерфейс участника' },
    { key: 'penalty', label: 'Penalty' },
    { key: 'paused', label: 'Paused' },
    { key: 'actions', label: '' },
  ];

  async ngOnInit() {
    this.load();
  }

  load() {
    this.svc.list(this.data.queueName).subscribe((m) => (this.members = m));
  }

  async add() {
    const name = window.prompt('Member name (e.g. PJSIP/1001 or operator1)');
    if (!name) return;
    await this.svc
      .create({
        queue_name: this.data.queueName,
        member_name: name,
        member_interface: name,
        iface: name,
        uniqueid: name,
        memberid: name,
      })
      .toPromise();
    this.load();
  }

  async edit(row: QueueMemberRecord) {
    const name = window.prompt('Member name', row.member_name);
    if (!name) return;
    await this.svc.update(row.id, { member_name: name }).toPromise();
    this.load();
  }

  async removeRow(row: QueueMemberRecord) {
    if (!confirm(`Удалить участника ${row.member_name}?`)) return;
    await this.svc.remove(row.id).toPromise();
    this.load();
  }

  getUserName(row: QueueMemberRecord): string {
    if (row.user) {
      const firstName = row.user.firstName || '';
      const lastName = row.user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || row.user.username || row.member_name;
    }
    return row.member_name;
  }

  close() {
    this.dialogRef.close();
  }
}
