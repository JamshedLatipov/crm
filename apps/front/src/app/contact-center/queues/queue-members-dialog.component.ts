import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { QueueMembersService, QueueMemberRecord } from '../services/queue-members.service';
import { CrmTableComponent, CrmColumn } from '../../shared/components/crm-table/crm-table.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  standalone: true,
  selector: 'app-queue-members-dialog',
  imports: [CommonModule, MatDialogModule, CrmTableComponent, MatIconModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Участники очереди: {{ data.queueName }}</h2>
    <mat-dialog-content>
      <div style="margin-bottom:8px">
        <button mat-stroked-button color="primary" (click)="add()">Добавить участника</button>
      </div>
      <crm-table [data]="members" [columns]="columns"></crm-table>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button (click)="close()">Закрыть</button></mat-dialog-actions>
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
    { key: 'member_name', label: 'Member' },
    { key: 'penalty', label: 'Penalty' },
    { key: 'paused', label: 'Paused' },
    { key: 'member_interface', label: 'Interface' },
    { key: 'actions', label: '' },
  ];

  async ngOnInit() {
    this.load();
  }

  load() {
    this.svc.list(this.data.queueName).subscribe(m => this.members = m);
  }

  async add() {
    const name = window.prompt('Member name (e.g. PJSIP/1001 or operator1)');
    if (!name) return;
    await this.svc.create({ queue_name: this.data.queueName, member_name: name }).toPromise();
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

  close() { this.dialogRef.close(); }
}
