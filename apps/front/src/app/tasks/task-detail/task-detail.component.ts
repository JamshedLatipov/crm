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
import { TasksService, TaskDto, TaskComment } from '../tasks.service';
import { AuthService } from '../../auth/auth.service';
import { UsersService, User } from '../../users/users.service';
import { HumanDatePipe } from '../../shared/pipes/human-date.pipe';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { TaskDueDateComponent } from '../components/task-due-date/task-due-date.component';
import { TaskTypeDisplayComponent } from '../components/task-type-display/task-type-display.component';
import { AssignUserDialogComponent } from '../../deals/components/assign-user-dialog.component';

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
    RelativeTimePipe,
    TaskDueDateComponent,
    TaskTypeDisplayComponent
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
  
  task = signal<TaskDto | null>(null);
  comments = signal<TaskComment[]>([]);
  isLoading = signal(true);
  isLoadingComments = signal(false);
  managers = signal<User[]>([]);
  isLoadingManagers = signal(false);

  // Description expand/collapse
  descExpanded = signal<boolean>(false);
  
  newCommentText = '';
  isSendingComment = false;
  
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
      this.loadComments();
      this.loadManagers();
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
  
  loadComments() {
    if (!this.taskId) return;
    
    this.isLoadingComments.set(true);
    this.tasksService.getComments(this.taskId).subscribe({
      next: (comments) => {
        this.comments.set(comments);
        this.isLoadingComments.set(false);
      },
      error: (err) => {
        console.error('Error loading comments:', err);
        this.isLoadingComments.set(false);
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
  
  sendComment() {
    if (!this.newCommentText.trim() || !this.taskId) return;
    
    const userData = this.auth.getUserData();
    if (!userData?.sub) {
      this.snackBar.open('Необходимо авторизоваться', 'OK', { duration: 3000 });
      return;
    }
    
    this.isSendingComment = true;
    this.tasksService.addComment(this.taskId, userData.sub, this.newCommentText).subscribe({
      next: (comment) => {
        console.log('Comment received:', comment);
        this.comments.update(comments => [...comments, comment]);
        this.newCommentText = '';
        this.isSendingComment = false;
        this.snackBar.open('Комментарий добавлен', 'OK', { duration: 2000 });
      },
      error: (err) => {
        console.error('Error sending comment:', err);
        this.snackBar.open('Ошибка отправки комментария', 'OK', { duration: 3000 });
        this.isSendingComment = false;
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
}
