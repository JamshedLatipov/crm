import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
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
import {
  ReactiveFormsModule,
  FormBuilder,
  FormControl,
  Validators,
} from '@angular/forms';
import { UsersService, User } from '../../users/users.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
  private dialog = inject(MatDialog);
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
    const dialogRef = this.dialog.open(AddQueueMemberDialogComponent, {
      width: '800px',
      data: { queueName: this.data.queueName },
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result) {
      await this.svc
        .create({
          queue_name: this.data.queueName,
          member_name: result.memberName,
          member_interface: result.memberInterface,
          iface: result.memberInterface,
          uniqueid: result.memberInterface,
          memberid: result.memberInterface,
        })
        .toPromise();
      this.load();
    }
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

// Компонент для добавления участника очереди с выбором из справочника
@Component({
  standalone: true,
  selector: 'app-add-queue-member-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Добавить участника в очередь</h2>
    <mat-dialog-content>
      <div class="add-member-form">
        <mat-form-field
          appearance="outline"
          style="width: 100%; margin-bottom: 16px;"
        >
          <mat-label>Выберите пользователя</mat-label>
          <mat-select [formControl]="userControl">
            <mat-option [value]="null"
              >-- Кастомный участник (ручной ввод) --</mat-option
            >
            <mat-option *ngIf="isLoading" disabled>
              <div style="display: flex; align-items: center; gap: 8px;">
                <mat-spinner diameter="18"></mat-spinner>
                <span>Загрузка пользователей...</span>
              </div>
            </mat-option>
            <mat-option *ngFor="let user of users" [value]="user">
              <div style="display: flex; flex-direction: column;">
                <div style="font-weight: 500;">{{ user.name }}</div>
                <div style="font-size: 12px; color: #666;">
                  {{ user.email }}
                  <span *ngIf="user.sipEndpointId">
                    • SIP: {{ user.sipEndpointId }}</span
                  >
                </div>
              </div>
            </mat-option>
          </mat-select>
          <mat-icon matSuffix>person</mat-icon>
          <mat-hint
            >Выберите пользователя из списка или оставьте пустым для ручного
            ввода</mat-hint
          >
        </mat-form-field>
        <br />
        <mat-form-field
          appearance="outline"
          style="width: 100%; margin-bottom: 16px;"
        >
          <mat-label>Интерфейс участника</mat-label>
          <input
            matInput
            [formControl]="interfaceControl"
            placeholder="например, PJSIP/1001 или operator1"
            required
          />
          <mat-icon matSuffix>phone</mat-icon>
          <mat-hint>{{
            userControl.value
              ? 'Заполняется из SIP интерфейса пользователя (например 1001)'
              : 'Введите интерфейс вручную (например 1001 или PJSIP/1001)'
          }}</mat-hint>
          <mat-error *ngIf="interfaceControl.hasError('required')"
            >Укажите интерфейс</mat-error
          >
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Отмена</button>
      <button
        mat-raised-button
        color="primary"
        (click)="save()"
        [disabled]="!isValid()"
      >
        Добавить
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .add-member-form {
        min-width: 400px;
        padding: 16px 0;
      }
    `,
  ],
})
export class AddQueueMemberDialogComponent implements OnInit {
  private usersService = inject(UsersService);
  private dialogRef = inject(MatDialogRef<AddQueueMemberDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { queueName: string };

  users: User[] = [];
  isLoading = false;

  userControl = new FormControl<User | null>(null);
  interfaceControl = new FormControl(
    {
      disabled: true,
      value: '',
    },
    { validators: Validators.required }
  );

  ngOnInit() {
    this.loadUsers();

    // Автозаполнение интерфейса при выборе пользователя
    this.userControl.valueChanges.subscribe((user) => {
      console.log('Selected user:', user);
      if (user && user.sipEndpointId) {
        // Заполняем сырое значение интерфейса (sipEndpointId) — префикс PJSIP добавим
        // позже при формировании member_name, так как интерфейс уже есть в таблице пользователя
        this.interfaceControl.setValue(user.sipEndpointId);
      }
    });
  }

  loadUsers() {
    this.isLoading = true;
    this.usersService.getAllManagers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки пользователей:', error);
        this.isLoading = false;
      },
    });
  }

  isValid(): boolean {
    return !!this.interfaceControl.getRawValue();
  }

  save() {
    if (!this.isValid()) return;

    const user = this.userControl.getRawValue();
    const memberInterface = this.interfaceControl.getRawValue()!;

    // Если выбран пользователь — в member_name должен быть формат PJSIP/{interface}.
    // Интерфейс берём из поля ввода (`interfaceControl`) — оно содержит сырое значение из таблицы пользователя.
    let memberName: string;
    if (user) {
      memberName =
        memberInterface.startsWith('PJSIP/') || memberInterface.includes('/')
          ? memberInterface
          : `PJSIP/${memberInterface}`;
    } else {
      // Кастомный участник без привязки к пользователю — используем то, что ввёл пользователь
      memberName = memberInterface;
    }

    this.dialogRef.close({
      memberName: memberName,
      memberInterface: memberInterface,
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
