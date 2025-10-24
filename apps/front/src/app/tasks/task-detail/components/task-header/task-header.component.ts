import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  input,
  output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TaskTypeDisplayComponent } from '../../../components/task-type-display';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { TaskDto } from '../../../tasks.service';
import { Status } from '../../task-detail.component';

@Component({
  selector: 'app-task-header',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    RouterModule,
    TaskTypeDisplayComponent,
    MatMenuModule,
    MatDividerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-header.component.html',
  styleUrls: ['./task-header.component.scss'],
})
export class TaskHeaderComponent {
  readonly task = input.required<TaskDto>();
  readonly statusOptions = input.required<Status[]>();

  readonly edit = output<{ id: number; title: string }>();
  readonly delete = output<{ id: number; title: string }>();
  readonly statusChanged = output<{ id: number; status: string }>();
  readonly assign = output<number>();
  readonly back = output<void>();

  readonly isEditing = signal(false);
  readonly title = signal('');

  readonly status = computed(() => this.task()?.status ?? 'open');
  readonly isDone = computed(() => this.status() === 'done');
  readonly due = computed(() => this.task()?.dueDate ?? null);

  constructor() {
    effect(() => {
      const t = this.task();
      this.title.set(t?.title ?? '');
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'pending',
      in_progress: 'in-progress',
      done: 'success',
      overdue: 'warning',
    };
    return classes[status] || 'pending';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'warn',
      in_progress: 'accent',
      done: 'primary',
      overdue: 'warn',
    };
    return colors[status] || 'default';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'В ожидании',
      in_progress: 'В работе',
      done: 'Завершено',
      overdue: 'Просрочено',
    };
    return labels[status] || status;
  }

  editTask() {
    const t = this.task();
    if (!t) return;
    this.edit.emit({ id: t.id, title: t.title });
  }

  deleteTask() {
    const t = this.task();
    if (!t) return;
    this.delete.emit({ id: t.id, title: t.title });
  }

  assignTask() {
    const t = this.task();
    if (!t) return;
    this.assign.emit(t.id);
  }

  changeStatus(newStatus: string) {
    if (!this.task()?.id) return;

    this.statusChanged.emit({ id: this.task()?.id, status: newStatus });
  }

  completeTask() {
    this.changeStatus('done');
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'schedule',
      in_progress: 'play_arrow',
      done: 'check_circle',
      overdue: 'warning',
    };
    return icons[status] || 'schedule';
  }

  goBack() {}
}
