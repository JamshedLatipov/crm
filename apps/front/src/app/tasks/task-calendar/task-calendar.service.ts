import { Injectable } from '@angular/core';
import { TaskTypeService, TaskType } from '../../services/task-type.service';
import { BehaviorSubject } from 'rxjs';
import { addDays } from 'date-fns';

export interface CalendarTask {
  id: string | number;
  title: string;
  dueDate: string; // ISO date string
  status?: string;
  color?: string;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskCalendarService {
  // In-memory sample data built from task types when available
  private sample: CalendarTask[] = [];
  // notify consumers when sample data is ready/updated
  public sampleUpdated$ = new BehaviorSubject<boolean>(false);

  constructor(private typeSvc: TaskTypeService) {
    // Try to populate sample tasks from backend task types. This is asynchronous;
    // calendar consumers should tolerate initial empty result and re-request later
    this.typeSvc.getAll(false).subscribe({
      next: (types) => this.buildSampleFromTypes(types),
      error: () => this.buildFallbackSample(),
    });
  }

  private buildSampleFromTypes(types: TaskType[]) {
    if (!types || types.length === 0) return this.buildFallbackSample();
    const today = new Date();
    this.sample = types.slice(0, 6).map((t, idx) => ({
      id: t.id,
      title: t.name,
      dueDate: addDays(today, idx - 1).toISOString(),
      status: 'pending',
      color: t.color,
      icon: t.icon,
    }));
    // add one past and one future task for variety
    this.sample.push({ id: 'past-1', title: `${types[0].name} (старое)`, dueDate: addDays(today, -3).toISOString(), status: 'done', color: types[0].color });
    this.sample.push({ id: 'future-1', title: `${types[0].name} (в будущем)`, dueDate: addDays(today, 10).toISOString(), status: 'pending', color: types[0].color });
    this.sampleUpdated$.next(true);
  }

  private buildFallbackSample() {
    const now = Date.now();
    this.sample = [
      { id: 1, title: 'Позвонить клиенту', dueDate: new Date(now).toISOString(), status: 'pending', color: '#3b82f6' },
      { id: 2, title: 'Сделать отчёт', dueDate: new Date(now + 2 * 86400000).toISOString(), status: 'in_progress', color: '#10b981' },
      { id: 3, title: 'Встреча с командой', dueDate: new Date(now + 7 * 86400000).toISOString(), status: 'pending', color: '#f59e0b' },
    ];
    this.sampleUpdated$.next(true);
  }

  // Return tasks for the given year/month (month: 0-11)
  getTasksForMonth(year: number, month: number): CalendarTask[] {
    return this.sample.filter((t) => {
      try {
        const d = new Date(t.dueDate);
        return d.getFullYear() === year && d.getMonth() === month;
      } catch {
        return false;
      }
    });
  }

  // Allow adding a task (simple in-memory push)
  addTask(task: CalendarTask): void {
    this.sample.push(task);
  }
}
