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
import { TasksService } from '../tasks.service';
import { RouterModule, Router } from '@angular/router';
import { TaskDueDateComponent } from '../components/task-due-date/task-due-date.component';
import { TaskTypeDisplayComponent } from '../components/task-type-display/task-type-display.component';
import { TaskStatusComponent } from '../components/task-status/task-status.component';
import { TaskModalService } from '../services/task-modal.service';
import { TaskModalComponent } from '../components/task-modal/task-modal.component';

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
    TaskDueDateComponent,
    TaskTypeDisplayComponent,
    TaskStatusComponent,
    TaskModalComponent
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
  
  constructor(
    private tasksService: TasksService, 
    private router: Router,
    private taskModalService: TaskModalService
  ) {}

  ngOnInit() {
    this.loadTasks();
    
    // Subscribe to task saved events to reload the list
    this.taskModalService.taskSaved$.subscribe(() => {
      this.loadTasks();
    });
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
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
      this.tasksService.delete(id).subscribe(() => {
        this.loadTasks();
      });
    }
  }
}
