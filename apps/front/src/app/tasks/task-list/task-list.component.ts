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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
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
import { ActiveFiltersComponent } from '../../shared/components/active-filters/active-filters.component';
import { UniversalFiltersDialogComponent } from '../../shared/dialogs/universal-filters-dialog/universal-filters-dialog.component';
import { BaseFilterState, FilterFieldDefinition, UniversalFilter } from '../../shared/interfaces/universal-filter.interface';
import { StatusTabsComponent } from '../../shared/components/status-tabs/status-tabs.component';
import { TaskTypeService } from '../../services/task-type.service';

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
    MatBadgeModule,
    TaskDueDateComponent,
    TaskTypeDisplayComponent,
    TaskStatusComponent,
    TaskModalComponent,
    PageLayoutComponent,
    MatDialogModule,
    ActiveFiltersComponent,
    StatusTabsComponent,
  ],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent implements OnInit {
  tasks = signal<Task[]>([]);
  paginatedTasks = signal<Task[]>([]);
  isLoading = signal(true);
  
  searchQuery = '';
  selectedStatus: string | null = null;
  selectedAssignees = signal<Array<number | string>>([]);
  
  // Status tabs configuration
  statusTabs = [
    { label: 'Все', value: 'all', count: 0 },
    { label: 'В ожидании', value: 'open', count: 0 },
    { label: 'В работе', value: 'in_progress', count: 0 },
    { label: 'Завершено', value: 'done', count: 0 },
    { label: 'Просрочено', value: 'overdue', count: 0 },
  ];
  
  activeTab = 'all';
  
  // Filter state
  filterState = signal<BaseFilterState>({
    search: '',
    filters: []
  });
  
  staticFields: FilterFieldDefinition[] = [];
  
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
    private dialog: MatDialog,
    private taskTypeService: TaskTypeService
  ) {}

  ngOnInit() {
    this.initializeStaticFields();
    this.loadTasks();
    
    // Subscribe to task saved events to reload the list
    this.taskModalService.taskSaved$.subscribe(() => {
      this.loadTasks();
    });
  }

  initializeStaticFields() {
    // Загружаем типы задач для справочника
    this.taskTypeService.getAll(false).subscribe({
      next: (types) => {
        const taskTypeOptions = types
          .filter(t => t.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(t => ({
            label: t.name,
            value: t.id.toString()
          }));

        this.staticFields = [
          {
            name: 'status',
            label: 'Статус',
            type: 'select',
            operators: ['equals', 'not_equals', 'in'],
            selectOptions: [
              { label: 'В ожидании', value: 'pending' },
              { label: 'В работе', value: 'in_progress' },
              { label: 'Завершено', value: 'done' },
              { label: 'Просрочено', value: 'overdue' }
            ]
          },
          {
            name: 'priority',
            label: 'Приоритет',
            type: 'select',
            operators: ['equals', 'not_equals', 'in'],
            selectOptions: [
              { label: 'Низкий', value: 'low' },
              { label: 'Средний', value: 'medium' },
              { label: 'Высокий', value: 'high' },
              { label: 'Критический', value: 'critical' }
            ]
          },
          {
            name: 'assignedTo',
            label: 'Исполнитель',
            type: 'select',
            operators: ['equals', 'not_equals', 'exists']
          },
          {
            name: 'taskType',
            label: 'Тип задачи',
            type: 'select',
            operators: ['equals', 'not_equals', 'in'],
            selectOptions: taskTypeOptions
          },
          {
            name: 'dueDate',
            label: 'Срок выполнения',
            type: 'date',
            operators: ['equals', 'greater', 'less', 'between']
          }
        ];
      },
      error: (err) => {
        console.error('Failed to load task types for filters:', err);
        // Инициализируем поля без типов задач
        this.staticFields = [
          {
            name: 'status',
            label: 'Статус',
            type: 'select',
            operators: ['equals', 'not_equals', 'in'],
            selectOptions: [
              { label: 'В ожидании', value: 'pending' },
              { label: 'В работе', value: 'in_progress' },
              { label: 'Завершено', value: 'done' },
              { label: 'Просрочено', value: 'overdue' }
            ]
          },
          {
            name: 'priority',
            label: 'Приоритет',
            type: 'select',
            operators: ['equals', 'not_equals', 'in'],
            selectOptions: [
              { label: 'Низкий', value: 'low' },
              { label: 'Средний', value: 'medium' },
              { label: 'Высокий', value: 'high' },
              { label: 'Критический', value: 'critical' }
            ]
          },
          {
            name: 'assignedTo',
            label: 'Исполнитель',
            type: 'select',
            operators: ['equals', 'not_equals', 'exists']
          },
          {
            name: 'dueDate',
            label: 'Срок выполнения',
            type: 'date',
            operators: ['equals', 'greater', 'less', 'between']
          }
        ];
      }
    });
  }

  openFiltersDialog(): void {
    const dialogRef = this.dialog.open(UniversalFiltersDialogComponent, {
      minWidth: '800px',
      data: {
        title: 'Фильтры задач',
        staticFields: this.staticFields,
        customFields: [],
        initialState: this.filterState(),
        showSearch: true,
      },
    });

    dialogRef.afterClosed().subscribe((result: BaseFilterState | undefined) => {
      if (result) {
        this.filterState.set(result);
        this.searchQuery = result.search || '';
        
        // Применяем фильтры
        this.applyFiltersFromState();
        this.currentPage = 0;
        this.loadTasks();
      }
    });
  }

  applyFiltersFromState() {
    const state = this.filterState();
    
    // Извлекаем исполнителей из фильтров
    const assigneeFilter = state.filters.find(f => f.fieldName === 'assignedTo');
    if (assigneeFilter && assigneeFilter.value) {
      const values = Array.isArray(assigneeFilter.value) ? assigneeFilter.value : [assigneeFilter.value];
      this.selectedAssignees.set(values.filter(v => typeof v === 'string' || typeof v === 'number') as (string | number)[]);
    } else {
      this.selectedAssignees.set([]);
    }
  }

  // Извлечь значения фильтров для API запроса
  private extractFilterValues() {
    const state = this.filterState();
    const result: {
      priority?: string;
      taskTypeId?: number;
      assignedToId?: number | number[];
    } = {};

    // Приоритет - поддерживаем только оператор 'equals' для одиночного значения
    // Для множественного выбора ('in') нужно будет добавить поддержку на backend
    const priorityFilter = state.filters.find(f => f.fieldName === 'priority');
    if (priorityFilter && priorityFilter.value) {
      if (priorityFilter.operator === 'equals') {
        result.priority = priorityFilter.value as string;
      } else if (priorityFilter.operator === 'in' && Array.isArray(priorityFilter.value) && priorityFilter.value.length > 0) {
        // Берем первое значение из массива (временное решение)
        result.priority = priorityFilter.value[0] as string;
      }
    }

    // Тип задачи - аналогично
    const taskTypeFilter = state.filters.find(f => f.fieldName === 'taskType');
    if (taskTypeFilter && taskTypeFilter.value) {
      if (taskTypeFilter.operator === 'equals') {
        const value = taskTypeFilter.value;
        result.taskTypeId = typeof value === 'string' ? Number(value) : value as number;
      } else if (taskTypeFilter.operator === 'in' && Array.isArray(taskTypeFilter.value) && taskTypeFilter.value.length > 0) {
        // Берем первое значение из массива (временное решение)
        const value = taskTypeFilter.value[0];
        result.taskTypeId = typeof value === 'string' ? Number(value) : value as number;
      }
    }

    // Исполнитель - полная поддержка множественного выбора
    const assigneeFilter = state.filters.find(f => f.fieldName === 'assignedTo');
    if (assigneeFilter && assigneeFilter.value) {
      if (assigneeFilter.operator === 'equals') {
        const value = assigneeFilter.value;
        result.assignedToId = typeof value === 'string' ? Number(value) : value as number;
      } else if (assigneeFilter.operator === 'in' && Array.isArray(assigneeFilter.value) && assigneeFilter.value.length > 0) {
        // Для множественного выбора передаем весь массив
        result.assignedToId = assigneeFilter.value.map(v => 
          typeof v === 'string' ? Number(v) : v as number
        );
      }
    }

    return result;
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchQuery) count++;
    count += this.filterState().filters.length;
    return count;
  }

  getActiveFiltersForDisplay(): UniversalFilter[] {
    return this.filterState().filters;
  }

  removeFilter(filterIndex: number): void {
    const currentFilters = this.filterState().filters;
    const filterToRemove = currentFilters[filterIndex];
    
    if (!filterToRemove) return;
    
    const updatedFilters = currentFilters.filter((_, index) => index !== filterIndex);
    
    this.filterState.set({
      ...this.filterState(),
      filters: updatedFilters
    });
    
    // Если удален фильтр исполнителей, очищаем
    if (filterToRemove.fieldName === 'assignedTo') {
      this.selectedAssignees.set([]);
    }
    
    this.loadTasks();
  }

  clearAllFilters(): void {
    this.filterState.set({
      search: '',
      filters: []
    });
    this.searchQuery = '';
    this.selectedAssignees.set([]);
    this.currentPage = 0;
    this.loadTasks();
  }

  loadTasks() {
    this.isLoading.set(true);
    
    // Извлекаем значения фильтров
    const filterValues = this.extractFilterValues();
    
    // Use server-side pagination and filtering
    this.tasksService.list(
      this.currentPage + 1,
      this.pageSize,
      undefined,
      undefined,
      this.selectedStatus || undefined,
      this.searchQuery || undefined,
      filterValues.priority,
      filterValues.taskTypeId,
      filterValues.assignedToId
    ).subscribe({
      next: (res) => {
        // Support both {data, total} and Array formats for robustness
        let data = Array.isArray(res) ? res : (res.data || []);
        const total = (res as any).total !== undefined ? (res as any).total : data.length;

        // Больше не нужна клиентская фильтрация - бэкенд всё делает
        this.tasks.set(data);
        this.totalResults = total;
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
  
  setActiveTab(tab: string | null) {
    this.activeTab = tab || 'all';
    this.selectedStatus = tab === 'all' || tab === null ? null : tab;
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

  // ========== Методы для фильтров ==========
  
  applyFilters(): void {
    this.currentPage = 0; // Reset to first page
    this.loadTasks();
  }

}
