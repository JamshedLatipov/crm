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
  differenceInCalendarDays,
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
  private savedWeekDate: Date | null = null; // preserve week date when switching to month view
  public weeks: Array<
    Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean }>
  > = [];
  // week view structure
  // each day contains tasks and tasks grouped by hour (aligned with weekHours)
  public weekDays: Array<{
    date: Date;
    tasks: CalendarTask[];
    tasksByHour?: CalendarTask[][];
    tasksWithSpan?: Array<{ task: CalendarTask; startIdx: number; span: number }>;
    multiDaySpans?: Array<{ task: CalendarTask; startDay: number; daySpan: number; startIdx: number; spanHours: number }>;
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

  private subs: Array<any> = [];
  private isRendering = false;

  ngOnInit(): void {
    this.activeDate = new Date();
    this.savedWeekDate = new Date(); // initialize with current date
    this.renderView();
    // re-render when types/sample are ready (only if we don't have server tasks)
    this.subs.push(
      this.svc.typesUpdated$.subscribe(() => {
        if (!this.svc.hasCachedTasks()) this.renderView();
      })
    );
    // when server tasks cache updates, re-render current view WITHOUT triggering a fetch
    this.subs.push(
      this.svc.tasksUpdated$.subscribe(() => {
        if (this.isRendering) return; // prevent re-render loop
        if (this.viewMode === 'month') {
          this.renderMonth(this.activeDate.getFullYear(), this.activeDate.getMonth());
        } else if (this.viewMode === 'week') {
          this.renderWeek(this.activeDate, false);
        } else if (this.viewMode === 'work-week') {
          this.renderWeek(this.activeDate, true);
        } else if (this.viewMode === 'year') {
          this.renderYear(this.activeDate.getFullYear());
        }
      })
    );
  }

  setView(mode: 'month' | 'week' | 'work-week' | 'year') {
    console.log('[TaskCalendar] setView called', { mode, currentMode: this.viewMode });
    
    // Save current week date when switching from week to another view
    if ((this.viewMode === 'week' || this.viewMode === 'work-week') && mode !== 'week' && mode !== 'work-week') {
      this.savedWeekDate = new Date(this.activeDate);
      console.log('[TaskCalendar] Saved week date:', this.savedWeekDate);
    }
    
    // Restore week date when switching back to week from month
    if ((mode === 'week' || mode === 'work-week') && this.viewMode === 'month' && this.savedWeekDate) {
      this.activeDate = new Date(this.savedWeekDate);
      console.log('[TaskCalendar] Restored week date:', this.activeDate);
    }
    
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
    console.log('[TaskCalendar] renderView called', { viewMode: this.viewMode, isRendering: this.isRendering });
    if (this.isRendering) return; // prevent concurrent renders
    this.isRendering = true;
    
    try {
      if (this.viewMode === 'month') {
        const y = this.activeDate.getFullYear();
        const m = this.activeDate.getMonth();
        console.log('[TaskCalendar] Rendering month', { year: y, month: m });
        const first = this.startOfMonthDate(y, m);
        const last = new Date(y, m, this.daysInMonthCount(y, m), 23, 59, 59, 999);
        await this.svc.fetchTasksForRange(first, last);
        this.renderMonth(y, m);
      } else if (this.viewMode === 'week') {
        const start = startOfWeek(this.activeDate, { weekStartsOn: 1 });
        const end = addDays(start, 6);
        console.log('[TaskCalendar] Rendering week', { start, end });
        await this.svc.fetchTasksForRange(start, end);
        this.renderWeek(this.activeDate, false);
      } else if (this.viewMode === 'work-week') {
        const start = startOfWeek(this.activeDate, { weekStartsOn: 1 });
        const end = addDays(start, 4);
        console.log('[TaskCalendar] Rendering work-week', { start, end });
        await this.svc.fetchTasksForRange(start, end);
        this.renderWeek(this.activeDate, true);
      } else if (this.viewMode === 'year') {
        const year = this.activeDate.getFullYear();
        const start = startOfYear(new Date(year, 0, 1));
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        console.log('[TaskCalendar] Rendering year', { year, start, end });
        await this.svc.fetchTasksForRange(start, end);
        this.renderYear(year);
      }
    } finally {
      this.isRendering = false;
      console.log('[TaskCalendar] renderView completed');
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
      // compute span info for tasks: start hour derived from createdAt (or dueDate)
      const tasksByHour: CalendarTask[][] = this.weekHours.map(() => []);
  const tasksWithSpan: Array<{ task: CalendarTask; startIdx: number; span: number }>= [];
  const multiDaySpans: Array<{ task: CalendarTask; startDay: number; daySpan: number; startIdx: number; spanHours: number }>= [];
      for (const t of allTasks) {
        try {
          const startDate = t.createdAt ? new Date(t.createdAt) : new Date(t.dueDate);
          const endDate = new Date(t.dueDate);
          
          // Check if task spans multiple days
          const daysDiff = differenceInCalendarDays(endDate, startDate);
          if (daysDiff > 0) {
            // Multi-day task - will be handled separately
            continue;
          }
          
          // Single day task - calculate hour span
          const startHour = startDate.getHours();
          const endHour = endDate.getHours();
          
          // find start index within displayed weekHours
          let startIdx = this.weekHours.indexOf(startHour);
          let endIdx = this.weekHours.indexOf(endHour);
          
          // if start before visible hours, snap to first
          if (startIdx === -1) startIdx = 0;
          if (endIdx === -1) endIdx = this.weekHours.length - 1;
          
          const span = Math.max(1, endIdx - startIdx + 1);
          
          // Only add to tasksWithSpan if it spans multiple hours
          if (span > 1) {
            tasksWithSpan.push({ task: t, startIdx, span });
          } else {
            // Single hour task - add to tasksByHour for compact display
            const hour = startDate.getHours();
            const idx = this.weekHours.indexOf(hour);
            if (idx >= 0) tasksByHour[idx].push(t);
          }
        } catch {
          /* ignore parse errors */
        }
      }

      this.weekDays.push({ date: d, tasks: allTasks, tasksByHour, tasksWithSpan, multiDaySpans, isToday });
    }
    this.active = start;
    // Now compute multi-day spans across the whole week using tasks in the months intersecting this week
    const months = new Set<string>();
    for (let i = 0; i < days; i++) {
      const dd = addDays(start, i);
      months.add(`${dd.getFullYear()}-${dd.getMonth()}`);
    }
    const tasksPool: CalendarTask[] = [];
    months.forEach((mkey) => {
      const [y, m] = mkey.split('-').map((v) => parseInt(v, 10));
      const arr = this.svc.getTasksForMonth(y, m);
      for (const a of arr) tasksPool.push(a);
    });
    // dedupe by id
    const byId = new Map<string | number, CalendarTask>();
    for (const t of tasksPool) byId.set(t.id, t);
    const uniqueTasks = Array.from(byId.values());
    for (const t of uniqueTasks) {
      try {
        const startDate = t.createdAt ? new Date(t.createdAt) : new Date(t.dueDate);
        const endDate = new Date(t.dueDate);
        if (endDate < start || startDate > addDays(start, days - 1)) continue;
        const clippedStart = startDate < start ? start : startDate;
        const clippedEnd = endDate > addDays(start, days - 1) ? addDays(start, days - 1) : endDate;
        const startDayIdx = Math.max(0, Math.floor((clippedStart.getTime() - start.getTime()) / 86400000));
        const endDayIdx = Math.max(0, Math.floor((clippedEnd.getTime() - start.getTime()) / 86400000));
        const daySpan = endDayIdx - startDayIdx + 1;
        // compute hour indexes within displayed weekHours
        const sHour = clippedStart.getHours();
        const eHour = clippedEnd.getHours();
        let sIdx = this.weekHours.indexOf(sHour);
        let eIdx = this.weekHours.indexOf(eHour);
        if (sIdx === -1) sIdx = 0;
        if (eIdx === -1) eIdx = this.weekHours.length - 1;
        const spanHours = Math.max(1, eIdx - sIdx + 1);
        // attach multi-day span to the start day's multiDaySpans
        if (this.weekDays[startDayIdx]) {
          this.weekDays[startDayIdx].multiDaySpans = this.weekDays[startDayIdx].multiDaySpans || [];
          this.weekDays[startDayIdx].multiDaySpans.push({ task: t, startDay: startDayIdx, daySpan, startIdx: sIdx, spanHours });
        }
      } catch {
        /* ignore parse errors */
      }
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s?.unsubscribe?.());
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
    console.log('[TaskCalendar] renderMonth called', { year, month });
    this.tasks = this.svc.getTasksForMonth(year, month);
    console.log('[TaskCalendar] renderMonth got tasks', { tasksCount: this.tasks.length });

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
    // compute calendar grid bounds
    const gridStart = addDays(first, -startWeekday);
    const gridEnd = addDays(gridStart, cells.length - 1);

    // augment cells with optional tasksWithSpan arrays so month overlay can render multi-day spans
    const augmented = cells.map((c) => {
      if (c && c.date) {
        return { 
          ...c, 
          tasksWithSpan: [] as Array<{ task: CalendarTask; spanDays?: number; continuesFromPrev?: boolean; continuesToNext?: boolean }> 
        };
      } else {
        return { 
          date: null as any, 
          tasks: [], 
          isToday: false, 
          tasksWithSpan: [] as Array<{ task: CalendarTask; spanDays?: number; continuesFromPrev?: boolean; continuesToNext?: boolean }> 
        };
      }
    });

    // for each task in this month range, compute its clipped span relative to gridStart/gridEnd
    // and split it across week rows so long spans wrap to the next line.
    for (const t of this.tasks) {
      try {
        const startDate = t.createdAt ? new Date(t.createdAt) : new Date(t.dueDate);
        const endDate = new Date(t.dueDate);
        // skip tasks outside the visible grid
        if (endDate < gridStart || startDate > gridEnd) continue;
        const clippedStart = startDate < gridStart ? gridStart : startDate;
        const clippedEnd = endDate > gridEnd ? gridEnd : endDate;
        let startIdx = differenceInCalendarDays(clippedStart, gridStart);
        let remainingDays = Math.max(1, differenceInCalendarDays(clippedEnd, clippedStart) + 1);

        // split across calendar rows (weeks)
        const eventStartIdx = differenceInCalendarDays(startDate, gridStart);
        const eventEndIdx = differenceInCalendarDays(endDate, gridStart);
        while (remainingDays > 0 && startIdx >= 0 && startIdx < augmented.length) {
          const row = Math.floor(startIdx / 7);
          const rowEndIdx = row * 7 + 6;
          const availableInRow = Math.min(remainingDays, rowEndIdx - startIdx + 1);
          // determine whether this segment continues from a previous row or continues to the next
          const segStartIdx = startIdx;
          const segEndIdx = startIdx + availableInRow - 1;
          const continuesFromPrev = segStartIdx > eventStartIdx;
          const continuesToNext = segEndIdx < eventEndIdx;
          // attach a span segment starting at startIdx that covers availableInRow days
          if (augmented[startIdx] && augmented[startIdx].tasksWithSpan) {
            augmented[startIdx].tasksWithSpan.push({ task: t, spanDays: availableInRow, continuesFromPrev, continuesToNext });
          }
          remainingDays -= availableInRow;
          startIdx += availableInRow; // move to next day's index (may be start of next row)
        }
      } catch {
        // ignore parse errors
      }
    }

    const weeks: Array<Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean; tasksWithSpan?: Array<{ task: CalendarTask; spanDays?: number; continuesFromPrev?: boolean; continuesToNext?: boolean }> }>> = [];
    for (let i = 0; i < augmented.length; i += 7) {
      const slice = augmented.slice(i, i + 7);
      weeks.push(slice);
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
    i: number,
    cell: { date: Date; tasks: CalendarTask[]; isToday?: boolean }
  ) {
    return cell?.date ? cell.date.toDateString() : 'empty-' + i;
  }
}
