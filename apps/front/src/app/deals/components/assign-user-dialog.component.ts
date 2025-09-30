import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { UsersService, User } from '../../users/users.service';
import { Deal } from '../../pipeline/dtos';

export interface AssignUserDialogData {
  deal: Deal;
  currentUsers: User[];
}

@Component({
  selector: 'app-assign-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  template: `
    <div class="assign-user-dialog">
      <div mat-dialog-title class="dialog-header">
        <h2>Сменить ответственного</h2>
        <p class="dialog-subtitle">Сделка: {{ data.deal.title }}</p>
      </div>

      <div mat-dialog-content class="dialog-content">
        <!-- Поиск пользователей -->
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Поиск менеджера</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="searchQuery" placeholder="Введите имя или роль">
        </mat-form-field>

        <!-- Список пользователей -->
        <div class="users-list" *ngIf="!isLoading">
          <mat-selection-list [(ngModel)]="selectedUserId" [multiple]="false">
            <mat-list-option 
              *ngFor="let user of filteredUsers" 
              [value]="user.id"
              [class.current-assignee]="user.id === data.deal.assignedTo">
              
              <div class="user-item">
                <div class="user-info">
                  <div class="user-name">
                    {{ user.name }}
                    <mat-icon *ngIf="user.id === data.deal.assignedTo" class="current-icon">
                      check_circle
                    </mat-icon>
                  </div>
                  <div class="user-details">
                    {{ user.role }} • {{ user.department }}
                  </div>
                  <div class="user-workload" [class.overloaded]="!user.isAvailable">
                    Загрузка: {{ user.workload }}/{{ user.maxCapacity }} 
                    <span class="workload-percent">({{ user.workloadPercentage | number:'1.0-0' }}%)</span>
                  </div>
                </div>
                <div class="user-status">
                  <mat-icon *ngIf="user.isAvailable" class="available-icon">verified</mat-icon>
                  <mat-icon *ngIf="!user.isAvailable" class="unavailable-icon">warning</mat-icon>
                </div>
              </div>
            </mat-list-option>
          </mat-selection-list>
        </div>

        <!-- Индикатор загрузки -->
        <div class="loading-container" *ngIf="isLoading">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Загрузка менеджеров...</p>
        </div>

        <!-- Сообщение об отсутствии результатов -->
        <div class="no-results" *ngIf="!isLoading && filteredUsers.length === 0">
          <mat-icon>search_off</mat-icon>
          <p>Менеджеры не найдены</p>
        </div>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()">
          Отмена
        </button>
        <button 
          mat-raised-button 
          color="primary"
          [disabled]="!selectedUserId || selectedUserId === data.deal.assignedTo"
          (click)="onAssign()">
          <mat-icon>assignment_ind</mat-icon>
          Назначить
        </button>
      </div>
    </div>
  `,
  styles: [`
    .assign-user-dialog {
      width: 500px;
      max-height: 80vh;
    }

    .dialog-header {
      h2 {
        margin: 0 0 8px 0;
        color: var(--text-primary);
      }
      
      .dialog-subtitle {
        margin: 0;
        color: var(--text-secondary);
        font-size: 14px;
      }
    }

    .dialog-content {
      max-height: 500px;
      overflow-y: auto;
      padding: 0 !important;
    }

    .search-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .users-list {
      max-height: 400px;
      overflow-y: auto;
      
      mat-selection-list {
        padding: 0;
      }
      
      mat-list-option {
        height: auto;
        padding: 12px;
        border-bottom: 1px solid var(--border-color);
        
        &.current-assignee {
          background-color: var(--primary-color-light);
          border-left: 4px solid var(--primary-color);
        }
        
        &:hover {
          background-color: var(--hover-color);
        }
      }
    }

    .user-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      
      .user-info {
        flex: 1;
        
        .user-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          margin-bottom: 4px;
          
          .current-icon {
            color: var(--primary-color);
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
        
        .user-details {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        
        .user-workload {
          font-size: 12px;
          color: var(--text-secondary);
          
          &.overloaded {
            color: var(--error-color);
          }
          
          .workload-percent {
            font-weight: 500;
          }
        }
      }
      
      .user-status {
        .available-icon {
          color: var(--success-color);
        }
        
        .unavailable-icon {
          color: var(--warning-color);
        }
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      
      p {
        margin: 16px 0 0 0;
        color: var(--text-secondary);
      }
    }

    .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--text-secondary);
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      p {
        margin: 0;
      }
    }

    .dialog-actions {
      padding: 16px 0 0 0;
      gap: 12px;
      
      button {
        min-width: 120px;
        
        mat-icon {
          margin-right: 8px;
        }
      }
    }

    /* CSS переменные */
    :host {
      --primary-color: #2563eb;
      --primary-color-light: rgba(37, 99, 235, 0.1);
      --text-primary: #212121;
      --text-secondary: #757575;
      --border-color: #e0e0e0;
      --hover-color: #f5f5f5;
      --success-color: #4caf50;
      --warning-color: #ff9800;
      --error-color: #f44336;
    }

    /* Темная тема */
    :host-context(.dark) {
      --primary-color: #3b82f6;
      --primary-color-light: rgba(59, 130, 246, 0.1);
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --border-color: #334155;
      --hover-color: #1e293b;
      --success-color: #4ade80;
      --warning-color: #fbbf24;
      --error-color: #ef4444;
    }
  `]
})
export class AssignUserDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AssignUserDialogComponent>);
  private readonly usersService = inject(UsersService);
  public readonly data = inject<AssignUserDialogData>(MAT_DIALOG_DATA);

  searchQuery = '';
  selectedUserId = '';
  isLoading = false;
  users: User[] = [];

  constructor() {
    // Используем переданные пользователи или загружаем их
    if (this.data.currentUsers && this.data.currentUsers.length > 0) {
      this.users = this.data.currentUsers;
    } else {
      this.loadUsers();
    }
  }

  get filteredUsers(): User[] {
    if (!this.searchQuery.trim()) {
      return this.users;
    }
    
    const query = this.searchQuery.toLowerCase();
    return this.users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.department.toLowerCase().includes(query)
    );
  }

  private loadUsers() {
    this.isLoading = true;
    this.usersService.getAllManagers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки пользователей:', error);
        this.isLoading = false;
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onAssign() {
    if (this.selectedUserId) {
      const selectedUser = this.users.find(u => u.id === this.selectedUserId);
      this.dialogRef.close({
        userId: this.selectedUserId,
        user: selectedUser
      });
    }
  }
}