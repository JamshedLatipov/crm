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
import { MatSnackBar } from '@angular/material/snack-bar';
import { TasksService, TaskDto, TaskComment } from './tasks.service';
import { AuthService } from '../auth/auth.service';
import { HumanDatePipe } from '../shared/pipes/human-date.pipe';
import { RelativeTimePipe } from '../shared/pipes/relative-time.pipe';

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
    HumanDatePipe,
    RelativeTimePipe
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

  // Определяет класс для дедлайна в зависимости от срока и настроек типа задачи
  getDueDateClass(dueDate: string, status: string): string {
    // Проверяем, была ли задача просрочена при закрытии
    if (status === 'done') {
      const task = this.task();
      if (task?.updatedAt && task?.dueDate) {
        const closedAt = new Date(task.updatedAt);
        const due = new Date(task.dueDate);
        if (closedAt > due) {
          return 'due-date-done-late'; // Закрыта с опозданием
        }
      }
      return 'due-date-done'; // Закрыта вовремя
    }
    
    const task = this.task();
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    // Если есть тип задачи с настройками
    if (task?.taskType?.timeFrameSettings) {
      const settings = task.taskType.timeFrameSettings;
      
      // Проверяем SLA (приоритет выше остальных), только если еще не просрочено
      if (settings.slaResponseTime && diffMinutes > 0 && diffMinutes < settings.slaResponseTime) {
        return 'due-date-sla-warning';
      }
      
      // Проверяем предупреждение перед дедлайном, только если еще не просрочено
      if (settings.warningBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.warningBeforeDeadline) {
        return 'due-date-warning-zone';
      }
      
      // Проверяем напоминание, только если еще не просрочено
      if (settings.reminderBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.reminderBeforeDeadline) {
        return 'due-date-reminder';
      }
    }
    
    // Стандартная логика
    if (diffDays < 0) return 'due-date-overdue';
    if (diffDays <= 1) return 'due-date-urgent';
    if (diffDays <= 3) return 'due-date-soon';
    return 'due-date-normal';
  }

  // Определяет иконку для дедлайна с учетом настроек типа
  getDueDateIcon(dueDate: string, status: string): string {
    // Проверяем, была ли задача просрочена при закрытии
    if (status === 'done') {
      const task = this.task();
      if (task?.updatedAt && task?.dueDate) {
        const closedAt = new Date(task.updatedAt);
        const due = new Date(task.dueDate);
        if (closedAt > due) {
          return 'schedule'; // Иконка часов для закрытых с опозданием
        }
      }
      return 'check_circle'; // Галочка для закрытых вовремя
    }
    
    const task = this.task();
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    // Если есть настройки типа задачи
    if (task?.taskType?.timeFrameSettings) {
      const settings = task.taskType.timeFrameSettings;
      
      if (settings.slaResponseTime && diffMinutes > 0 && diffMinutes < settings.slaResponseTime) {
        return 'flash_on'; // SLA критично
      }
      
      if (settings.warningBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.warningBeforeDeadline) {
        return 'warning_amber'; // Предупреждение
      }
      
      if (settings.reminderBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.reminderBeforeDeadline) {
        return 'notifications_active'; // Напоминание
      }
    }
    if (diffMinutes < 0) return 'error';
    if (diffDays < 0) return 'error'; // Эмодзи для просроченных задач
    if (diffDays <= 1) return 'warning';
    return 'event';
  }

  // Возвращает человекочитаемое относительное время с учетом настроек типа
  getRelativeDueDate(dueDate: string, status: string): string {
    if (status === 'done') return 'Завершено';
    
    const task = this.task();
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    // Если есть настройки типа задачи - показываем более детальную информацию
    if (task?.taskType?.timeFrameSettings) {
      const settings = task.taskType.timeFrameSettings;
      
      // SLA критично
      if (settings.slaResponseTime && diffMinutes < settings.slaResponseTime && diffMinutes > 0) {
        const minutesLeft = diffMinutes;
        if (minutesLeft < 60) {
          return `SLA: осталось ${minutesLeft} мин`;
        }
        const hours = Math.floor(minutesLeft / 60);
        const mins = minutesLeft % 60;
        return `SLA: ${hours}ч ${mins}мин до нарушения`;
      }
      
      // Предупреждение
      if (settings.warningBeforeDeadline && diffMinutes < settings.warningBeforeDeadline && diffMinutes > 0) {
        if (diffMinutes < 60) {
          return `Осталось ${diffMinutes} мин до дедлайна`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        if (mins > 0) {
          return `Осталось ${hours} ${this.getHoursText(hours)} ${mins} мин до дедлайна`;
        }
        return `Осталось ${hours} ${this.getHoursText(hours)} до дедлайна`;
      }
      
      // Напоминание
      if (settings.reminderBeforeDeadline && diffMinutes < settings.reminderBeforeDeadline && diffMinutes > 0) {
        if (diffMinutes < 60) {
          return `Напоминание: ${diffMinutes} мин`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        if (mins > 0) {
          return `Напоминание: ${hours}ч ${mins}мин`;
        }
        return `Напоминание: ${hours}ч`;
      }
    }
    
    // Стандартная логика - проверяем по минутам для точности
    if (diffMinutes < 0) {
      const overdueMins = Math.abs(diffMinutes);
      if (overdueMins < 60) {
        return `Просрочено на ${overdueMins} мин`;
      }
      if (overdueMins < 1440) { // Меньше суток
        const hours = Math.floor(overdueMins / 60);
        const mins = overdueMins % 60;
        if (mins > 0) {
          return `Просрочено на ${hours}ч ${mins}мин`;
        }
        return `Просрочено на ${hours}ч`;
      }
      const overdueDays = Math.floor(overdueMins / 1440);
      if (overdueDays === 1) return 'Просрочено на 1 день';
      if (overdueDays < 5) return `Просрочено на ${overdueDays} дня`;
      return `Просрочено на ${overdueDays} дней`;
    }
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    if (diffDays === 2) return 'Послезавтра';
    if (diffDays <= 7) return `Через ${diffDays} дней`;
    if (diffDays <= 14) return 'Через неделю';
    if (diffDays <= 30) return `Через ${Math.floor(diffDays / 7)} недели`;
    
    const months = Math.floor(diffDays / 30);
    if (months === 1) return 'Через месяц';
    return `Через ${months} месяца`;
  }

  // Возвращает текст подсказки для иконки дедлайна
  getDueDateTooltip(dueDate: string, status: string): string {
    if (status === 'done') {
      // Проверяем, была ли задача просрочена при закрытии
      const task = this.task();
      if (task?.updatedAt && task?.dueDate) {
        const closedAt = new Date(task.updatedAt);
        const due = new Date(task.dueDate);
        if (closedAt > due) {
          const diffMs = closedAt.getTime() - due.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          if (diffHours < 24) {
            const hours = diffHours;
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (hours > 0) {
              return `⚠️ Задача закрыта с опозданием на ${hours} ${this.getHoursText(hours)} ${minutes} мин`;
            }
            return `⚠️ Задача закрыта с опозданием на ${minutes} мин`;
          }
          return `⚠️ Задача закрыта с опозданием на ${diffDays} ${diffDays === 1 ? 'день' : 'дней'}`;
        }
      }
      return '✅ Задача завершена вовремя';
    }

    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));

    const currentTask = this.task();
    
    // Если есть настройки типа задачи
    if (currentTask?.taskType?.timeFrameSettings) {
      const settings = currentTask.taskType.timeFrameSettings;

      // SLA критично - только если еще не просрочено
      if (settings.slaResponseTime && diffMinutes > 0 && diffMinutes < settings.slaResponseTime) {
        return `⚡ Критично! Осталось ${diffMinutes} мин до нарушения SLA (${settings.slaResponseTime} мин)`;
      }

      // Предупреждение - только если еще не просрочено
      if (settings.warningBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.warningBeforeDeadline) {
        if (diffMinutes < 60) {
          const warningHours = Math.floor(settings.warningBeforeDeadline / 60);
          return `⚠️ Предупреждение! До дедлайна осталось ${diffMinutes} мин - зона предупреждения (${warningHours}ч)`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const warningHours = Math.floor(settings.warningBeforeDeadline / 60);
        if (mins > 0) {
          return `⚠️ Предупреждение! До дедлайна осталось ${hours}ч ${mins}мин - зона предупреждения (${warningHours}ч)`;
        }
        return `⚠️ Предупреждение! До дедлайна осталось ${hours}ч - зона предупреждения (${warningHours}ч)`;
      }

      // Напоминание - только если еще не просрочено
      if (settings.reminderBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.reminderBeforeDeadline) {
        if (diffMinutes < 60) {
          const reminderHours = Math.floor(settings.reminderBeforeDeadline / 60);
          return `🔔 Напоминание: до дедлайна осталось ${diffMinutes} мин - зона напоминания (${reminderHours}ч)`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const reminderHours = Math.floor(settings.reminderBeforeDeadline / 60);
        if (mins > 0) {
          return `🔔 Напоминание: до дедлайна осталось ${hours}ч ${mins}мин - зона напоминания (${reminderHours}ч)`;
        }
        return `🔔 Напоминание: до дедлайна осталось ${hours}ч - зона напоминания (${reminderHours}ч)`;
      }
    }

    // Стандартные подсказки
    if (diffMinutes < 0) {
      const absDiffMs = Math.abs(diffMs);
      const totalMinutes = Math.floor(absDiffMs / (1000 * 60));
      
      if (totalMinutes < 60) {
        return `❌ Просрочено на ${totalMinutes} мин`;
      }
      
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      
      if (hours < 24) {
        if (mins > 0) {
          return `❌ Просрочено на ${hours} ${this.getHoursText(hours)} ${mins} мин`;
        }
        return `❌ Просрочено на ${hours} ${this.getHoursText(hours)}`;
      }
      
      const days = Math.floor(totalMinutes / (60 * 24));
      return `❌ Просрочено на ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
    }

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return '🔥 Дедлайн сегодня!';
    }
    if (diffDays === 1) {
      return '⚠️ Дедлайн завтра';
    }
    if (diffDays <= 3) {
      return `⚠️ Скоро дедлайн - через ${diffDays} дня`;
    }
    
    return `📅 До дедлайна осталось ${diffDays} ${diffDays === 1 ? 'день' : 'дней'}`;
  }

  // Склонение часов
  private getHoursText(hours: number): string {
    if (hours === 1) return 'час';
    if (hours >= 2 && hours <= 4) return 'часа';
    return 'часов';
  }
}
