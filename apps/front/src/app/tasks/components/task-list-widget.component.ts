import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TasksService, TaskDto } from '../tasks.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { taskStatusDisplay } from '../../shared/utils';
import { TaskDueDateComponent } from './task-due-date/task-due-date.component';
import { TaskTypeDisplayComponent } from './task-type-display/task-type-display.component';

@Component({
  selector: 'app-task-list-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TaskDueDateComponent,
    TaskTypeDisplayComponent
  ],
  template: `
    <mat-card class="task-widget-card task-list-widget">
      <mat-card-header>
        <mat-card-title>
          <div class="task-widget-header">
            <span>Задачи</span>
            <button mat-icon-button color="primary" [routerLink]="createTaskLink" [queryParams]="createTaskParams">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        </mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!isLoading && tasks.length === 0" class="no-tasks">
          <mat-icon class="no-tasks-icon">checklist</mat-icon>
          <div class="no-tasks-text">Нет активных задач</div>
          <div class="no-tasks-subtitle">Создайте новую задачу, чтобы начать работу</div>
        </div>

        <div *ngIf="!isLoading && tasks.length > 0" class="tasks-list">
          <div *ngFor="let task of tasks" 
               class="task-item"
               [routerLink]="['/tasks', task.id]">
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <p *ngIf="task.description" class="task-description">
                {{ task.description }}
              </p>
              <div class="task-meta">
                <app-task-type-display [taskType]="task.taskType" [compact]="true"></app-task-type-display>
                <app-task-due-date *ngIf="task.dueDate" [task]="task" class="task-due-date-component"></app-task-due-date>
                <span *ngIf="task.assignedTo" class="task-assignee">
                  <mat-icon>person</mat-icon>
                  {{ task.assignedTo.username || task.assignedTo.email }}
                </span>
              </div>
            </div>
            <div class="task-status" [class]="getStatusClass(task.status)">
              {{ getStatusLabel(task.status) }}
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styleUrls: ['./task-list-widget.component.scss']
})
export class TaskListWidgetComponent implements OnInit, OnChanges {
  private tasksService = inject(TasksService);

  @Input() leadId?: number | string;
  @Input() dealId?: string;

  tasks: TaskDto[] = [];
  isLoading = false;

  get createTaskLink(): string[] {
    return ['/tasks', 'new'];
  }

  get createTaskParams(): any {
    if (this.leadId) {
      return { leadId: this.leadId };
    }
    if (this.dealId) {
      return { dealId: this.dealId };
    }
    return {};
  }

  ngOnInit() {
    console.log('TaskListWidget ngOnInit: leadId=', this.leadId, 'dealId=', this.dealId);
    this.loadTasks();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('TaskListWidget ngOnChanges:', changes);
    if (changes['leadId'] || changes['dealId']) {
      this.loadTasks();
    }
  }

  loadTasks() {
    console.log('TaskListWidget: Loading tasks for leadId:', this.leadId, 'dealId:', this.dealId);
    this.isLoading = true;
    
    let request;
    if (this.leadId) {
      const numericLeadId = typeof this.leadId === 'string' ? Number(this.leadId) : this.leadId;
      console.log('TaskListWidget: Converted leadId to number:', numericLeadId);
      request = this.tasksService.listByLead(numericLeadId);
    } else if (this.dealId) {
      request = this.tasksService.listByDeal(this.dealId);
    } else {
      this.isLoading = false;
      return;
    }

    request.subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading tasks:', err);
        this.isLoading = false;
      }
    });
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'in_progress': return 'status-in-progress';
      case 'done': return 'status-done';
      case 'overdue': return 'status-overdue';
      default: return 'status-pending';
    }
  }

  getStatusLabel(status?: string): string {
    return taskStatusDisplay(status || 'pending');
  }

  getTaskTypeIcon(typeName?: string): string {
    if (!typeName) return 'task';
    
    const lowerType = typeName.toLowerCase();
    
    // Проверяем на наличие ключевых слов
    if (lowerType.includes('звонок') || lowerType.includes('call') || lowerType.includes('phone')) {
      return 'phone';
    }
    if (lowerType.includes('встреча') || lowerType.includes('meeting') || lowerType.includes('event')) {
      return 'event';
    }
    if (lowerType.includes('email') || lowerType.includes('письмо') || lowerType.includes('mail')) {
      return 'email';
    }
    if (lowerType.includes('задача') || lowerType.includes('task')) {
      return 'task';
    }
    if (lowerType.includes('просмотр') || lowerType.includes('view') || lowerType.includes('review')) {
      return 'visibility';
    }
    if (lowerType.includes('документ') || lowerType.includes('document') || lowerType.includes('file')) {
      return 'description';
    }
    if (lowerType.includes('срочн') || lowerType.includes('urgent') || lowerType.includes('важно')) {
      return 'priority_high';
    }
    
    // Резервная карта для точных совпадений
    const iconMap: { [key: string]: string } = {
      'звонок': 'phone',
      'встреча': 'event',
      'email': 'email',
      'задача': 'task',
      'просмотр': 'visibility',
      'документы': 'description',
      'срочный звонок': 'phone',
      'важная встреча': 'event',
      'срочная задача': 'priority_high'
    };
    
    return iconMap[lowerType] || 'task';
  }

  isUrgentTask(typeName?: string): boolean {
    if (!typeName) return false;
    const lowerType = typeName.toLowerCase();
    return lowerType.includes('срочн') || lowerType.includes('urgent') || lowerType.includes('важно');
  }
}
