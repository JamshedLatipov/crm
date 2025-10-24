import { Component, EventEmitter, Input, Output, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarTask } from '../../task-calendar.service';

@Component({
  selector: 'crm-task-calendar-week',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-calendar-week.component.html',
  styleUrls: ['./task-calendar-week.component.scss'],
})
export class TaskCalendarWeekComponent {
  @Input() weekDays: Array<{ date: Date; tasks: CalendarTask[]; tasksByHour?: CalendarTask[][]; tasksWithSpan?: Array<{ task: CalendarTask; startIdx: number; span: number }>; isToday?: boolean }> = [];
  @Input() weekHours: number[] = [];
  @Input() maxTasksPerCell = 3;
  @Input() currentHour = -1;
  @Output() openCreate = new EventEmitter<{ date: Date; hour?: number }>();

  // layout constants (keep in sync with SCSS variables)
  public hourRowHeight = 48; // px
  public headerHeight = 40; // px
  public rowGap = 8; // px

  computeTop(startIdx: number) {
    return this.headerHeight + startIdx * (this.hourRowHeight + this.rowGap);
  }

  computeHeight(span: number) {
    if (span <= 0) return this.hourRowHeight;
    return span * this.hourRowHeight + Math.max(0, span - 1) * this.rowGap;
  }

  // grid measurements for absolute overlay positioning
  @ViewChild('grid', { read: ElementRef, static: true }) gridRef!: ElementRef<HTMLElement>;
  private columnLefts: number[] = [];
  private columnWidths: number[] = [];

  ngAfterViewInit(): void {
    // compute initial metrics after a tick
    setTimeout(() => this.computeGridMetrics(), 0);
  }

  @HostListener('window:resize')
  onResize() {
    this.computeGridMetrics();
  }

  private computeGridMetrics() {
    try {
      const gridEl = this.gridRef.nativeElement as HTMLElement;
      const headers = Array.from(gridEl.querySelectorAll('.day-header')) as HTMLElement[];
      const gridRect = gridEl.getBoundingClientRect();
      this.columnLefts = headers.map((h) => h.getBoundingClientRect().left - gridRect.left);
      this.columnWidths = headers.map((h) => h.getBoundingClientRect().width);
    } catch (err) {
      // fallback: compute evenly
      const gridEl = this.gridRef?.nativeElement as HTMLElement;
      if (!gridEl) return;
      const gridRect = gridEl.getBoundingClientRect();
      const leftCol = 80; // left label column
      const dayCount = Math.max(1, this.weekDays.length);
      const totalGap = (dayCount - 1) * 12; // column-gap default
      const avail = Math.max(0, gridRect.width - leftCol - totalGap);
      const colW = Math.floor(avail / dayCount);
      this.columnLefts = [];
      this.columnWidths = [];
      for (let i = 0; i < dayCount; i++) {
        const left = leftCol + i * (colW + 12);
        this.columnLefts.push(left);
        this.columnWidths.push(colW);
      }
    }
  }

  computeSpanLeft(dayIndex: number) {
    return this.columnLefts[dayIndex] ?? 0;
  }

  computeSpanWidth(dayIndex: number) {
    return this.columnWidths[dayIndex] ?? 0;
  }

  trackByDate(_i: number, cell: { date: Date; tasks?: CalendarTask[] }) {
    return cell?.date ? cell.date.toDateString() : 'empty-' + _i;
  }
}
