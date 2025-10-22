import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { TasksService } from './tasks.service';
import { RouterModule, Router } from '@angular/router';
import { HumanDatePipe } from '../shared/pipes/human-date.pipe';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  assignedTo?: any;
  taskTypeId?: number;
  taskType?: {
    id: number;
    name: string;
    color?: string;
    icon?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatMenuModule,
    MatChipsModule,
    MatPaginatorModule,
    MatSortModule,
    HumanDatePipe
  ],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent implements OnInit {
  tasks = signal<Task[]>([]);
  filteredTasks = signal<Task[]>([]);
  paginatedTasks = signal<Task[]>([]);
  isLoading = signal(true);
  
  searchQuery = '';
  selectedStatus: string | null = null;
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalResults = 0;
  
  // Stats
  stats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    done: 0,
    overdue: 0
  };
  
  displayedColumns: string[] = ['title', 'taskType', 'status', 'assignedTo', 'dueDate', 'actions'];
  
  constructor(private tasksService: TasksService, private router: Router) {}

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.isLoading.set(true);
    this.tasksService.list().subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res.items || res.data || []);
        this.tasks.set(data);
        this.updateStats(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
  
  updateStats(tasks: Task[]) {
    this.stats.total = tasks.length;
    this.stats.pending = tasks.filter(t => t.status === 'pending').length;
    this.stats.inProgress = tasks.filter(t => t.status === 'in_progress').length;
    this.stats.done = tasks.filter(t => t.status === 'done').length;
    this.stats.overdue = tasks.filter(t => t.status === 'overdue').length;
  }
  
  applyFilters() {
    let filtered = this.tasks();
    
    if (this.selectedStatus) {
      filtered = filtered.filter(t => t.status === this.selectedStatus);
    }
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    this.filteredTasks.set(filtered);
    this.totalResults = filtered.length;
    this.updatePaginatedTasks();
  }
  
  updatePaginatedTasks() {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedTasks.set(this.filteredTasks().slice(start, end));
  }
  
  onSearchChange() {
    this.currentPage = 0;
    this.applyFilters();
  }
  
  onStatusTabChange(status: string | null) {
    this.selectedStatus = status;
    this.currentPage = 0;
    this.applyFilters();
  }
  
  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedTasks();
  }

  onSortChange(sort: Sort) {
    const data = this.filteredTasks().slice();
    
    if (!sort.active || sort.direction === '') {
      this.filteredTasks.set(data);
      this.updatePaginatedTasks();
      return;
    }

    const sortedData = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      
      switch (sort.active) {
        case 'title':
          return this.compare(a.title || '', b.title || '', isAsc);
        case 'status':
          return this.compare(a.status || '', b.status || '', isAsc);
        case 'dueDate':
          return this.compare(a.dueDate || '', b.dueDate || '', isAsc);
        case 'assignedTo':
          const nameA = a.assignedTo ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}` : '';
          const nameB = b.assignedTo ? `${b.assignedTo.firstName} ${b.assignedTo.lastName}` : '';
          return this.compare(nameA, nameB, isAsc);
        case 'taskType':
          return this.compare(a.taskType?.name || '', b.taskType?.name || '', isAsc);
        case 'createdAt':
          return this.compare(a.createdAt || '', b.createdAt || '', isAsc);
        default:
          return 0;
      }
    });

    this.filteredTasks.set(sortedData);
    this.updatePaginatedTasks();
  }

  private compare(a: string | number, b: string | number, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
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

  getStatusConfig(status: string) {
    const map: Record<string, any> = {
      pending: { label: 'В ожидании', icon: 'pending', styles: { 'background': '#fff7ed', 'border': '1px solid #f59e0b', 'color': '#b45309' } },
      in_progress: { label: 'В работе', icon: 'play_circle', styles: { 'background': '#e8f0ff', 'border': '1px solid #3b82f6', 'color': '#2563eb' } },
      done: { label: 'Завершено', icon: 'check_circle', styles: { 'background': '#ecfdf5', 'border': '1px solid #10b981', 'color': '#047857' } },
      overdue: { label: 'Просрочено', icon: 'warning', styles: { 'background': '#fff1f2', 'border': '1px solid #ef4444', 'color': '#b91c1c' } }
    };
    return map[status] || { label: status, icon: 'help', styles: { 'background': 'transparent', 'border': '1px solid #e5e7eb', 'color': 'inherit' } };
  }

  // Определяет класс для дедлайна в зависимости от срока и настроек типа задачи
  getDueDateClass(dueDate: string, status: string, task?: any): string {
    // Проверяем, была ли задача просрочена при закрытии
    if (status === 'done') {
      if (task?.updatedAt && task?.dueDate) {
        const closedAt = new Date(task.updatedAt);
        const due = new Date(task.dueDate);
        if (closedAt > due) {
          return 'due-date-done-late'; // Закрыта с опозданием
        }
      }
      return 'due-date-done'; // Закрыта вовремя
    }
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    // Если есть тип задачи с настройками
    if (task?.taskType?.timeFrameSettings) {
      const settings = task.taskType.timeFrameSettings;
      
      // Проверяем SLA (приоритет выше остальных)
      if (settings.slaResponseTime && diffMinutes < settings.slaResponseTime) {
        return 'due-date-sla-warning';
      }
      
      // Проверяем предупреждение перед дедлайном
      if (settings.warningBeforeDeadline && diffMinutes < settings.warningBeforeDeadline) {
        return 'due-date-warning-zone';
      }
      
      // Проверяем напоминание
      if (settings.reminderBeforeDeadline && diffMinutes < settings.reminderBeforeDeadline) {
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
  getDueDateIcon(dueDate: string, status: string, task?: any): string {
    // Проверяем, была ли задача просрочена при закрытии
    if (status === 'done') {
      if (task?.updatedAt && task?.dueDate) {
        const closedAt = new Date(task.updatedAt);
        const due = new Date(task.dueDate);
        if (closedAt > due) {
          return 'schedule'; // Иконка часов для закрытых с опозданием
        }
      }
      return 'check_circle'; // Галочка для закрытых вовремя
    }
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    // Если есть настройки типа задачи
    if (task?.taskType?.timeFrameSettings) {
      const settings = task.taskType.timeFrameSettings;
      
      if (settings.slaResponseTime && diffMinutes < settings.slaResponseTime) {
        return 'flash_on'; // SLA критично
      }
      
      if (settings.warningBeforeDeadline && diffMinutes < settings.warningBeforeDeadline) {
        return 'warning_amber'; // Предупреждение
      }
      
      if (settings.reminderBeforeDeadline && diffMinutes < settings.reminderBeforeDeadline) {
        return 'notifications_active'; // Напоминание
      }
    }
    
    if (diffDays < 0) return 'error';
    if (diffDays <= 1) return 'warning';
    return 'event';
  }

  // Возвращает человекочитаемое относительное время с учетом настроек типа
  getRelativeDueDate(dueDate: string, status: string, task?: any): string {
    if (status === 'done') return 'Завершено';
    
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
          return `SLA: ${minutesLeft} мин`;
        }
        const hours = Math.floor(minutesLeft / 60);
        const mins = minutesLeft % 60;
        return `SLA: ${hours}ч ${mins}мин`;
      }
      
      // Предупреждение
      if (settings.warningBeforeDeadline && diffMinutes < settings.warningBeforeDeadline && diffMinutes > 0) {
        if (diffMinutes < 60) {
          return `${diffMinutes} мин до дедлайна`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        if (mins > 0) {
          return `${hours} ${this.getHoursText(hours)} ${mins} мин до дедлайна`;
        }
        return `${hours} ${this.getHoursText(hours)} до дедлайна`;
      }
      
      // Напоминание
      if (settings.reminderBeforeDeadline && diffMinutes < settings.reminderBeforeDeadline && diffMinutes > 0) {
        if (diffMinutes < 60) {
          return `${diffMinutes} мин`;
        }
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        if (mins > 0) {
          return `${hours}ч ${mins}мин`;
        }
        return `${hours}ч`;
      }
    }
    
    // Стандартная логика
    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
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
  getDueDateTooltip(dueDate: string, status: string, task?: any): string {
    if (status === 'done') {
      // Проверяем, была ли задача просрочена при закрытии
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

    // Если есть настройки типа задачи
    if (task?.taskType?.timeFrameSettings) {
      const settings = task.taskType.timeFrameSettings;

      // SLA критично
      if (settings.slaResponseTime && diffMinutes < settings.slaResponseTime) {
        if (diffMinutes < 0) {
          return '⚡ Критично! SLA нарушен - требуется немедленное реагирование';
        }
        return `⚡ Критично! Осталось ${diffMinutes} мин до нарушения SLA (${settings.slaResponseTime} мин)`;
      }

      // Предупреждение
      if (settings.warningBeforeDeadline && diffMinutes < settings.warningBeforeDeadline) {
        const hours = Math.floor(diffMinutes / 60);
        return `⚠️ Предупреждение! До дедлайна осталось ${hours}ч - зона предупреждения (${Math.floor(settings.warningBeforeDeadline / 60)}ч)`;
      }

      // Напоминание
      if (settings.reminderBeforeDeadline && diffMinutes < settings.reminderBeforeDeadline) {
        const hours = Math.floor(diffMinutes / 60);
        return `🔔 Напоминание: до дедлайна осталось ${hours}ч ${diffMinutes % 60}мин - зона напоминания (${Math.floor(settings.reminderBeforeDeadline / 60)}ч)`;
      }
    }

    // Стандартные подсказки
    if (diffMinutes < 0) {
      const overdueDays = Math.abs(Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return `❌ Просрочено на ${overdueDays} ${overdueDays === 1 ? 'день' : 'дней'}`;
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

  createTask() {
    this.router.navigate(['/tasks/create']);
  }
  
  goToTaskTypes() {
    this.router.navigate(['/tasks/types']);
  }
  
  viewTask(id: number) {
    this.router.navigate([`/tasks/view/${id}`]);
  }
  
  editTask(id: number) {
    this.router.navigate([`/tasks/edit/${id}`]);
  }
  
  deleteTask(id: number) {
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
      this.tasksService.delete(id).subscribe(() => {
        this.loadTasks();
      });
    }
  }
}
