import { Component, EventEmitter, Input, Output, ElementRef, ViewChild, AfterViewInit, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarTask } from '../../task-calendar.service';

@Component({
  selector: 'crm-task-calendar-week',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-calendar-week.component.html',
  styleUrls: ['./task-calendar-week.component.scss'],
})
export class TaskCalendarWeekComponent implements OnChanges {
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

  ngOnChanges(changes: SimpleChanges) {
    // When weekDays (or layout inputs) change we need to recompute metrics after the
    // view updates so .day-header elements exist and have layout.
    if (changes['weekDays'] || changes['weekHours']) {
      // schedule after microtask so DOM has rendered the new grid
      requestAnimationFrame(() => this.computeGridMetrics());
    }
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

      // If header nodes match the expected day count, use their exact positions.
      if (headers.length === this.weekDays.length && headers.length > 0) {
        this.columnLefts = headers.map((h) => h.getBoundingClientRect().left - gridRect.left);
        this.columnWidths = headers.map((h) => h.getBoundingClientRect().width);
        return;
      }

      // Fallback: compute columns from grid geometry. Use the left "corner" column width
      // (hour labels) as starting offset and distribute remaining width across day columns.
  const cornerEl = gridEl.querySelector('.corner') as HTMLElement | null;
  // ensure we have a sensible left-column width; guard against collapsed .corner
  const measuredCorner = cornerEl ? cornerEl.getBoundingClientRect().width : 0;
  const leftCol = Math.max(80, Math.round(measuredCorner)); // px fallback minimum
  // account for grid padding (if any)
  const paddingLeft = parseFloat(window.getComputedStyle(gridEl).paddingLeft || '0') || 0;
      const dayCount = Math.max(1, this.weekDays.length);
      // Read computed column-gap from CSS if available
      const computed = window.getComputedStyle(gridEl);
      const gap = parseFloat(computed.columnGap || computed.getPropertyValue('column-gap') || '') || 12;
      const totalGap = Math.max(0, (dayCount - 1) * gap);
      const avail = Math.max(0, gridRect.width - leftCol - totalGap);
      const colW = Math.floor(avail / dayCount);
      this.columnLefts = [];
      this.columnWidths = [];
      // the left of the first day column is at leftCol pixels from grid left
      for (let i = 0; i < dayCount; i++) {
        const left = paddingLeft + leftCol + i * (colW + gap);
        this.columnLefts.push(left);
        this.columnWidths.push(colW);
      }
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
