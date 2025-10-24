import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskCalendarService, CalendarTask } from './task-calendar.service';

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
  public weeks: Array<Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean }>> = [];
  public tasks: CalendarTask[] = [];

  constructor(private svc: TaskCalendarService) {}

  private sub: any;

  ngOnInit(): void {
    this.renderMonth(this.active.getFullYear(), this.active.getMonth());
    // re-render when the service populates sample tasks
    this.sub = this.svc.sampleUpdated$.subscribe(() => {
      this.renderMonth(this.active.getFullYear(), this.active.getMonth());
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe?.();
  }

  private startOfMonth(year: number, month: number): Date {
    return new Date(year, month, 1);
  }

  private daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  renderMonth(year: number, month: number): void {
    this.tasks = this.svc.getTasksForMonth(year, month);

    const first = this.startOfMonth(year, month);
    const startWeekday = (first.getDay() + 6) % 7; // make Monday=0
    const total = this.daysInMonth(year, month);

  const cells: Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean } | null> = [];
    // fill leading empty cells
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    // fill days
    for (let d = 1; d <= total; d++) {
      const date = new Date(year, month, d);
      const tasks = this.tasks.filter((t) => new Date(t.dueDate).getDate() === d);
      const isToday = date.toDateString() === new Date().toDateString();
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
    const y = this.active.getFullYear();
    const m = this.active.getMonth() - 1;
    this.renderMonth(y + Math.floor(m / 12), (m + 12) % 12);
  }

  nextMonth(): void {
    const y = this.active.getFullYear();
    const m = this.active.getMonth() + 1;
    this.renderMonth(y + Math.floor(m / 12), (m + 12) % 12);
  }

  trackByDate(_i: number, cell: { date: Date; tasks: CalendarTask[]; isToday?: boolean }) {
    return cell?.date ? cell.date.toDateString() : 'empty-' + Math.random();
  }
}
