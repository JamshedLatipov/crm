import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskCalendarService, CalendarTask } from './task-calendar.service';
import { startOfMonth, getDaysInMonth, addDays, isSameDay, getDay, startOfWeek, startOfYear, addMonths, format } from 'date-fns';

@Component({
  selector: 'crm-task-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-calendar.component.html',
  styleUrls: ['./task-calendar.component.scss'],
})
export class TaskCalendarComponent implements OnInit, OnDestroy {
  public monthNames = [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
  ];

  public active = new Date();
  public activeDate = new Date(); // used for week/year navigation
  public weeks: Array<Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean }>> = [];
  // week view structure
  public weekDays: Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean }> = [];
  // year view
  public months: Array<{ index: number; name: string; tasksCount: number }> = [];
  public tasks: CalendarTask[] = [];
  // maximum number of tasks to show per day cell before collapsing into "+N"
  public maxTasksPerCell = 3;
  // view mode: 'month' | 'week' | 'work-week' | 'year'
  public viewMode: 'month' | 'week' | 'work-week' | 'year' = 'month';

  constructor(private svc: TaskCalendarService) {}

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
    if (mode === 'month') this.activeDate = new Date(this.active.getFullYear(), this.active.getMonth(), 1);
    this.renderView();
  }

  renderView(): void {
    if (this.viewMode === 'month') {
      this.renderMonth(this.activeDate.getFullYear(), this.activeDate.getMonth());
    } else if (this.viewMode === 'week') {
      this.renderWeek(this.activeDate, false);
    } else if (this.viewMode === 'work-week') {
      this.renderWeek(this.activeDate, true);
    } else if (this.viewMode === 'year') {
      this.renderYear(this.activeDate.getFullYear());
    }
  }

  renderYear(year: number): void {
    this.months = [];
    for (let m = 0; m < 12; m++) {
      const count = this.svc.getTasksForMonth(year, m).length;
      this.months.push({ index: m, name: format(new Date(year, m, 1), 'LLL'), tasksCount: count });
    }
    this.active = new Date(year, 0, 1);
  }

  renderWeek(date: Date, workWeek = false): void {
    this.weekDays = [];
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const days = workWeek ? 5 : 7;
    for (let i = 0; i < days; i++) {
      const d = addDays(start, i);
      const tasks = this.svc.getTasksForMonth(d.getFullYear(), d.getMonth()).filter(t => isSameDay(new Date(t.dueDate), d));
      const isToday = isSameDay(d, new Date());
      this.weekDays.push({ date: d, tasks, isToday });
    }
    this.active = start;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe?.();
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

  const cells: Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean } | null> = [];
    // fill leading empty cells
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    // fill days
    for (let d = 1; d <= total; d++) {
      const date = addDays(first, d - 1);
      const tasks = this.tasks.filter((t) => isSameDay(new Date(t.dueDate), date));
      const isToday = isSameDay(date, new Date());
      cells.push({ date, tasks, isToday });
    }
    // pad to full weeks (7*rows)
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: Array<Array<{ date: Date; tasks: CalendarTask[] }>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      const slice = cells.slice(i, i + 7).map((c) => c ?? { date: null as any, tasks: [], isToday: false });
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
      this.activeDate = new Date(this.activeDate.getFullYear() - 1, this.activeDate.getMonth(), 1);
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
      this.activeDate = new Date(this.activeDate.getFullYear() + 1, this.activeDate.getMonth(), 1);
    }
    this.renderView();
  }

  goToMonth(monthIndex: number) {
    this.activeDate = new Date(this.activeDate.getFullYear(), monthIndex, 1);
    this.setView('month');
  }

  trackByDate(_i: number, cell: { date: Date; tasks: CalendarTask[]; isToday?: boolean }) {
    return cell?.date ? cell.date.toDateString() : 'empty-' + Math.random();
  }
}
