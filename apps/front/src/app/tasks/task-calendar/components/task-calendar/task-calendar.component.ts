import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskCalendarHeaderComponent } from '../task-calendar-header/task-calendar-header.component';
import { TaskCalendarMonthComponent } from '../task-calendar-month/task-calendar-month.component';
import { TaskCalendarWeekComponent } from '../task-calendar-week/task-calendar-week.component';
import { TaskCalendarYearComponent } from '../task-calendar-year/task-calendar-year.component';
import { TaskCalendarCreateModalComponent } from '../task-calendar-create-modal/task-calendar-create-modal.component';
import { TaskCalendarService, CalendarTask } from '../../task-calendar.service';
import { TasksService, TaskDto } from '../../../tasks.service';
import {
  startOfMonth,
  getDaysInMonth,
  addDays,
  isSameDay,
  getDay,
  startOfWeek,
  startOfYear,
  addMonths,
  format,
} from 'date-fns';

@Component({
  selector: 'crm-task-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TaskCalendarHeaderComponent,
    TaskCalendarMonthComponent,
    TaskCalendarWeekComponent,
    TaskCalendarYearComponent,
    TaskCalendarCreateModalComponent,
  ],
  templateUrl: './task-calendar.component.html',
  styleUrls: ['./task-calendar.component.scss'],
})
export class TaskCalendarComponent implements OnInit, OnDestroy {
  public monthNames = [
    'Янв',
    'Фев',
    'Мар',
    'Апр',
    'Май',
    'Июн',
    'Июл',
    'Авг',
    'Сен',
    'Окт',
    'Ноя',
    'Дек',
  ];

  public active = new Date();
  public activeDate = new Date(); // used for week/year navigation
  public weeks: Array<
    Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean }>
  > = [];
  // week view structure
  // each day contains tasks and tasks grouped by hour (aligned with weekHours)
  public weekDays: Array<{
    date: Date;
    tasks: CalendarTask[];
    tasksByHour?: CalendarTask[][];
    isToday?: boolean;
  }> = [];
  // hours displayed on the left (e.g. 0..23 for full week, or 8..17 for work-week)
  public weekHours: number[] = [];
  // current hour for highlighting the current hour cell
  public currentHour = new Date().getHours();
  // year view
  public months: Array<{ index: number; name: string; tasksCount: number }> =
    [];
  public tasks: CalendarTask[] = [];
  // maximum number of tasks to show per day cell before collapsing into "+N"
  public maxTasksPerCell = 3;
  // view mode: 'month' | 'week' | 'work-week' | 'year'
  public viewMode: 'month' | 'week' | 'work-week' | 'year' = 'month';

  // create task modal state
  public createModalOpen = false;
  public createDate: Date | null = null;
  public createHour: number | null = null;
  public createTitle = '';
  public createColor = '#3b82f6';
  public createDateStr = '';
  public createTimeStr = '';

  constructor(private svc: TaskCalendarService, private tasksApi: TasksService) {}

  private sub: any;

  ngOnInit(): void {
    this.activeDate = new Date();
    this.renderView();
    // re-render when the service populates sample tasks
    this.sub = this.svc.sampleUpdated$.subscribe(() => {
      this.renderView();
    });
  }

  setView(mode: 'month' | 'week' | 'work-week' | 'year') {
    this.viewMode = mode;
    // reset activeDate for certain modes
    if (mode === 'month')
      this.activeDate = new Date(
        this.active.getFullYear(),
        this.active.getMonth(),
        1
      );
    this.renderView();
  }

  async renderView(): Promise<void> {
    if (this.viewMode === 'month') {
      const y = this.activeDate.getFullYear();
      const m = this.activeDate.getMonth();
      const first = this.startOfMonthDate(y, m);
      const last = new Date(y, m, this.daysInMonthCount(y, m), 23, 59, 59, 999);
      await this.svc.fetchTasksForRange(first, last);
      this.renderMonth(y, m);
    } else if (this.viewMode === 'week') {
      const start = startOfWeek(this.activeDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      await this.svc.fetchTasksForRange(start, end);
      this.renderWeek(this.activeDate, false);
    } else if (this.viewMode === 'work-week') {
      const start = startOfWeek(this.activeDate, { weekStartsOn: 1 });
      const end = addDays(start, 4);
      await this.svc.fetchTasksForRange(start, end);
      this.renderWeek(this.activeDate, true);
    } else if (this.viewMode === 'year') {
      const year = this.activeDate.getFullYear();
      const start = startOfYear(new Date(year, 0, 1));
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      await this.svc.fetchTasksForRange(start, end);
      this.renderYear(year);
    }
  }

  renderYear(year: number): void {
    this.months = [];
    for (let m = 0; m < 12; m++) {
      const count = this.svc.getTasksForMonth(year, m).length;
      this.months.push({
        index: m,
        name: format(new Date(year, m, 1), 'LLL'),
        tasksCount: count,
      });
    }
    this.active = new Date(year, 0, 1);
  }

  renderWeek(date: Date, workWeek = false): void {
    this.weekDays = [];
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const days = workWeek ? 5 : 7;

    // hours: full day or business hours
    if (workWeek) {
      // business hours 8..17 inclusive
      this.weekHours = Array.from({ length: 10 }, (_, i) => i + 8);
    } else {
      // full 24 hours
      this.weekHours = Array.from({ length: 24 }, (_, i) => i);
    }

    for (let i = 0; i < days; i++) {
      const d = addDays(start, i);
      const allTasks = this.svc
        .getTasksForMonth(d.getFullYear(), d.getMonth())
        .filter((t) => isSameDay(new Date(t.dueDate), d));
      const isToday = isSameDay(d, new Date());
      // group tasks by hour according to weekHours
      const tasksByHour: CalendarTask[][] = this.weekHours.map(() => []);
      for (const t of allTasks) {
        try {
          const hour = new Date(t.dueDate).getHours();
          const idx = this.weekHours.indexOf(hour);
          if (idx >= 0) tasksByHour[idx].push(t);
        } catch {
          /* ignore parse errors */
        }
      }

      this.weekDays.push({ date: d, tasks: allTasks, tasksByHour, isToday });
    }
    this.active = start;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe?.();
  }

  openCreate(date: Date | null, hour?: number | null) {
    if (!date) return;
    this.createModalOpen = true;
    this.createDate = new Date(date);
    this.createHour = typeof hour === 'number' ? hour : null;
    // default title
    this.createTitle = '';
    // prepare string bindings for inputs
    try {
      this.createDateStr = format(this.createDate!, 'yyyy-MM-dd');
    } catch {
      this.createDateStr = '';
    }
    if (this.createHour !== null) {
      this.createTimeStr = String(this.createHour).padStart(2, '0') + ':00';
    } else {
      this.createTimeStr = '09:00';
    }
  }

  closeCreate() {
    this.createModalOpen = false;
    this.createDate = null;
    this.createHour = null;
    this.createTitle = '';
  }

  createTask() {
    if (!this.createDateStr || !this.createTitle) return;
    const parts = this.createDateStr.split('-').map((v) => parseInt(v, 10));
    if (parts.length < 3) return;
    const y = parts[0],
      m = parts[1],
      day = parts[2];
    let hour = 9,
      minute = 0;
    if (this.createTimeStr) {
      const tparts = this.createTimeStr.split(':').map((v) => parseInt(v, 10));
      if (tparts.length >= 1) hour = tparts[0];
      if (tparts.length >= 2) minute = tparts[1];
    } else if (this.createHour !== null) {
      hour = this.createHour;
    }
    const d = new Date(y, m - 1, day, hour, minute, 0, 0);
    // prepare minimal DTO for backend
    const dto: TaskDto = {
      title: this.createTitle,
      dueDate: d.toISOString(),
      status: 'pending',
    };

    // call backend API to create the task; on success add to calendar service
    this.tasksApi.create(dto).subscribe({
      next: (created) => {
        try {
          const cal: CalendarTask = {
            id: created.id ?? 't-' + Date.now(),
            title: created.title,
            dueDate: created.dueDate ?? (created.createdAt || d.toISOString()),
            status: created.status ?? 'pending',
            color: this.createColor,
          };
          this.svc.addTask(cal);
        } catch (err) {
          // if mapping fails, still add a fallback entry so UI updates
          this.svc.addTask({ id: 't-' + Date.now(), title: this.createTitle, dueDate: d.toISOString(), status: 'pending', color: this.createColor });
        }
        this.closeCreate();
        this.renderView();
      },
      error: (err) => {
        console.error('Failed to create task', err);
        // keep modal open so user can retry or fix fields; optionally show toast (not implemented)
      },
    });
  }

  onCreateFromModal(payload: {
    title: string;
    dateStr: string;
    timeStr?: string;
  }) {
    // populate fields and create
    this.createTitle = payload.title;
    this.createDateStr = payload.dateStr || this.createDateStr;
    this.createTimeStr = payload.timeStr || this.createTimeStr;
    // set createDate/createHour (used elsewhere)
    try {
      const parts = this.createDateStr.split('-').map((v) => parseInt(v, 10));
      if (parts.length === 3)
        this.createDate = new Date(parts[0], parts[1] - 1, parts[2]);
      if (this.createTimeStr)
        this.createHour = parseInt(this.createTimeStr.split(':')[0], 10);
    } catch {
      /* ignore */
    }
    this.createTask();
  }

  private startOfMonthDate(year: number, month: number): Date {
    return startOfMonth(new Date(year, month, 1));
  }

  private daysInMonthCount(year: number, month: number): number {
    return getDaysInMonth(new Date(year, month, 1));
  }

  renderMonth(year: number, month: number): void {
    this.tasks = this.svc.getTasksForMonth(year, month);

    const first = this.startOfMonthDate(year, month);
    const startWeekday = (getDay(first) + 6) % 7; // make Monday=0
    const total = this.daysInMonthCount(year, month);

    const cells: Array<{
      date: Date;
      tasks: CalendarTask[];
      isToday?: boolean;
    } | null> = [];
    // fill leading empty cells
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    // fill days
    for (let d = 1; d <= total; d++) {
      const date = addDays(first, d - 1);
      const tasks = this.tasks.filter((t) =>
        isSameDay(new Date(t.dueDate), date)
      );
      const isToday = isSameDay(date, new Date());
      cells.push({ date, tasks, isToday });
    }
    // pad to full weeks (7*rows)
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: Array<Array<{ date: Date; tasks: CalendarTask[] }>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      const slice = cells
        .slice(i, i + 7)
        .map((c) => c ?? { date: null as any, tasks: [], isToday: false });
      weeks.push(slice as any);
    }

    this.weeks = weeks;
    this.active = new Date(year, month, 1);
  }

  prevMonth(): void {
    if (this.viewMode === 'month') {
      const y = this.active.getFullYear();
      const m = this.active.getMonth() - 1;
      this.activeDate = new Date(y + Math.floor(m / 12), (m + 12) % 12, 1);
    } else if (this.viewMode === 'week' || this.viewMode === 'work-week') {
      this.activeDate = addDays(this.activeDate, -7);
    } else if (this.viewMode === 'year') {
      this.activeDate = new Date(
        this.activeDate.getFullYear() - 1,
        this.activeDate.getMonth(),
        1
      );
    }
    this.renderView();
  }

  nextMonth(): void {
    if (this.viewMode === 'month') {
      const y = this.active.getFullYear();
      const m = this.active.getMonth() + 1;
      this.activeDate = new Date(y + Math.floor(m / 12), (m + 12) % 12, 1);
    } else if (this.viewMode === 'week' || this.viewMode === 'work-week') {
      this.activeDate = addDays(this.activeDate, 7);
    } else if (this.viewMode === 'year') {
      this.activeDate = new Date(
        this.activeDate.getFullYear() + 1,
        this.activeDate.getMonth(),
        1
      );
    }
    this.renderView();
  }

  goToMonth(monthIndex: number) {
    this.activeDate = new Date(this.activeDate.getFullYear(), monthIndex, 1);
    this.setView('month');
  }

  trackByDate(
    _i: number,
    cell: { date: Date; tasks: CalendarTask[]; isToday?: boolean }
  ) {
    return cell?.date ? cell.date.toDateString() : 'empty-' + Math.random();
  }
}
