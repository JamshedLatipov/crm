import { Component, input, output, signal, computed, inject, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SimpleUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface AssignResult {
  users: SimpleUser[];
  reason?: string;
}

@Component({
  selector: 'app-assign-users-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="assign-users-dialog">
      <div class="dialog-header">
        <mat-icon>person_add</mat-icon>
  <h3>{{ getTitle() }}</h3>
      </div>

      <div class="dialog-body">
        <mat-form-field class="user-search">
          <mat-label>Найти пользователя</mat-label>
          <input matInput [formControl]="searchControl" [matAutocomplete]="auto" placeholder="Введите имя или email">
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onUserSelected($event)">
            @for (user of filteredUsers$ | async; track user.id) {
              <mat-option [value]="user.id">{{ user.name }} — {{ user.email }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        @if (selectedUsers().length > 0) {
          <div class="selected-users">
            <div class="users-chips">
              @for (user of selectedUsers(); track user.id) {
                <mat-chip-row (removed)="removeUser(user.id)">
                  <span>{{ user.name }}</span>
                  <button matChipRemove><mat-icon>cancel</mat-icon></button>
                </mat-chip-row>
              }
            </div>
          </div>
        }

        <mat-form-field class="reason-field">
          <mat-label>Причина (опционально)</mat-label>
          <textarea matInput [formControl]="reasonControl" rows="3"></textarea>
        </mat-form-field>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()">Отмена</button>
        <button mat-raised-button color="primary" (click)="onAssign()" [disabled]="selectedUsers().length === 0">
          {{ getConfirmLabel() }} ({{ selectedUsers().length }})
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .assign-users-dialog { min-width: 360px; max-width: 560px; }
      .dialog-header { display:flex; align-items:center; gap:12px; padding:12px 16px; }
      .dialog-body { padding: 16px; display:flex; flex-direction:column; gap:12px; }
      .users-chips { display:flex; flex-wrap:wrap; gap:8px; }
      .dialog-actions { display:flex; justify-content:flex-end; gap:8px; padding:12px 16px; }
    `
  ]
})
export class AssignUsersDialogComponent {
  // Inputs (as signals so component works both embedded and as dialog)
  public readonly title = input<string>('Назначить');
  public readonly availableUsers = input<SimpleUser[]>([]);
  public readonly multi = input<boolean>(true);
  public readonly preselectedIds = input<string[]>([]);
  public readonly confirmLabel = input<string>('Назначить');

  // Outputs
  public readonly assigned = output<AssignResult>();
  public readonly cancelled = output<void>();

  // Controls & state
  public readonly searchControl = new FormControl('');
  public readonly reasonControl = new FormControl('');
  public readonly selectedUsers = signal<SimpleUser[]>([]);

  public readonly filteredUsers$: Observable<SimpleUser[]>;

  // Optional dialog references (injected when opened via MatDialog)
  private dialogRef?: MatDialogRef<any>;

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) private dialogData: any,
    @Optional() private matDialogRef?: MatDialogRef<any>
  ) {
    // initialize selected from preselectedIds (supports dialog data or inputs)
    const pre = this.preselectedIdsValue();
    if (pre.length > 0 && this.availableUsersValue().length > 0) {
      const preset = this.availableUsersValue().filter((u) => pre.includes(u.id));
      this.selectedUsers.set(preset);
    }

    this.filteredUsers$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterUsers(value || ''))
    );

    this.dialogRef = this.matDialogRef;
  }

  // Helpers to prefer dialog data when opened as dialog
  getTitle(): string {
    return (this.dialogData && this.dialogData.title) ? this.dialogData.title : this.title();
  }

  getConfirmLabel(): string {
    return (this.dialogData && this.dialogData.confirmLabel) ? this.dialogData.confirmLabel : this.confirmLabel();
  }

  availableUsersValue(): SimpleUser[] {
    return (this.dialogData && this.dialogData.availableUsers) ? this.dialogData.availableUsers : this.availableUsers();
  }

  multiValue(): boolean {
    return (this.dialogData && this.dialogData.multi !== undefined) ? this.dialogData.multi : this.multi();
  }

  preselectedIdsValue(): string[] {
    return (this.dialogData && this.dialogData.preselectedIds) ? this.dialogData.preselectedIds : this.preselectedIds();
  }

  private filterUsers(value: string): SimpleUser[] {
    const q = value.toLowerCase();
    return this.availableUsersValue().filter(u =>
      u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q)
    );
  }

  onUserSelected(event: any): void {
  const id = event.option.value;
  const user = this.availableUsersValue().find(u => u.id === id);
    if (!user) return;
    if (!this.selectedUsers().some(u => u.id === id)) {
      if (this.multiValue()) {
        this.selectedUsers.update(list => [...list, user]);
      } else {
        this.selectedUsers.set([user]);
      }
    }
    this.searchControl.setValue('');
  }

  removeUser(userId: string): void {
    this.selectedUsers.update(list => list.filter(u => u.id !== userId));
  }

  onAssign(): void {
    const result = { users: this.selectedUsers(), reason: this.reasonControl.value || undefined } as AssignResult;
    if (this.dialogRef) {
      this.dialogRef.close(result);
    } else {
      this.assigned.emit(result);
    }
  }

  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close(undefined);
    } else {
      this.cancelled.emit();
    }
  }
}
