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
import { AssignmentService } from '../../services/assignment.service';
import { HumanDatePipe } from '../../shared/pipes/human-date.pipe';
import { TaskDueDateComponent } from '../components/task-due-date/task-due-date.component';
import { AssignUserDialogComponent } from '../../deals/components/assign-user-dialog.component';
import { CommentsComponent } from '../../shared/components/comments/comments.component';
import { CommentEntityType } from '../../shared/interfaces/comment.interface';
import { TaskHeaderComponent } from './components/task-header/task-header.component';
import { TaskHistoryComponent } from './components/task-history/task-history.component';

// Интерфейс данных для модалки назначения исполнителя (адаптирован для задач)
interface AssignUserDialogData {
  task: TaskDto;
  currentUsers: User[];
}

export interface Status {
  value: string;
  label: string;
  color: string;
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
    MatMenuModule,
    MatDialogModule,
    HumanDatePipe,
    TaskDueDateComponent,
    CommentsComponent,
    TaskHeaderComponent,
    TaskHistoryComponent,
  ],
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.scss'],
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tasksService = inject(TasksService);
  private snackBar = inject(MatSnackBar);
  private auth = inject(AuthService);
  private usersService = inject(UsersService);
  private dialog = inject(MatDialog);
  private assignmentService = inject(AssignmentService);

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
  statusOptions: Status[] = [
    { value: 'pending', label: 'В ожидании', color: '#f59e0b' },
    { value: 'in_progress', label: 'В работе', color: '#3b82f6' },
    { value: 'done', label: 'Завершено', color: '#10b981' },
    { value: 'overdue', label: 'Просрочено', color: '#ef4444' },
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
    this.descExpanded.update((v) => !v);
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
      },
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
        this.snackBar.open('Ошибка загрузки списка менеджеров', 'OK', {
          duration: 3000,
        });
        this.isLoadingManagers.set(false);
      },
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
        this.snackBar.open('Ошибка загрузки истории задачи', 'OK', {
          duration: 3000,
        });
        this.isLoadingHistory.set(false);
      },
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
          this.snackBar.open('Ошибка удаления задачи', 'OK', {
            duration: 3000,
          });
        },
      });
    }
  }

  goBack() {
    this.router.navigate(['/tasks']);
  }

  assignTask() {
    if (!this.task()) return;

    // Открываем модалку для выбора исполнителя
    const dialogData: AssignUserDialogData = {
      task: this.task()!,
      currentUsers: this.managers(),
    };

    const dialogRef = this.dialog.open(AssignUserDialogComponent, {
      data: dialogData,
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '85vh',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.userId) {
        this.doAssignTask(result.userId);
      }
    });
  }

  private doAssignTask(managerId: string) {
    if (!this.taskId) return;
    // Use centralized assignments table for task assignment
    const currentUserId = Number(this.auth.getUserId() || 0);

    if (managerId) {
      const req = {
        entityType: 'task' as const,
        entityId: this.taskId!,
        assignedTo: [Number(managerId)],
        assignedBy: currentUserId,
        reason: undefined,
        notifyAssignees: true,
      };

      this.assignmentService.assignResponsible(req).subscribe({
        next: (res) => {
          // refresh task and history to reflect assignment
          this.loadTask();
          this.loadHistory();
          this.snackBar.open('Исполнитель назначен', 'OK', { duration: 2000 });
        },
        error: (err) => {
          console.error('Error assigning task via assignments:', err);
          this.snackBar.open('Ошибка назначения исполнителя', 'OK', { duration: 3000 });
        }
      });
    } else {
      // Unassign: try to remove active assignments for this task (if any)
      // First fetch current assignments for this task to get user ids
      this.assignmentService.getCurrentAssignments('task', this.taskId!).subscribe({
        next: (users) => {
          const userIds = users.map(u => u.id.toString());
          if (userIds.length === 0) {
            // nothing to unassign, still clear task locally
            this.tasksService.update(this.taskId!, { assignedToId: undefined }).subscribe({ next: () => this.loadTask() });
            this.snackBar.open('Назначение снято', 'OK', { duration: 2000 });
            return;
          }

          this.assignmentService.unassignResponsible('task', this.taskId!, userIds).subscribe({
            next: () => {
              this.loadTask();
              this.loadHistory();
              this.snackBar.open('Назначение снято', 'OK', { duration: 2000 });
            },
            error: (err) => {
              console.error('Error unassigning via assignments:', err);
              this.snackBar.open('Ошибка снятия назначения', 'OK', { duration: 3000 });
            }
          });
        },
        error: (err) => {
          console.error('Error loading current assignments for unassign:', err);
          this.snackBar.open('Не удалось получить текущие назначения', 'OK', { duration: 3000 });
        }
      });
    }
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
        this.snackBar.open('Ошибка обновления статуса', 'OK', {
          duration: 3000,
        });
      },
    });
  }
}
