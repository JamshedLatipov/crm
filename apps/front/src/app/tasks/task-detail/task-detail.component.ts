import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TasksService, TaskDto, TaskHistory } from '../tasks.service';
import { AuthService } from '../../auth/auth.service';
import { UsersService, User } from '../../users/users.service';
import { HumanDatePipe } from '../../shared/pipes/human-date.pipe';
import { TaskDueDateComponent } from '../components/task-due-date/task-due-date.component';
import { TaskTypeDisplayComponent } from '../components/task-type-display/task-type-display.component';
import { AssignUserDialogComponent } from '../../deals/components/assign-user-dialog.component';
import { CommentsComponent } from '../../shared/components/comments/comments.component';
import { CommentEntityType } from '../../shared/interfaces/comment.interface';

// Интерфейс данных для модалки назначения исполнителя (адаптирован для задач)
interface AssignUserDialogData {
  task: TaskDto;
  currentUsers: User[];
}

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatTabsModule,
    MatTabsModule,
    MatMenuModule,
    MatDialogModule,
    HumanDatePipe,
    TaskDueDateComponent,
    TaskTypeDisplayComponent,
    CommentsComponent
  ],
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.scss']
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tasksService = inject(TasksService);
  private snackBar = inject(MatSnackBar);
  private auth = inject(AuthService);
  private usersService = inject(UsersService);
  private dialog = inject(MatDialog);
  
  // Enum для использования в шаблоне
  readonly CommentEntityType = CommentEntityType;
  
  task = signal<TaskDto | null>(null);
  isLoading = signal(true);
  managers = signal<User[]>([]);
  isLoadingManagers = signal(false);

  // History
  taskHistory = signal<TaskHistory[]>([]);
  isLoadingHistory = signal(false);

  // Description expand/collapse
  descExpanded = signal<boolean>(false);
  
  taskId?: number;

  // Статусы для выбора
  statusOptions = [
    { value: 'pending', label: 'В ожидании', color: '#f59e0b' },
    { value: 'in_progress', label: 'В работе', color: '#3b82f6' },
    { value: 'done', label: 'Завершено', color: '#10b981' },
    { value: 'overdue', label: 'Просрочено', color: '#ef4444' }
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.taskId = Number(id);
      this.loadTask();
      this.loadManagers();
      this.loadHistory();
    } else {
      this.router.navigate(['/tasks']);
    }
  }

  toggleDesc() {
    this.descExpanded.update(v => !v);
  }
  
  loadTask() {
    if (!this.taskId) return;
    
    this.isLoading.set(true);
    this.tasksService.get(this.taskId).subscribe({
      next: (task) => {
        this.task.set(task);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading task:', err);
        this.snackBar.open('Ошибка загрузки задачи', 'OK', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }
  
  loadManagers() {
    this.isLoadingManagers.set(true);
    this.usersService.getAllManagers().subscribe({
      next: (managers) => {
        this.managers.set(managers);
        this.isLoadingManagers.set(false);
      },
      error: (err) => {
        console.error('Error loading managers:', err);
        this.snackBar.open('Ошибка загрузки списка менеджеров', 'OK', { duration: 3000 });
        this.isLoadingManagers.set(false);
      }
    });
  }

  loadHistory() {
    if (!this.taskId) return;

    this.isLoadingHistory.set(true);
    this.tasksService.getHistory(this.taskId).subscribe({
      next: (history) => {
        this.taskHistory.set(history);
        this.isLoadingHistory.set(false);
      },
      error: (err) => {
        console.error('Error loading task history:', err);
        this.snackBar.open('Ошибка загрузки истории задачи', 'OK', { duration: 3000 });
        this.isLoadingHistory.set(false);
      }
    });
  }
  
  editTask() {
    if (this.taskId) {
      this.router.navigate([`/tasks/edit/${this.taskId}`]);
    }
  }
  
  deleteTask() {
    if (!this.taskId) return;
    
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
      this.tasksService.delete(this.taskId).subscribe({
        next: () => {
          this.snackBar.open('Задача удалена', 'OK', { duration: 3000 });
          this.router.navigate(['/tasks']);
        },
        error: (err) => {
          console.error('Error deleting task:', err);
          this.snackBar.open('Ошибка удаления задачи', 'OK', { duration: 3000 });
        }
      });
    }
  }
  
  goBack() {
    this.router.navigate(['/tasks']);
  }

  assignTask(managerId?: string) {
    if (!this.task()) return;

    if (managerId) {
      // Прямое назначение (для обратной совместимости)
      this.doAssignTask(managerId);
    } else {
      // Открываем модалку для выбора исполнителя
      const dialogData: AssignUserDialogData = {
        task: this.task()!,
        currentUsers: this.managers()
      };

      const dialogRef = this.dialog.open(AssignUserDialogComponent, {
        data: dialogData,
        width: '600px',
        maxWidth: '95vw',
        maxHeight: '85vh',
        disableClose: false
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result && result.userId) {
          this.doAssignTask(result.userId);
        }
      });
    }
  }

  private doAssignTask(managerId: string) {
    if (!this.taskId) return;

    const updateData: Partial<TaskDto> = managerId
      ? { assignedToId: Number(managerId) }
      : { assignedToId: undefined };

    this.tasksService.update(this.taskId, updateData).subscribe({
      next: (updatedTask) => {
        this.task.set(updatedTask);
        this.snackBar.open(
          managerId ? 'Исполнитель назначен' : 'Назначение снято',
          'OK',
          { duration: 2000 }
        );
      },
      error: (err) => {
        console.error('Error assigning task:', err);
        this.snackBar.open('Ошибка изменения исполнителя', 'OK', { duration: 3000 });
      }
    });
  }

  completeTask() {
    this.changeStatus('done');
  }

  changeStatus(newStatus: string) {
    if (!this.taskId || !this.task()) return;
    
    this.tasksService.update(this.taskId, { status: newStatus }).subscribe({
      next: (updatedTask) => {
        this.task.set(updatedTask);
        this.snackBar.open('Статус обновлён', 'OK', { duration: 2000 });
      },
      error: (err) => {
        console.error('Error updating status:', err);
        this.snackBar.open('Ошибка обновления статуса', 'OK', { duration: 3000 });
      }
    });
  }
  
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'warn',
      in_progress: 'accent',
      done: 'primary',
      overdue: 'warn'
    };
    return colors[status] || 'default';
  }
  
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'В ожидании',
      in_progress: 'В работе',
      done: 'Завершено',
      overdue: 'Просрочено'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'pending',
      in_progress: 'in-progress',
      done: 'success',
      overdue: 'warning'
    };
    return classes[status] || 'pending';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'schedule',
      in_progress: 'play_arrow',
      done: 'check_circle',
      overdue: 'warning'
    };
    return icons[status] || 'schedule';
  }

  isOverdue(dueDate: string | Date | undefined): boolean {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < now;
  }

  // History methods
  getHistoryIcon(action: string): string {
    const icons: Record<string, string> = {
      created: 'add_circle_outline',
      updated: 'edit_note',
      status_changed: 'swap_horizontal_circle',
      deleted: 'delete_outline'
    };
    return icons[action] || 'info_outline';
  }

  getHistoryIconClass(action: string): string {
    const classes: Record<string, string> = {
      created: 'created',
      updated: 'updated',
      status_changed: 'status-changed',
      deleted: 'deleted'
    };
    return classes[action] || 'default';
  }

  getHistoryCardClass(action: string): string {
    const classes: Record<string, string> = {
      created: 'card-created',
      updated: 'card-updated',
      status_changed: 'card-status-changed',
      deleted: 'card-deleted'
    };
    return classes[action] || 'card-default';
  }

  getHistoryActionText(item: TaskHistory): string {
    const actions: Record<string, string> = {
      created: 'Задача создана',
      updated: 'Задача обновлена',
      status_changed: 'Статус изменён',
      deleted: 'Задача удалена'
    };
    return actions[item.action] || item.action;
  }

  getDetailKeys(details: any): string[] {
    return Object.keys(details || {});
  }

  getFieldDisplayName(key: string): string {
    const names: Record<string, string> = {
      title: 'Название',
      description: 'Описание',
      status: 'Статус',
      dueDate: 'Срок выполнения',
      assignedTo: 'Исполнитель',
      assignedToId: 'Исполнитель',
      leadId: 'Лид ID',
      dealId: 'Сделка ID',
      taskTypeId: 'Тип задачи ID'
    };
    return names[key] || key;
  }

  getChangeTypeClass(change: any): string {
    if (!change) return 'change-unknown';
    if (change.old !== undefined && change.new !== undefined) return 'change-modified';
    if (change.old !== undefined && change.new === undefined) return 'change-removed';
    if (change.old === undefined && change.new !== undefined) return 'change-added';
    return 'change-unknown';
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'не указано';
    if (typeof value === 'boolean') return value ? 'да' : 'нет';
    
    // Форматирование статусов
    if (typeof value === 'string') {
      const statusLabels: Record<string, string> = {
        'pending': 'В ожидании',
        'in_progress': 'В работе',
        'done': 'Завершено',
        'overdue': 'Просрочено'
      };
      if (statusLabels[value]) {
        return statusLabels[value];
      }
      
      // Если это дата в ISO формате
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return new Date(value).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    
    // Для числовых значений (например, ID менеджера)
    if (typeof value === 'number') {
      // Пытаемся найти пользователя по ID (конвертируем в строку для сравнения)
      const manager = this.managers().find(m => m.id === String(value));
      if (manager) {
        return manager.name;
      }
      return String(value);
    }
    
    if (typeof value === 'object') {
      // Если это дата в формате ISO, форматируем её
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return new Date(value).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  }
}
