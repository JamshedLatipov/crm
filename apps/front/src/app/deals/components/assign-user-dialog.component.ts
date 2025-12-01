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
import { AuthService } from '../../auth/auth.service';
import { Deal } from '../../pipeline/dtos';
import { TaskDto } from '../../tasks/tasks.service';

export interface AssignUserDialogData {
  deal?: Deal;
  task?: TaskDto;
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
        <div class="header-content">
          <mat-icon class="header-icon">person_search</mat-icon>
          <div class="header-text">
            <h2>Сменить ответственного</h2>
            <p class="dialog-subtitle">{{ data.deal?.title || data.task?.title }}</p>
          </div>
        </div>
        <button mat-icon-button class="close-button" (click)="onCancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div mat-dialog-content class="dialog-content">
        <!-- Поиск пользователей -->
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Поиск менеджера</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="searchQuery" placeholder="Введите имя или роль" autocomplete="off">
          <button matSuffix mat-icon-button *ngIf="searchQuery" (click)="searchQuery = ''">
            <mat-icon>clear</mat-icon>
          </button>
        </mat-form-field>

        <!-- Список пользователей -->
        <div class="users-list" *ngIf="!isLoading">
          <mat-selection-list [(ngModel)]="selectedUserId" [multiple]="false">
            <mat-list-option 
              *ngFor="let user of filteredUsers" 
              [value]="user.id"
              [class.current-assignee]="user.id === (data.deal?.assignedTo || data.task?.assignedToId?.toString())">
              
              <div class="user-item">
                <div class="user-avatar">
                  <mat-icon>person</mat-icon>
                </div>
                <div class="user-info">
                  <div class="user-name">
                    {{ user.name }}
                    <span *ngIf="user.id === (data.deal?.assignedTo || data.task?.assignedToId?.toString())" class="current-badge">
                      <mat-icon>check_circle</mat-icon>
                      Текущий
                    </span>
                  </div>
                  <div class="user-details">
                    <span class="user-role">{{ user.role }}</span>
                    <span class="separator">•</span>
                    <span class="user-department">{{ user.department }}</span>
                  </div>
                  <!-- Leads-style sections for Leads, Deals and Tasks -->
                  <div class="user-workload">
                    <!-- workload wrapper to apply CSS defined under .user-workload -->
                    <div class="workload-section" [class.high]="(user.workload ?? 0) > (user.maxCapacity ?? 0)">
                    <div class="workload-text" [class.high]="(user.workload ?? 0) > (user.maxCapacity ?? 0)">
                      Лидов: {{ user.workload ?? 0 }} / {{ user.maxCapacity ?? 0 }}
                    </div>
                    <div class="workload-bar">
                      <div class="workload-fill"
                           [style.width.%]="(user.workloadPercentage ?? ((user.workload ?? 0) / (user.maxCapacity || 1) * 100))"
                           [class.warning]="(user.workload ?? 0) > (user.maxCapacity ?? 0)">
                      </div>
                    </div>
                  </div>

                  <div class="workload-section" [class.high]="(user.currentDealsCount ?? 0) > (user.maxDealsCapacity ?? 0)">
                    <div class="workload-text" [class.high]="(user.currentDealsCount ?? 0) > (user.maxDealsCapacity ?? 0)">
                      Сделок: {{ user.currentDealsCount ?? 0 }} / {{ user.maxDealsCapacity ?? 0 }}
                    </div>
                    <div class="workload-bar">
                      <div class="workload-fill"
                           [style.width.%]="(user.currentDealsCount ?? 0) / (user.maxDealsCapacity || 1) * 100"
                           [class.warning]="(user.currentDealsCount ?? 0) > (user.maxDealsCapacity ?? 0)">
                      </div>
                    </div>
                  </div>

                  <div class="workload-section" [class.high]="(user.currentTasksCount ?? 0) > (user.maxTasksCapacity ?? 0)">
                    <div class="workload-text" [class.high]="(user.currentTasksCount ?? 0) > (user.maxTasksCapacity ?? 0)">
                      Задач: {{ user.currentTasksCount ?? 0 }} / {{ user.maxTasksCapacity ?? 0 }}
                    </div>
                    <div class="workload-bar">
                      <div class="workload-fill"
                           [style.width.%]="(user.currentTasksCount ?? 0) / (user.maxTasksCapacity || 1) * 100"
                           [class.warning]="(user.currentTasksCount ?? 0) > (user.maxTasksCapacity ?? 0)">
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
                <div class="user-status">
                  <span *ngIf="user.isAvailable" class="status-badge available">
                    <mat-icon>check_circle</mat-icon>
                    Доступен
                  </span>
                  <span *ngIf="!user.isAvailable" class="status-badge busy">
                    <mat-icon>do_not_disturb</mat-icon>
                    Занят
                  </span>
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
        <button mat-stroked-button (click)="onCancel()" class="cancel-btn">
          Отмена
        </button>
        <button 
          mat-flat-button 
          color="primary"
          class="assign-btn"
          [disabled]="!selectedUserId || selectedUserId === (data.deal?.assignedTo || data.task?.assignedToId?.toString())"
          (click)="onAssign()">
          <mat-icon>assignment_ind</mat-icon>
          <span class="btn-text">Назначить</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .assign-user-dialog {
      max-width: 95vw;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      padding: 16px 20px !important;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 !important;

      .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;

        .header-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: var(--primary-color);
          flex-shrink: 0;
        }

        .header-text {
          min-width: 0;
          flex: 1;

          h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            line-height: 1.3;
          }
          
          .dialog-subtitle {
            margin: 2px 0 0 0;
            color: var(--text-secondary);
            font-size: 13px;
            font-weight: 400;
            line-height: 1.4;
          }
        }
      }

      .close-button {
        flex-shrink: 0;
        margin-left: 8px;
      }
    }

    .dialog-content {
      padding: 16px 20px !important;
      overflow-y: auto;
      flex: 1;
    }

    .search-field {
      width: 100%;
      margin-bottom: 16px;

      ::ng-deep .mat-mdc-text-field-wrapper {
        background-color: var(--input-bg);
      }
    }

    .users-list {
      max-height: 450px;
      overflow-y: auto;
      margin: 0 -20px;
      padding: 0 20px;
      
      mat-selection-list {
        padding: 0;
      }
      
      mat-list-option {
        height: auto !important;
        min-height: auto !important;
        padding: 12px !important;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 0;
        transition: all 0.2s ease;
        
        &.current-assignee {
          background-color: var(--primary-color-light) !important;
          border-left: 3px solid var(--primary-color);
        }
        
        &:hover {
          background-color: var(--hover-color) !important;
          transform: translateX(2px);
        }

        &:last-child {
          border-bottom: none;
        }
      }
    }

  .user-item {
  display: flex;
  gap: 12px;
  /* make items a bit narrower than full width so they don't stretch edge-to-edge */
  width: 92%;
  max-width: 880px;
  align-items: flex-start;
      
      .user-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);

        mat-icon {
          color: white;
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }
      
      .user-info {
        flex: 1;
        min-width: 0;
        
        .user-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 6px;
          color: var(--text-primary);
          line-height: 1.3;

          .current-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            background-color: var(--primary-color);
            color: white;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            
            mat-icon {
              font-size: 14px;
              width: 14px;
              height: 14px;
            }
          }
        }
        
        .user-details {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;

          .user-role {
            font-weight: 500;
          }

          .separator {
            opacity: 0.6;
          }
        }
        
        .user-workload {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .workload-bar {
            width: 100%;
            height: 6px;
            background-color: var(--border-color);
            border-radius: 3px;
            overflow: hidden;

            .workload-fill {
              height: 100%;
              background: linear-gradient(90deg, #4caf50 0%, #8bc34a 50%, #ff9800 75%, #f44336 100%);
              transition: width 0.3s ease;
              border-radius: 3px;
            }
          }

          .workload-text {
            font-size: 12px;
            color: var(--text-secondary);
            font-weight: 500;
          }
          
          &.overloaded {
            .workload-text {
              color: var(--error-color);
            }

            .workload-fill {
              background: var(--error-color);
            }
          }
        }
      }
      
      .user-status {
        flex-shrink: 0;
        margin-top: 4px;

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }

          &.available {
            background-color: rgba(76, 175, 80, 0.1);
            color: var(--success-color);
          }

          &.busy {
            background-color: rgba(255, 152, 0, 0.1);
            color: var(--warning-color);
          }
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
      padding: 12px 20px !important;
      border-top: 1px solid var(--border-color);
      gap: 8px;
      display: flex;
      justify-content: flex-end;
      margin: 0 !important;
      flex-wrap: wrap;
      
      button {
        min-width: 100px;
        height: 40px;
        font-weight: 500;
        
        mat-icon {
          margin-right: 6px;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .cancel-btn {
        border-color: var(--border-color);
      }

      .assign-btn {
        .btn-text {
          display: inline;
        }
      }

      button[mat-stroked-button] {
        border-color: var(--border-color);
      }
    }

    /* Адаптивность для маленьких экранов */
    @media (max-width: 600px) {
      .assign-user-dialog {
        width: 100vw;
        max-width: 100vw;
        max-height: 100vh;
        margin: 0;
      }

      .dialog-header {
        padding: 12px 16px !important;

        .header-content {
          gap: 10px;

          .header-icon {
            font-size: 24px;
            width: 24px;
            height: 24px;
          }

          .header-text {
            h2 {
              font-size: 16px;
            }

            .dialog-subtitle {
              font-size: 12px;
            }
          }
        }
      }

      .dialog-content {
        padding: 12px 16px !important;
      }

      .users-list {
        margin: 0 -16px;
        padding: 0 16px;

        mat-list-option {
          padding: 10px !important;
        }
      }

      .user-item {
        gap: 10px;

        .user-avatar {
          width: 40px;
          height: 40px;

          mat-icon {
            font-size: 22px;
            width: 22px;
            height: 22px;
          }
        }

        .user-info {
          .user-name {
            font-size: 14px;

            .current-badge {
              font-size: 10px;
              padding: 2px 6px;

              mat-icon {
                font-size: 12px;
                width: 12px;
                height: 12px;
              }
            }
          }

          .user-details {
            font-size: 12px;
          }

          .user-workload {
            .workload-text {
              font-size: 11px;
            }
          }
        }

        .user-status {
          .status-badge {
            font-size: 11px;
            padding: 4px 8px;

            mat-icon {
              font-size: 14px;
              width: 14px;
              height: 14px;
            }
          }
        }
      }

      .dialog-actions {
        padding: 10px 16px !important;
        flex-wrap: nowrap;

        button {
          flex: 1;
          min-width: 0;
          font-size: 14px;
        }

        .assign-btn {
          .btn-text {
            display: none;
          }

          mat-icon {
            margin-right: 0;
          }
        }
      }
    }

    /* CSS переменные */
    :host {
      --primary-color: #2563eb;
      --primary-color-light: rgba(37, 99, 235, 0.08);
      --text-primary: #1a1a1a;
      --text-secondary: #6b7280;
      --border-color: #e5e7eb;
      --hover-color: #f9fafb;
      --input-bg: #f9fafb;
      --success-color: #10b981;
      --warning-color: #f59e0b;
      --error-color: #ef4444;
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
  private readonly auth = inject(AuthService);
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
      // mat-selection-list может возвращать массив даже с [multiple]="false"
      // Извлекаем первый элемент если это массив
      const userIdValue = Array.isArray(this.selectedUserId) 
        ? this.selectedUserId[0] 
        : this.selectedUserId;
      
      console.log('onAssign - selectedUserId:', this.selectedUserId, 'userIdValue:', userIdValue);
      
      const selectedUser = this.users.find(u => u.id === userIdValue);
      console.log('onAssign - selectedUser:', selectedUser);
      
      this.dialogRef.close({
        userId: userIdValue,
        user: selectedUser,
        assignedBy: this.auth.getUserId() || 'system'
      });
    }
  }
}