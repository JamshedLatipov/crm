import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { TaskDto } from '../../../tasks.service';
import { TaskDueDateComponent } from '../../../components/task-due-date/task-due-date.component';
import { TaskTypeDisplayComponent } from '../../../components/task-type-display/task-type-display.component';

@Component({
  selector: 'app-task-board-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatChipsModule,
    TaskDueDateComponent,
    TaskTypeDisplayComponent,
  ],
  templateUrl: './task-board-card.component.html',
  styleUrls: ['./task-board-card.component.scss']
})
export class TaskBoardCardComponent {
  @Input() task!: TaskDto;
  @Input() columnColor = '#6b7280';
  
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit();
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit();
  }

  getPriorityConfig() {
    const configs: Record<string, { color: string; icon: string; label: string }> = {
      urgent: { color: '#ef4444', icon: 'priority_high', label: 'Срочно' },
      high: { color: '#f97316', icon: 'arrow_upward', label: 'Высокий' },
      medium: { color: '#eab308', icon: 'remove', label: 'Средний' },
      low: { color: '#3b82f6', icon: 'arrow_downward', label: 'Низкий' },
    };
    const priority = this.task?.priority || 'medium';
    return configs[priority] || configs['medium'];
  }

  hasLinks(): boolean {
    if (!this.task) return false;
    return !!(this.task.leadId || this.task.dealId || this.task.callLogId);
  }
}
