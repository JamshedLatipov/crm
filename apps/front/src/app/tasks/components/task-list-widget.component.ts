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
    MatTooltipModule
  ],
  template: `
    <mat-card class="mb-4">
      <mat-card-header>
        <mat-card-title>
          <div class="flex items-center justify-between w-full">
            <span>Задачи</span>
            <button mat-icon-button color="primary" [routerLink]="createTaskLink" [queryParams]="createTaskParams">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        </mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <div *ngIf="isLoading" class="flex justify-center p-4">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!isLoading && tasks.length === 0" class="text-center text-gray-500 p-4">
          Нет задач
        </div>

        <div *ngIf="!isLoading && tasks.length > 0" class="space-y-2">
          <div *ngFor="let task of tasks" 
               class="p-3 border rounded hover:bg-gray-50 cursor-pointer"
               [routerLink]="['/tasks', task.id]">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="font-medium mb-1">{{ task.title }}</h4>
                <p *ngIf="task.description" class="text-sm text-gray-600 mb-2">
                  {{ task.description }}
                </p>
                <div class="flex items-center gap-2 text-xs">
                  <mat-chip [class.bg-yellow-100]="task.status === 'pending'"
                           [class.bg-blue-100]="task.status === 'in_progress'"
                           [class.bg-green-100]="task.status === 'done'"
                           [class.bg-red-100]="task.status === 'overdue'">
                    {{ getStatusLabel(task.status) }}
                  </mat-chip>
                  <span *ngIf="task.dueDate" class="text-gray-500">
                    <mat-icon class="text-sm inline-block align-middle">event</mat-icon>
                    {{ task.dueDate | date:'dd.MM.yyyy' }}
                  </span>
                  <span *ngIf="task.assignedTo" class="text-gray-500">
                    <mat-icon class="text-sm inline-block align-middle">person</mat-icon>
                    {{ task.assignedTo.username || task.assignedTo.email }}
                  </span>
                </div>
                <!-- Связи с лидом/сделкой (только если не показываем уже в контексте) -->
                <div *ngIf="!leadId && !dealId && (task.lead || task.deal)" class="flex items-center gap-2 mt-2 text-xs">
                  <a *ngIf="task.lead" 
                     [routerLink]="['/leads/view', task.lead.id]" 
                     class="flex items-center gap-1 text-blue-600 hover:underline"
                     (click)="$event.stopPropagation()">
                    <mat-icon class="text-sm">person</mat-icon>
                    <span>Лид: {{ task.lead.name }}</span>
                  </a>
                  <a *ngIf="task.deal" 
                     [routerLink]="['/deals/view', task.deal.id]" 
                     class="flex items-center gap-1 text-blue-600 hover:underline"
                     (click)="$event.stopPropagation()">
                    <mat-icon class="text-sm">business_center</mat-icon>
                    <span>Сделка: {{ task.deal.title }}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    mat-card {
      background-color: white;
    }
    ::ng-deep{

      .mat-mdc-card-header-text {
        width: 100%;
      }
    }
  `]
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

  getStatusLabel(status?: string): string {
    return taskStatusDisplay(status || 'pending');
  }
}
