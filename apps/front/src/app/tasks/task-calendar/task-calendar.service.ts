import { Injectable } from '@angular/core';
import { TaskTypeService, TaskType } from '../../services/task-type.service';
import { TasksService, TaskDto } from '../tasks.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { addDays } from 'date-fns';

export interface CalendarTask {
  id: string | number;
  title: string;
  dueDate: string; // ISO date string
  createdAt?: string;
  status?: string;
  color?: string;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskCalendarService {
  // In-memory sample data built from task types when available
  private sample: CalendarTask[] = [];
  // signals: typesUpdated$ for sample/type data, tasksUpdated$ for server task cache updates
  public typesUpdated$ = new BehaviorSubject<boolean>(false);
  public tasksUpdated$ = new BehaviorSubject<boolean>(false);

  // cache of real tasks fetched from backend
  private tasksCache: TaskDto[] = [];
  private isFetching = false;

  constructor(private typeSvc: TaskTypeService, private tasksApi: TasksService) {
    // Populate sample task types for dev/demo use. Calendar rendering will
    // prefer server-side tasks fetched on-demand per-range.
    this.typeSvc.getAll(false).subscribe({
      next: (types) => this.buildSampleFromTypes(types),
      error: () => this.buildFallbackSample(),
    });
  }

  // Fetch tasks from backend for a given inclusive date range and cache them.
  // Uses ISO strings for `from` and `to` parameters.
  async fetchTasksForRange(start: Date, end: Date): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      const fromIso = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
      const toIso = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString();
      const obs = this.tasksApi.listRange(fromIso, toIso);
      const res = await firstValueFrom(obs);
      if (Array.isArray(res)) {
        this.tasksCache = res as TaskDto[];
      } else {
        this.tasksCache = [];
      }
      // notify that tasks cache changed
      this.tasksUpdated$.next(true);
    } catch (err) {
      console.warn('TaskCalendarService: failed to fetch tasks for range', err);
    } finally {
      this.isFetching = false;
    }
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
  this.typesUpdated$.next(true);
  }

  private buildFallbackSample() {
    const now = Date.now();
    this.sample = [
      { id: 1, title: 'Позвонить клиенту', dueDate: new Date(now).toISOString(), status: 'pending', color: '#3b82f6' },
      { id: 2, title: 'Сделать отчёт', dueDate: new Date(now + 2 * 86400000).toISOString(), status: 'in_progress', color: '#10b981' },
      { id: 3, title: 'Встреча с командой', dueDate: new Date(now + 7 * 86400000).toISOString(), status: 'pending', color: '#f59e0b' },
    ];
  this.typesUpdated$.next(true);
  }

  // Return tasks for the given year/month (month: 0-11) based on the current cache.
  // Note: no fallback to task types — prefer empty state when server has no tasks.
  getTasksForMonth(year: number, month: number): CalendarTask[] {
    const results: CalendarTask[] = [];
    if (this.tasksCache && this.tasksCache.length) {
      for (const td of this.tasksCache) {
        try {
          const dateStr = td.dueDate ?? td.createdAt ?? td.updatedAt;
          const d = new Date(dateStr);
          if (d.getFullYear() === year && d.getMonth() === month) {
            results.push(this.mapDtoToCalendar(td));
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    return results;
  }

  private mapDtoToCalendar(td: TaskDto): CalendarTask {
    return {
      id: td.id ?? 't-' + Math.random().toString(36).slice(2, 9),
      title: td.title ?? 'Без названия',
      dueDate: td.dueDate ?? td.createdAt ?? new Date().toISOString(),
      createdAt: td.createdAt,
      status: td.status,
      color: (td as any).color ?? undefined,
    };
  }

  // Allow adding a task (simple in-memory push)
  addTask(task: CalendarTask): void {
    // If we have a backend cache array (may be empty), add there as well so future queries reflect new task
    if (this.tasksCache != null) {
      try {
        // best-effort map CalendarTask -> TaskDto shape
        const dto: any = {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          status: task.status,
        };
        this.tasksCache.push(dto as TaskDto);
      } catch {
        // ignore mapping errors
      }
    } else {
      this.sample.push(task);
    }
    // notify consumers
    if (this.tasksCache != null) {
      this.tasksUpdated$.next(true);
    } else {
      this.typesUpdated$.next(true);
    }
  }

  hasCachedTasks(): boolean {
    return Array.isArray(this.tasksCache) && this.tasksCache.length > 0;
  }
}
