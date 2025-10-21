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
import { MatSnackBar } from '@angular/material/snack-bar';
import { TasksService, TaskDto, TaskComment } from './tasks.service';
import { AuthService } from '../auth/auth.service';

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
    MatSelectModule
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
  
  task = signal<TaskDto | null>(null);
  comments = signal<TaskComment[]>([]);
  isLoading = signal(true);
  isLoadingComments = signal(false);

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
        this.comments.update(comments => [...comments, comment]);
        this.newCommentText = '';
        this.isSendingComment = false;
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
}
