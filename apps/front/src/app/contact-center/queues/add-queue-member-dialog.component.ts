import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { UsersService, User } from '../../users/users.service';
import { QueueMembersService } from '../services/queue-members.service';
import { lastValueFrom } from 'rxjs';

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
  templateUrl: './add-queue-member-dialog.component.html',
  styleUrls: ['./add-queue-member-dialog.component.scss'],
})
export class AddQueueMemberDialogComponent implements OnInit {
  private usersService = inject(UsersService);
  private queueMembersSvc = inject(QueueMembersService);
  private dialogRef = inject(MatDialogRef<AddQueueMemberDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { queueName: string };

  users: User[] = [];
  isLoading = false;
  existingEndpoints = new Set<string>();

  userControl = new FormControl<User | null>(null);
  interfaceControl = new FormControl(
    {
      disabled: true,
      value: '',
    },
    { validators: Validators.required }
  );

  async ngOnInit() {
    await this.loadExistingMembers();
    await this.loadUsers();

    // Автозаполнение интерфейса при выборе пользователя
    this.userControl.valueChanges.subscribe((user) => {
      if (user && user.sipEndpointId) {
        this.interfaceControl.setValue(user.sipEndpointId);
      }
    });
  }

  async loadUsers() {
    this.isLoading = true;
    const users = await lastValueFrom(this.usersService.getAllManagers())
      .catch((e) => console.error('Ошибка загрузки пользователей:', e))
      .finally(() => {
        this.isLoading = false;
      });

    this.users = (users || []).filter((u) => {
      const sid = String(u.sipEndpointId).trim();
      if (!sid) return true;
      return !this.existingEndpoints.has(sid);
    });
  }

  private async loadExistingMembers() {
    const members = await lastValueFrom(
      this.queueMembersSvc.list(this.data.queueName)
    ).catch((e) => {
      console.warn('Failed to load existing queue members', e);
      return [];
    });

    this.existingEndpoints.clear();

    (members || []).forEach((m) => {
      this.existingEndpoints.add(String(m.memberid));
      if (m.memberid) {
        const rawId = m.memberid;
        this.existingEndpoints.add(rawId);
      }
    });
  }

  isValid(): boolean {
    return !!this.interfaceControl.getRawValue();
  }

  save() {
    if (!this.isValid()) return;

    const memberInterface = this.interfaceControl.getRawValue()!;

    this.dialogRef.close({
      memberName: memberInterface,
      memberInterface: memberInterface,
      memberId: memberInterface,
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
