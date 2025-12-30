import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface TaskFilters {
  status?: string[];
  priority?: string[];
  assignedTo?: number[];
  taskType?: number[];
}

@Component({
  selector: 'crm-task-calendar-header',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatFormFieldModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './task-calendar-header.component.html',
  styleUrls: ['./task-calendar-header.component.scss'],
})
export class TaskCalendarHeaderComponent {
  @Input() active!: Date;
  @Input() viewMode: 'month' | 'week' | 'work-week' | 'year' = 'month';
  @Input() users: Array<{ id: number; name: string }> = [];
  @Input() taskTypes: Array<{ id: number; name: string; color?: string }> = [];

  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() setView = new EventEmitter<'month' | 'week' | 'work-week' | 'year'>();
  @Output() filtersChange = new EventEmitter<TaskFilters>();

  // Filter state
  selectedStatuses: string[] = [];
  selectedPriorities: string[] = [];
  selectedAssignees: number[] = [];
  selectedTaskTypes: number[] = [];
  showFilters = false;

  readonly statusOptions = [
    { value: 'pending', label: 'В ожидании' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'done', label: 'Завершено' },
    { value: 'overdue', label: 'Просрочено' }
  ];

  readonly priorityOptions = [
    { value: 'low', label: 'Низкий', color: '#10b981' },
    { value: 'medium', label: 'Средний', color: '#f59e0b' },
    { value: 'high', label: 'Высокий', color: '#ef4444' },
    { value: 'urgent', label: 'Срочный', color: '#dc2626' }
  ];

  onPrev() { this.prev.emit(); }
  onNext() { this.next.emit(); }
  onSet(mode: 'month' | 'week' | 'work-week' | 'year') { this.setView.emit(mode); }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  onFiltersChange() {
    this.filtersChange.emit({
      status: this.selectedStatuses.length > 0 ? this.selectedStatuses : undefined,
      priority: this.selectedPriorities.length > 0 ? this.selectedPriorities : undefined,
      assignedTo: this.selectedAssignees.length > 0 ? this.selectedAssignees : undefined,
      taskType: this.selectedTaskTypes.length > 0 ? this.selectedTaskTypes : undefined
    });
  }

  clearFilters() {
    this.selectedStatuses = [];
    this.selectedPriorities = [];
    this.selectedAssignees = [];
    this.selectedTaskTypes = [];
    this.onFiltersChange();
  }
}
