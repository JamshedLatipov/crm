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
  @Input() weekDays: Array<{ date: Date; tasks: CalendarTask[]; tasksByHour?: CalendarTask[][]; tasksWithSpan?: Array<{ task: CalendarTask; startIdx: number; span: number }>; multiDaySpans?: Array<{ task: CalendarTask; startDay: number; daySpan: number; startIdx: number; spanHours: number }>; isToday?: boolean }> = [];
  @Input() weekHours: number[] = [];
  @Input() maxTasksPerCell = 3;
  @Input() currentHour = -1;
  @Output() openCreate = new EventEmitter<{ date: Date; hour?: number }>();

  // layout constants (keep in sync with SCSS variables)
  public hourRowHeight = 48; // px
  public headerHeight = 40; // px
  public rowGap = 8; // px

  computeTop(startIdx: number) {
    return this.headerHeight + startIdx * (this.hourRowHeight + this.rowGap + 1);
  }

  computeHeight(span: number) {
    if (span <= 0) return this.hourRowHeight;
    return span * this.hourRowHeight + Math.max(0, span - 1) * this.rowGap;
  }

  // grid measurements for absolute overlay positioning
  @ViewChild('grid', { read: ElementRef, static: true }) gridRef!: ElementRef<HTMLElement>;
  private columnLefts: number[] = [];
  private columnWidths: number[] = [];
  // layout cache for overlapping span tasks
  private spanLayouts = new WeakMap<object, { left: number; width: number }>();
  private laneGap = 6; // px between lanes inside a day column

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
      const gridEl = this.gridRef?.nativeElement as HTMLElement;
      if (!gridEl) return;
      
      const headers = Array.from(gridEl.querySelectorAll('.day-header')) as HTMLElement[];
      const gridRect = gridEl.getBoundingClientRect();

      // If header nodes match the expected day count, use their exact positions.
      if (headers.length === this.weekDays.length && headers.length > 0) {
        this.columnLefts = headers.map((h) => h.getBoundingClientRect().left - gridRect.left);
        this.columnWidths = headers.map((h) => h.getBoundingClientRect().width);
        this.computeSpanLayouts();
        return;
      }

      // Fallback: compute columns from grid geometry
      const cornerEl = gridEl.querySelector('.corner') as HTMLElement | null;
      const measuredCorner = cornerEl ? cornerEl.getBoundingClientRect().width : 0;
      const leftCol = Math.max(80, Math.round(measuredCorner) || 80);
      const paddingLeft = parseFloat(window.getComputedStyle(gridEl).paddingLeft || '0') || 0;
      const dayCount = Math.max(1, this.weekDays.length);
      const computed = window.getComputedStyle(gridEl);
      const gap = parseFloat(computed.columnGap || computed.getPropertyValue('column-gap') || '12') || 12;
      const totalGap = Math.max(0, (dayCount - 1) * gap);
      const avail = Math.max(0, gridRect.width - leftCol - totalGap - paddingLeft);
      const colW = Math.floor(avail / dayCount);
      
      this.columnLefts = [];
      this.columnWidths = [];
      for (let i = 0; i < dayCount; i++) {
        const left = paddingLeft + leftCol + i * (colW + gap);
        this.columnLefts.push(left);
        this.columnWidths.push(colW);
      }
      this.computeSpanLayouts();
    } catch (err) {
      console.warn('Failed to compute grid metrics:', err);
    }
  }

  private computeSpanLayouts() {
    // reset
    this.spanLayouts = new WeakMap<object, { left: number; width: number }>();
    for (let di = 0; di < this.weekDays.length; di++) {
      const day = this.weekDays[di];
      const spans = (day && day.tasksWithSpan) ? [...day.tasksWithSpan] : [];
      if (!spans.length) continue;
      spans.sort((a, b) => a.startIdx - b.startIdx || b.span - a.span);
      const lanes: Array<{ end: number; items: any[] }> = [];
      for (const s of spans) {
        const sStart = s.startIdx;
        const sEnd = s.startIdx + s.span; // exclusive
        let placed = false;
        for (let li = 0; li < lanes.length; li++) {
          if (lanes[li].end <= sStart) {
            lanes[li].items.push(s);
            lanes[li].end = sEnd;
            (s as any).__lane = li;
            placed = true;
            break;
          }
        }
        if (!placed) {
          const li = lanes.length;
          lanes.push({ end: sEnd, items: [s] });
          (s as any).__lane = li;
        }
      }
      const laneCount = lanes.length;
      const colLeft = this.columnLefts[di] ?? 0;
      const colWidth = this.columnWidths[di] ?? 0;
      const totalGap = Math.max(0, (laneCount - 1) * this.laneGap);
      const innerPadding = 8;
      const laneWidth = Math.max(40, (colWidth - innerPadding * 2 - totalGap) / Math.max(1, laneCount));
      for (const s of spans) {
        const li = (s as any).__lane || 0;
        const left = colLeft + innerPadding + li * (laneWidth + this.laneGap);
        const width = Math.min(laneWidth, Math.max(40, colLeft + colWidth - left - innerPadding));
        this.spanLayouts.set(s as object, { left, width });
      }
    }
  }

  computeSpanLeft(dayIndex: number) {
    return this.columnLefts[dayIndex] ?? 0;
  }

  computeSpanWidth(dayIndex: number, spanDays = 1) {
    // sum column widths for spanDays starting at dayIndex, include gaps
    let w = 0;
    for (let i = 0; i < spanDays; i++) {
      w += this.columnWidths[dayIndex + i] ?? 0;
    }
    // include internal gaps between columns
    const gridEl = this.gridRef?.nativeElement as HTMLElement | null;
    const gap = gridEl ? parseFloat(window.getComputedStyle(gridEl).getPropertyValue('column-gap') || '0') || 12 : 12;
    w += Math.max(0, spanDays - 1) * gap;
    return w;
  }

  computeSpanLayoutLeft(dayIndex: number, spanObj: any) {
    const layout = this.spanLayouts.get(spanObj as object);
    if (layout) return layout.left;
    return this.computeSpanLeft(dayIndex) + 8;
  }

  computeSpanLayoutWidth(dayIndex: number, spanObj: any) {
    const layout = this.spanLayouts.get(spanObj as object);
    if (layout) return layout.width;
    return (this.columnWidths[dayIndex] ?? 0) - 16;
  }

  trackByDate(i: number, cell: { date: Date; tasks?: CalendarTask[] }) {
    return cell?.date ? cell.date.toDateString() : 'empty-' + i;
  }
}
