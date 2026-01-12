import { Component, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TasksService, TaskDto } from '../tasks.service';
import { TaskModalService } from '../services/task-modal.service';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { TaskBoardColumnComponent } from './components/task-board-column/task-board-column.component';
import { UserMultiselectFilterComponent } from '../../shared/components/user-multiselect-filter/user-multiselect-filter.component';

export interface TaskColumn {
  id: string;
  title: string;
  status: string;
  color: string;
  icon: string;
  tasks: TaskDto[];
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DragDropModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    PageLayoutComponent,
    TaskBoardColumnComponent,
    UserMultiselectFilterComponent,
  ],
  templateUrl: './task-board.component.html',
  styleUrls: ['./task-board.component.scss']
})
export class TaskBoardComponent implements OnInit {
  isLoading = signal(true);
  searchQuery = signal('');
  selectedAssignees = signal<Array<number | string>>([]);
  
  @ViewChild(UserMultiselectFilterComponent) userFilter!: UserMultiselectFilterComponent;

  // Определяем колонки для board
  columns = signal<TaskColumn[]>([
    {
      id: 'pending',
      title: 'К выполнению',
      status: 'pending',
      color: '#94a3b8',
      icon: 'schedule',
      tasks: []
    },
    {
      id: 'in_progress',
      title: 'В работе',
      status: 'in_progress',
      color: '#3b82f6',
      icon: 'play_circle',
      tasks: []
    },
    {
      id: 'done',
      title: 'Завершено',
      status: 'done',
      color: '#10b981',
      icon: 'check_circle',
      tasks: []
    }
  ]);

  // Маппинг статусов - для поддержки разных вариантов статусов из API
  private statusMapping: Record<string, string> = {
    'open': 'pending',        // open -> pending (К выполнению)
    'pending': 'pending',
    'in_progress': 'in_progress',
    'in progress': 'in_progress',
    'done': 'done',
    'completed': 'done',
    'closed': 'done'
  };

  // Нормализация статуса
  private normalizeStatus(status: string | undefined): string {
    if (!status) return 'pending';
    const normalized = status.trim().toLowerCase();
    return this.statusMapping[normalized] || 'pending';
  }

  // Все задачи
  allTasks = signal<TaskDto[]>([]);

  // Статистика
  stats = computed(() => {
    const tasks = this.allTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => this.normalizeStatus(t.status) === 'pending').length,
      inProgress: tasks.filter(t => this.normalizeStatus(t.status) === 'in_progress').length,
      done: tasks.filter(t => this.normalizeStatus(t.status) === 'done').length,
    };
  });

  // Список ID колонок для CDK drag-drop
  columnIds = computed(() => this.columns().map(c => c.id));

  constructor(
    private tasksService: TasksService,
    private taskModalService: TaskModalService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading.set(true);
    
    // Загружаем все задачи без фильтров (не передаем status!)
    // Передаем только page и limit для получения всех задач
    this.tasksService.list(1, 1000, undefined, undefined, undefined, undefined).subscribe({
      next: (response) => {
        console.log('=== BOARD DEBUG ===');
        console.log('1. Raw API response:', response);
        console.log('2. Response type:', typeof response);
        console.log('3. Has data property?', 'data' in response);
        console.log('4. Response.data:', response.data);
        console.log('5. Is array?', Array.isArray(response.data));
        console.log('6. Total from API:', response.total);
        console.log('7. Data length:', response.data?.length);
        
        if (response.data && response.data.length > 0) {
          console.log('8. First task:', response.data[0]);
          console.log('9. ALL TASKS WITH DETAILS:', response.data.map(t => ({ 
            id: t.id, 
            title: t.title, 
            status: t.status,
            statusType: typeof t.status,
            hasTaskType: !!t.taskType,
            taskTypeName: t.taskType?.name || 'NO TYPE',
            priority: t.priority || 'NO PRIORITY'
          })));
        }
        
        const tasks = response.data || [];
        console.log('10. Setting allTasks with', tasks.length, 'items');
        this.allTasks.set(tasks);
        
        console.log('11. allTasks() after set:', this.allTasks().length);
        this.distributeTasks();
        this.isLoading.set(false);
        console.log('=== END BOARD DEBUG ===');
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.isLoading.set(false);
      }
    });
  }

  // Распределяем задачи по колонкам
  distributeTasks(): void {
    const tasks = this.filterTasks();
    console.log('=== DISTRIBUTE DEBUG ===');
    console.log('1. Filtered tasks count:', tasks.length);
    console.log('2. Columns we expect:', this.columns().map(c => ({ id: c.id, status: c.status })));
    
    // Проверяем все уникальные статусы в задачах
    const uniqueStatuses = [...new Set(tasks.map(t => t.status))];
    console.log('3. UNIQUE STATUSES IN TASKS:', uniqueStatuses);
    console.log('4. Status mapping:', tasks.map(t => ({
      original: t.status,
      normalized: this.normalizeStatus(t.status),
      title: t.title
    })));
    
    console.log('5. Tasks by normalized status:');
    const pending = tasks.filter(t => this.normalizeStatus(t.status) === 'pending');
    const inProgress = tasks.filter(t => this.normalizeStatus(t.status) === 'in_progress');
    const done = tasks.filter(t => this.normalizeStatus(t.status) === 'done');
    
    console.log('   - pending:', pending.length, pending.map(t => `${t.title} (${t.status})`));
    console.log('   - in_progress:', inProgress.length, inProgress.map(t => `${t.title} (${t.status})`));
    console.log('   - done:', done.length, done.map(t => `${t.title} (${t.status})`));
    
    const updatedColumns = this.columns().map(column => {
      const columnTasks = tasks.filter(task => {
        // Нормализуем статусы через маппинг
        const normalizedTaskStatus = this.normalizeStatus(task.status);
        const normalizedColumnStatus = column.status.trim().toLowerCase();
        const matches = normalizedTaskStatus === normalizedColumnStatus;
        
        if (matches && task.status !== normalizedTaskStatus) {
          console.log(`   ✓ Task "${task.title}" status "${task.status}" mapped to "${normalizedTaskStatus}" → matches column "${column.status}"`);
        }
        
        return matches;
      });
      
      console.log(`6. Column "${column.title}" (${column.status}): ${columnTasks.length} tasks -`, columnTasks.map(t => `${t.title} (${t.status})`));
      return {
        ...column,
        tasks: columnTasks
      };
    });
    
    console.log('7. Final columns:', updatedColumns.map(c => ({ 
      id: c.id, 
      status: c.status,
      taskCount: c.tasks.length,
      taskTitles: c.tasks.map(t => t.title)
    })));
    console.log('=== END DISTRIBUTE DEBUG ===');
    
    this.columns.set(updatedColumns);
  }

  // Фильтрация задач
  filterTasks(): TaskDto[] {
    console.log('=== FILTER TASKS DEBUG ===');
    let tasks = [...this.allTasks()];
    console.log('1. Initial tasks count:', tasks.length);
    console.log('2. All tasks:', tasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
    
    const query = this.searchQuery().toLowerCase();
    console.log('3. Search query:', query);
    if (query) {
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      );
      console.log('4. After search filter:', tasks.length);
    }

    const assigneeIds = this.selectedAssignees();
    console.log('5. Selected assignees:', assigneeIds);
    if (assigneeIds.length > 0) {
      tasks = tasks.filter(task => {
        // Проверяем, есть ли assignedToId задачи в списке выбранных исполнителей
        return task.assignedToId && assigneeIds.some(id => task.assignedToId == id);
      });
      console.log('6. After assignee filter:', tasks.length);
    }

    console.log('7. Final filtered tasks:', tasks.length);
    console.log('=== END FILTER DEBUG ===');
    return tasks;
  }

  // Обработка drag & drop
  onDrop(event: CdkDragDrop<TaskDto[]>, targetColumn: TaskColumn): void {
    const task = event.item.data as TaskDto;
    
    if (event.previousContainer === event.container) {
      // Перемещение внутри одной колонки
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      // Перемещение между колонками
      const previousColumnId = event.previousContainer.id;
      const currentColumnId = event.container.id;

      // Обновляем статус задачи
      if (task.id) {
        this.updateTaskStatus(task.id, targetColumn.status);
      }

      // Обновляем UI
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Обновляем статус в объекте задачи
      task.status = targetColumn.status;
    }
  }

  // Обновление статуса задачи на сервере
  updateTaskStatus(taskId: number, newStatus: string): void {
    this.tasksService.update(taskId, { status: newStatus }).subscribe({
      next: () => {
        console.log('Task status updated successfully');
      },
      error: (error) => {
        console.error('Error updating task status:', error);
        // В случае ошибки перезагружаем задачи
        this.loadTasks();
      }
    });
  }

  // Обработчики событий от колонок
  onTaskClick(task: TaskDto): void {
    if (task.id) {
      this.taskModalService.openTaskDetail(task.id);
    }
  }

  onTaskEdit(task: TaskDto): void {
    if (task.id) {
      this.taskModalService.openEditTask(task.id).subscribe((result) => {
        if (result) {
          this.loadTasks();
        }
      });
    }
  }

  onTaskDelete(task: TaskDto): void {
    if (task.id && confirm(`Вы уверены, что хотите удалить задачу "${task.title}"?`)) {
      this.tasksService.delete(task.id).subscribe({
        next: () => {
          this.loadTasks();
        },
        error: (error) => {
          console.error('Error deleting task:', error);
        }
      });
    }
  }

  // Создание новой задачи
  createTask(): void {
    this.taskModalService.openCreateTask().subscribe((result) => {
      if (result) {
        this.loadTasks();
      }
    });
  }

  // Поиск
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.distributeTasks();
  }

  // Сброс фильтров
  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedAssignees.set([]);
    if (this.userFilter) {
      this.userFilter.setSelectedUsers([]);
    }
    this.distributeTasks();
  }

  // Обработчик изменения выбора исполнителей из компонента фильтра
  onAssigneesChange(userIds: Array<number | string>): void {
    this.selectedAssignees.set(userIds);
    this.distributeTasks();
  }
}
