import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmActionDialogComponent } from '../shared/dialogs/confirm-action-dialog.component';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { TaskTypeService, TaskType } from '../services/task-type.service';
import { TaskTypeDialogComponent } from './task-type-dialog.component';

@Component({
  selector: 'app-task-types-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    ConfirmActionDialogComponent,
  ],
  template: `
    <div class="task-types-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Типы задач</h1>
          <p class="subtitle">Управление типами задач и их настройками</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Создать тип задачи
          </button>
        </div>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Загрузка типов задач...</p>
        </div>
      }

      <!-- Empty state -->
      @if (!isLoading() && taskTypes().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">category</mat-icon>
          <h3>Нет типов задач</h3>
          <p>Создайте первый тип задачи для начала работы</p>
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Создать тип задачи
          </button>
        </div>
      }

      <!-- Table -->
      @if (!isLoading() && taskTypes().length > 0) {
        <div class="table-container">
          <table mat-table [dataSource]="taskTypes()" class="mat-elevation-z1 task-types-table">
            
            <!-- Icon & Name Column -->
            <ng-container matColumnDef="icon">
              <th mat-header-cell *matHeaderCellDef>Тип</th>
              <td mat-cell *matCellDef="let type">
                <div class="type-cell">
                  <div class="type-icon" [style.background-color]="type.color">
                    <mat-icon>{{ type.icon || 'task' }}</mat-icon>
                  </div>
                  <div class="type-info">
                    <div class="type-name">{{ type.name }}</div>
                    @if (type.description) {
                      <div class="type-description">{{ type.description }}</div>
                    }
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Duration Column -->
            <ng-container matColumnDef="duration">
              <th mat-header-cell *matHeaderCellDef>Длительность</th>
              <td mat-cell *matCellDef="let type">
                @if (type.timeFrameSettings?.defaultDuration) {
                  <div class="duration-cell">
                    <mat-icon>schedule</mat-icon>
                    <span>{{ formatDuration(type.timeFrameSettings.defaultDuration) }}</span>
                  </div>
                } @else {
                  <span class="text-muted">—</span>
                }
              </td>
            </ng-container>

            <!-- Working Hours Column -->
            <ng-container matColumnDef="workingHours">
              <th mat-header-cell *matHeaderCellDef>Рабочие часы</th>
              <td mat-cell *matCellDef="let type">
                @if (type.timeFrameSettings?.workingHours) {
                  <div class="hours-cell">
                    <mat-icon>work_outline</mat-icon>
                    <span>{{ type.timeFrameSettings.workingHours.start }} - {{ type.timeFrameSettings.workingHours.end }}</span>
                  </div>
                } @else {
                  <span class="text-muted">—</span>
                }
              </td>
            </ng-container>

            <!-- SLA Column -->
            <ng-container matColumnDef="sla">
              <th mat-header-cell *matHeaderCellDef>SLA</th>
              <td mat-cell *matCellDef="let type">
                @if (type.timeFrameSettings?.slaResponseTime || type.timeFrameSettings?.slaResolutionTime) {
                  <div class="sla-cell">
                    <mat-icon>speed</mat-icon>
                    <div class="sla-info">
                      @if (type.timeFrameSettings.slaResponseTime) {
                        <span>Ответ: {{ formatDuration(type.timeFrameSettings.slaResponseTime) }}</span>
                      }
                      @if (type.timeFrameSettings.slaResolutionTime) {
                        <span>Решение: {{ formatDuration(type.timeFrameSettings.slaResolutionTime) }}</span>
                      }
                    </div>
                  </div>
                } @else {
                  <span class="text-muted">—</span>
                }
              </td>
            </ng-container>

            <!-- Settings Column -->
            <ng-container matColumnDef="settings">
              <th mat-header-cell *matHeaderCellDef>Настройки</th>
              <td mat-cell *matCellDef="let type">
                <mat-chip-set>
                  @if (type.timeFrameSettings?.skipWeekends) {
                    <mat-chip>
                      <mat-icon>weekend</mat-icon>
                      Пропуск выходных
                    </mat-chip>
                  }
                  @if (type.timeFrameSettings?.autoCalculateDeadline) {
                    <mat-chip>
                      <mat-icon>auto_mode</mat-icon>
                      Авто срок
                    </mat-chip>
                  }
                  @if (type.timeFrameSettings?.reminderBeforeDeadline) {
                    <mat-chip>
                      <mat-icon>notifications</mat-icon>
                      Напоминание
                    </mat-chip>
                  }
                </mat-chip-set>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Действия</th>
              <td mat-cell *matCellDef="let type">
                <button mat-icon-button [matMenuTriggerFor]="menu" matTooltip="Действия">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="editType(type)">
                    <mat-icon>edit</mat-icon>
                    <span>Редактировать</span>
                  </button>
                  <button mat-menu-item (click)="duplicateType(type)">
                    <mat-icon>content_copy</mat-icon>
                    <span>Дублировать</span>
                  </button>
                  <button mat-menu-item (click)="toggleActive(type)">
                    <mat-icon>{{ type.isActive ? 'visibility_off' : 'visibility' }}</mat-icon>
                    <span>{{ type.isActive ? 'Деактивировать' : 'Активировать' }}</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="deleteType(type)" class="delete-action">
                    <mat-icon>delete</mat-icon>
                    <span>Удалить</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="task-type-row"></tr>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .task-types-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      min-height: 100vh;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-content h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .subtitle {
      margin: 4px 0 0 0;
      color: #6c757d;
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .header-actions button {
      border-radius: 8px;
      padding: 8px 16px;
      font-weight: 500;
    }

    /* Loading */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      gap: 16px;
    }

    .loading-container p {
      margin: 0;
      color: #6c757d;
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .empty-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: #bdbdbd;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 500;
      color: #1a1a1a;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      color: #6c757d;
    }

    /* Table Container */
    .table-container {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .task-types-table {
      width: 100%;
      background-color: white;
    }

    /* Table Header */
    .mat-mdc-header-row {
      background-color: #f8f9fa;
      border-bottom: 1px solid #e1e4e8;
    }

    .mat-mdc-header-cell {
      font-size: 12px;
      font-weight: 600;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 16px 12px;
      border-bottom: none;
    }

    /* Table Rows */
    .mat-mdc-cell {
      padding: 16px 12px;
      border-bottom: 1px solid #f1f3f4;
      font-size: 14px;
      color: #1a1a1a;
    }

    .task-type-row {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .task-type-row:hover {
      background-color: #f8f9fa;
    }

    /* Type cell */
    .type-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .type-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .type-icon mat-icon {
      color: white;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .type-info {
      flex: 1;
      min-width: 0;
    }

    .type-name {
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 2px;
    }

    .type-description {
      font-size: 12px;
      color: #6b7280;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Duration, Hours, SLA cells */
    .duration-cell,
    .hours-cell,
    .sla-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .duration-cell mat-icon,
    .hours-cell mat-icon,
    .sla-cell mat-icon {
      color: #6b7280;
      font-size: 20px;
      width: 20px;
      height: 20px;
      vertical-align: middle;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .sla-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
      color: #6b7280;
    }

    .text-muted {
      color: #9ca3af;
    }

    /* Chips */
    mat-chip-set {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    mat-chip {
      font-size: 11px;
      height: 24px;
      padding: 0 8px;
      display: inline-flex;
      align-items: center;
    }

    mat-chip mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-right: 4px;
    }

    /* Actions */
    .mat-icon-button {
      color: #6b7280;
      width: 36px;
      height: 36px;
      border-radius: 8px;
    }

    .mat-icon-button:hover {
      color: #374151;
      background-color: rgba(37,99,235,0.06);
    }

    .mat-icon-button .mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .delete-action {
      color: #dc2626;
    }

    .delete-action .mat-icon {
      color: #dc2626;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }

      .header-actions {
        width: 100%;
      }

      .header-actions button {
        flex: 1;
      }

      .task-types-table {
        font-size: 13px;
      }
    }
  `]
})
export class TaskTypesManagerComponent implements OnInit {
  taskTypes = signal<TaskType[]>([]);
  isLoading = signal(true);
  displayedColumns: string[] = ['icon', 'duration', 'workingHours', 'sla', 'settings', 'actions'];

  constructor(
    private taskTypeService: TaskTypeService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadTaskTypes();
  }

  loadTaskTypes() {
    this.isLoading.set(true);
    this.taskTypeService.getAll(true).subscribe({
      next: (types) => {
        this.taskTypes.set(types.sort((a, b) => a.sortOrder - b.sortOrder));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load task types', err);
        this.isLoading.set(false);
        this.snackBar.open('Ошибка при загрузке типов задач', 'Закрыть', { duration: 5000 });
      }
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(TaskTypeDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskTypeService.create(result).subscribe({
          next: () => {
            this.snackBar.open('Тип задачи успешно создан', 'Закрыть', { duration: 3000 });
            this.loadTaskTypes();
          },
          error: (err) => {
            console.error('Failed to create task type', err);
            this.snackBar.open('Ошибка при создании типа задачи', 'Закрыть', { duration: 5000 });
          }
        });
      }
    });
  }

  editType(type: TaskType) {
    const dialogRef = this.dialog.open(TaskTypeDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        mode: 'edit',
        taskType: type
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskTypeService.update(type.id, result).subscribe({
          next: () => {
            this.snackBar.open('Тип задачи успешно обновлен', 'Закрыть', { duration: 3000 });
            this.loadTaskTypes();
          },
          error: (err) => {
            console.error('Failed to update task type', err);
            this.snackBar.open('Ошибка при обновлении типа задачи', 'Закрыть', { duration: 5000 });
          }
        });
      }
    });
  }

  duplicateType(type: TaskType) {
    const duplicated = {
      ...type,
      name: `${type.name} (копия)`,
      id: undefined
    };

    const dialogRef = this.dialog.open(TaskTypeDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        mode: 'create',
        taskType: duplicated
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskTypeService.create(result).subscribe({
          next: () => {
            this.snackBar.open('Тип задачи успешно дублирован', 'Закрыть', { duration: 3000 });
            this.loadTaskTypes();
          },
          error: (err) => {
            console.error('Failed to duplicate task type', err);
            this.snackBar.open('Ошибка при дублировании типа задачи', 'Закрыть', { duration: 5000 });
          }
        });
      }
    });
  }

  toggleActive(type: TaskType) {
    this.taskTypeService.update(type.id, { isActive: !type.isActive }).subscribe({
      next: () => {
        this.snackBar.open(
          type.isActive ? 'Тип задачи деактивирован' : 'Тип задачи активирован',
          'Закрыть',
          { duration: 3000 }
        );
        this.loadTaskTypes();
      },
      error: (err) => {
        console.error('Failed to toggle active status', err);
        this.snackBar.open('Ошибка при изменении статуса', 'Закрыть', { duration: 5000 });
      }
    });
  }

  deleteType(type: TaskType) {
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px',
      data: {
        title: 'Удалить тип задачи',
        message: `Вы уверены, что хотите удалить тип задачи "${type.name}"?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      this.taskTypeService.remove(type.id).subscribe({
        next: () => {
          this.snackBar.open('Тип задачи успешно удален', 'Закрыть', { duration: 3000 });
          this.loadTaskTypes();
        },
        error: (err) => {
          console.error('Failed to delete task type', err);
          this.snackBar.open('Ошибка при удалении типа задачи', 'Закрыть', { duration: 5000 });
        }
      });
    });
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} мин`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} ч`;
    }
    return `${hours} ч ${mins} мин`;
  }
}
