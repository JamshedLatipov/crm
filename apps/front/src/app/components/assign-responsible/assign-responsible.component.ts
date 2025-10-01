import { Component, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  department?: string;
}

export interface AssignmentData {
  assignedTo: string[];
  assignedBy: string;
  assignedAt: Date;
  reason?: string;
}

@Component({
  selector: 'app-assign-responsible',
  standalone: true,
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatAutocompleteModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="assign-responsible">
      <div class="assign-header">
        <mat-icon>person_add</mat-icon>
        <h3>Назначить ответственного</h3>
      </div>

      <div class="assign-content">
        <!-- Поиск пользователей -->
        <mat-form-field class="user-search">
          <mat-label>Найти пользователя</mat-label>
          <input 
            matInput 
            [formControl]="searchControl"
            [matAutocomplete]="auto"
            placeholder="Введите имя или email"
          >
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onUserSelected($event)">
            @for (user of filteredUsers$ | async; track user.id) {
              <mat-option [value]="user.id">
                <div class="user-option">
                  <div class="user-avatar">
                    @if (user.avatar) {
                      <img [src]="user.avatar" [alt]="user.name">
                    } @else {
                      <mat-icon>person</mat-icon>
                    }
                  </div>
                  <div class="user-info">
                    <div class="user-name">{{ user.name }}</div>
                    <div class="user-details">{{ user.email }} • {{ user.role }}</div>
                  </div>
                </div>
              </mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <!-- Выбранные пользователи -->
        @if (selectedUsers().length > 0) {
          <div class="selected-users">
            <h4>Ответственные:</h4>
            <div class="users-chips">
              @for (user of selectedUsers(); track user.id) {
                <mat-chip-row (removed)="removeUser(user.id)">
                  <div class="chip-content">
                    <div class="chip-avatar">
                      @if (user.avatar) {
                        <img [src]="user.avatar" [alt]="user.name">
                      } @else {
                        <mat-icon>person</mat-icon>
                      }
                    </div>
                    <span>{{ user.name }}</span>
                  </div>
                  <button matChipRemove>
                    <mat-icon>cancel</mat-icon>
                  </button>
                </mat-chip-row>
              }
            </div>
          </div>
        }

        <!-- Причина назначения -->
        <mat-form-field class="reason-field">
          <mat-label>Причина назначения (опционально)</mat-label>
          <textarea 
            matInput 
            [formControl]="reasonControl"
            placeholder="Укажите причину назначения..."
            rows="3"
          ></textarea>
        </mat-form-field>

        <!-- Быстрый выбор по ролям -->
        <div class="quick-assign">
          <h4>Быстрое назначение:</h4>
          <div class="role-buttons">
            <button 
              mat-button 
              class="role-btn"
              (click)="assignByRole('manager')"
            >
              <mat-icon>supervisor_account</mat-icon>
              Менеджеры
            </button>
            <button 
              mat-button 
              class="role-btn"
              (click)="assignByRole('admin')"
            >
              <mat-icon>admin_panel_settings</mat-icon>
              Администраторы
            </button>
            <button 
              mat-button 
              class="role-btn"
              (click)="assignByRole('support')"
            >
              <mat-icon>support_agent</mat-icon>
              Поддержка
            </button>
          </div>
        </div>
      </div>

      <div class="assign-actions">
        <button 
          mat-button 
          color="primary" 
          (click)="onCancel()"
        >
          Отмена
        </button>
        <button 
          mat-raised-button 
          color="primary" 
          [disabled]="selectedUsers().length === 0"
          (click)="onAssign()"
        >
          Назначить ({{ selectedUsers().length }})
        </button>
      </div>
    </div>
  `,
  styles: [`
    .assign-responsible {
      min-width: 400px;
      max-width: 500px;
    }

    .assign-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .assign-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    .assign-content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .user-search {
      width: 100%;
    }

    .user-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
    }

    .user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-avatar mat-icon {
      font-size: 18px;
      color: #666;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      font-weight: 500;
      font-size: 14px;
    }

    .user-details {
      font-size: 12px;
      color: #666;
    }

    .selected-users h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .users-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chip-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
    }

    .chip-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .chip-avatar mat-icon {
      font-size: 14px;
      color: #666;
    }

    .reason-field {
      width: 100%;
    }

    .quick-assign h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .role-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .role-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      padding: 8px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 20px;
    }

    .role-btn mat-icon {
      font-size: 16px;
    }

    .assign-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class AssignResponsibleComponent {
  // Inputs
  public readonly entityType = input<'lead' | 'deal' | 'task' | 'notification'>('notification');
  public readonly entityId = input<string | number>();
  public readonly currentAssignees = input<string[]>([]);

  // Outputs
  public readonly assigned = output<AssignmentData>();
  public readonly cancelled = output<void>();

  // Form controls
  public readonly searchControl = new FormControl('');
  public readonly reasonControl = new FormControl('');

  // State
  public readonly selectedUsers = signal<User[]>([]);
  public readonly availableUsers = signal<User[]>([
    // Mock data - в реальном приложении загружать через сервис
    { id: '1', name: 'Анна Иванова', email: 'anna@company.com', role: 'Менеджер', department: 'Продажи' },
    { id: '2', name: 'Петр Петров', email: 'petr@company.com', role: 'Администратор', department: 'IT' },
    { id: '3', name: 'Елена Сидорова', email: 'elena@company.com', role: 'Поддержка', department: 'Клиентский сервис' },
    { id: '4', name: 'Сергей Козлов', email: 'sergey@company.com', role: 'Менеджер', department: 'Продажи' },
    { id: '5', name: 'Мария Николаева', email: 'maria@company.com', role: 'Руководитель', department: 'Продажи' }
  ]);

  // Computed
  public readonly filteredUsers$: Observable<User[]>;

  constructor() {
    this.filteredUsers$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterUsers(value || ''))
    );

    // Предустановленные назначения
    const currentIds = this.currentAssignees();
    if (currentIds.length > 0) {
      const preselected = this.availableUsers().filter(user => 
        currentIds.includes(user.id)
      );
      this.selectedUsers.set(preselected);
    }
  }

  onUserSelected(event: any): void {
    const userId = event.option.value;
    const user = this.availableUsers().find(u => u.id === userId);
    
    if (user && !this.selectedUsers().find(u => u.id === userId)) {
      this.selectedUsers.update(users => [...users, user]);
    }
    
    this.searchControl.setValue('');
  }

  removeUser(userId: string): void {
    this.selectedUsers.update(users => users.filter(u => u.id !== userId));
  }

  assignByRole(role: string): void {
    const roleUsers = this.availableUsers().filter(user => 
      user.role?.toLowerCase().includes(role) && 
      !this.selectedUsers().find(selected => selected.id === user.id)
    );
    
    this.selectedUsers.update(users => [...users, ...roleUsers]);
  }

  onAssign(): void {
    const assignmentData: AssignmentData = {
      assignedTo: this.selectedUsers().map(user => user.id),
      assignedBy: 'current-user', // Получать из AuthService
      assignedAt: new Date(),
      reason: this.reasonControl.value || undefined
    };

    this.assigned.emit(assignmentData);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private filterUsers(value: string): User[] {
    const filterValue = value.toLowerCase();
    return this.availableUsers().filter(user =>
      user.name.toLowerCase().includes(filterValue) ||
      user.email.toLowerCase().includes(filterValue) ||
      user.role?.toLowerCase().includes(filterValue)
    );
  }
}