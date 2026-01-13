import { Component, OnInit, signal, ViewChild, AfterViewInit } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmActionDialogComponent } from '../../shared/dialogs/confirm-action-dialog.component';
import { TasksService } from '../tasks.service';
import { AssignmentService } from '../../services/assignment.service';
import { RouterModule, Router } from '@angular/router';
import { TaskDueDateComponent } from '../components/task-due-date/task-due-date.component';
import { TaskTypeDisplayComponent } from '../components/task-type-display/task-type-display.component';
import { TaskStatusComponent } from '../components/task-status/task-status.component';
import { TaskModalService } from '../services/task-modal.service';
import { TaskModalComponent } from '../components/task-modal/task-modal.component';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { UserMultiselectFilterComponent } from '../../shared/components/user-multiselect-filter/user-multiselect-filter.component';

// Ensure this matches TaskDto in service
interface Task {
  id?: number;
  title: string;
  description?: string;
  status?: string;
  dueDate?: string;
  assignedTo?: {
    id?: number;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    name?: string;
    email?: string;
  };
  assignedToId?: number;
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
    TaskDueDateComponent,
    TaskTypeDisplayComponent,
    TaskStatusComponent,
    TaskModalComponent,
    PageLayoutComponent,
    MatDialogModule,
    UserMultiselectFilterComponent,
  ],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent implements OnInit, AfterViewInit {
  tasks = signal<Task[]>([]);
  paginatedTasks = signal<Task[]>([]);
  isLoading = signal(true);
  
  searchQuery = '';
  selectedStatus: string | null = null;
  selectedAssignees = signal<Array<number | string>>([]);
  
  @ViewChild(UserMultiselectFilterComponent) userFilter!: UserMultiselectFilterComponent;
  
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
  
  // Map of entityId -> current assignment (from centralized assignments API)
  currentAssignmentsMap = signal<Record<string, { id: number; name: string; email?: string; assignedAt?: string }>>({});

  constructor(
    private tasksService: TasksService,
    private router: Router,
    private taskModalService: TaskModalService,
    private assignmentService: AssignmentService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadTasks();
    
    // Subscribe to task saved events to reload the list
    this.taskModalService.taskSaved$.subscribe(() => {
      this.loadTasks();
    });
  }

  ngAfterViewInit() {
    // Синхронизируем состояние фильтра с компонентом после инициализации view
    if (this.userFilter && this.selectedAssignees().length > 0) {
      this.userFilter.setSelectedUsers(this.selectedAssignees());
    }
  }

  loadTasks() {
    this.isLoading.set(true);
    // Use server-side pagination and filtering
    this.tasksService.list(
      this.currentPage + 1,
      this.pageSize,
      undefined,
      undefined,
      this.selectedStatus || undefined,
      this.searchQuery || undefined
    ).subscribe({
      next: (res) => {
        // Support both {data, total} and Array formats for robustness
        let data = Array.isArray(res) ? res : (res.data || []);
        const total = (res as any).total !== undefined ? (res as any).total : data.length;

        // Клиентская фильтрация по исполнителям (если выбраны)
        const assigneeIds = this.selectedAssignees();
        if (assigneeIds.length > 0) {
          data = data.filter((task: Task) => {
            // Проверяем assignedToId или assignedTo.id
            const taskAssigneeId = task.assignedTo?.id || (task as any).assignedToId;
            return taskAssigneeId && assigneeIds.some(id => taskAssigneeId == id);
          });
        }

        this.tasks.set(data);
        this.totalResults = data.length; // Обновляем total после фильтрации
        this.paginatedTasks.set(data);

        // Stats are now partial (per page), until we add a separate stats endpoint
        this.updateStats(data);

        // Fetch current assignments for the loaded tasks in batch
        const ids = data.map((t: Task) => t.id).filter(Boolean);
        if (ids.length) {
          this.assignmentService.getCurrentAssignmentsForEntities('task', ids).subscribe({
            next: (map) => this.currentAssignmentsMap.set(map || {}),
            error: (err) => console.error('Error loading assignments for tasks list:', err)
          });
        } else {
          this.currentAssignmentsMap.set({});
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
  
  updateStats(tasks: Task[]) {
    // This is now only for visible tasks unless we have a separate stats endpoint
    this.stats.total = this.totalResults; // Use server total
    // We cannot know breakdown without stats endpoint. Leaving relative counts for visible page
    this.stats.pending = tasks.filter(t => t.status === 'pending').length;
    this.stats.inProgress = tasks.filter(t => t.status === 'in_progress').length;
    this.stats.done = tasks.filter(t => t.status === 'done').length;
    this.stats.overdue = tasks.filter(t => t.status === 'overdue').length;
  }
  
  // Removed local pagination logic
  
  onSearchChange() {
    this.currentPage = 0;
    this.loadTasks();
  }
  
  onStatusTabChange(status: string | null) {
    this.selectedStatus = status;
    this.currentPage = 0;
    this.loadTasks();
  }
  
  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTasks();
  }

  onSortChange(sort: Sort) {
    // Client-side sorting on current page only, because backend sorting not yet implemented in findAll
    const data = this.tasks().slice();
    
    if (!sort.active || sort.direction === '') {
      this.paginatedTasks.set(data);
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

    this.paginatedTasks.set(sortedData);
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

  createTask() {
    // Open the unified task modal instead of navigating
    this.taskModalService.openCreateModal();
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
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      data: {
        title: 'Удалить задачу',
        message: 'Вы уверены, что хотите удалить эту задачу?',
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe(res => {
      if (res?.confirmed) {
        this.tasksService.delete(id).subscribe(() => {
          this.loadTasks();
        });
      }
    });
  }

  // Return the display name for the assigned user using centralized assignments when available
  getAssignedManagerName(task: Task): string {
    // Сначала проверяем assignedTo из бэкенда (уже прикреплено в attachAssignments)
    if (task.assignedTo) {
      const user = task.assignedTo;
      // Если есть fullName, используем его
      if (user.fullName) return user.fullName;
      // Если есть firstName и lastName
      if (user.firstName || user.lastName) {
        const first = user.firstName || '';
        const last = user.lastName || '';
        return `${first} ${last}`.trim();
      }
      // Если есть только name
      if (user.name) return user.name;
      // Если есть email
      if (user.email) return user.email;
    }

    // Fallback к централизованному assignments map
    const map = this.currentAssignmentsMap();
    const assigned = map && map[task.id as any];
    
    if (assigned && assigned.name) return assigned.name;

    return '';
  }

  // ========== Методы для фильтра по исполнителям ==========
  
  onAssigneesChange(userIds: Array<number | string>): void {
    this.selectedAssignees.set(userIds);
    
    // Синхронизируем дочерний компонент с новым состоянием
    if (this.userFilter) {
      this.userFilter.setSelectedUsers(userIds);
    }
    
    this.applyFilters();
  }

  applyFilters(): void {
    this.currentPage = 0; // Reset to first page
    this.loadTasks();
  }

}
