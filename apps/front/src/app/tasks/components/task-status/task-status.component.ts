import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue';

export interface TaskStatusConfig {
  label: string;
  icon: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

@Component({
  selector: 'app-task-status',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatChipsModule, MatTooltipModule],
  templateUrl: './task-status.component.html',
  styleUrls: ['./task-status.component.scss']
})
export class TaskStatusComponent {
  @Input() status: TaskStatus = 'pending';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showIndicators = false;

  private readonly statusConfigs: Record<TaskStatus, TaskStatusConfig> = {
    pending: {
      label: 'В ожидании',
      icon: 'pending',
      color: '#f59e0b',
      backgroundColor: '#fff7ed',
      borderColor: '#f59e0b',
      textColor: '#b45309'
    },
    in_progress: {
      label: 'В работе',
      icon: 'play_circle',
      color: '#3b82f6',
      backgroundColor: '#e8f0ff',
      borderColor: '#3b82f6',
      textColor: '#2563eb'
    },
    done: {
      label: 'Завершено',
      icon: 'check_circle',
      color: '#10b981',
      backgroundColor: '#ecfdf5',
      borderColor: '#10b981',
      textColor: '#047857'
    },
    overdue: {
      label: 'Просрочено',
      icon: 'warning',
      color: '#ef4444',
      backgroundColor: '#fff1f2',
      borderColor: '#ef4444',
      textColor: '#b91c1c'
    }
  };

  get config(): TaskStatusConfig {
    return this.statusConfigs[this.status] || this.statusConfigs.pending;
  }
}
