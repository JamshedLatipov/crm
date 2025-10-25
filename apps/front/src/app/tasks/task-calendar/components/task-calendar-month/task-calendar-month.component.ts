import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, AfterViewInit, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarTask } from '../../task-calendar.service';

@Component({
  selector: 'crm-task-calendar-month',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-calendar-month.component.html',
  styleUrls: ['./task-calendar-month.component.scss'],
})
export class TaskCalendarMonthComponent implements AfterViewInit, OnChanges {
  @Input() weeks: Array<Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean; tasksWithSpan?: Array<{ task: CalendarTask; spanDays?: number; continuesFromPrev?: boolean; continuesToNext?: boolean }> }>> = [];
  @Input() maxTasksPerCell = 3;
  @Output() openCreate = new EventEmitter<Date | null>();

  // layout metrics for absolute overlay positioning
  @ViewChild('grid', { read: ElementRef, static: true }) gridRef!: ElementRef<HTMLElement>;
  private columnLefts: number[] = [];
  private columnWidths: number[] = [];
  private rowTops: number[] = [];
  private cellHeight = 120; // fallback, will try to read CSS var
  private gridWidth = 0;

  ngAfterViewInit(): void {
    // compute initial metrics after first render
    setTimeout(() => this.computeGridMetrics(), 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['weeks']) {
      requestAnimationFrame(() => this.computeGridMetrics());
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.computeGridMetrics();
  }

  private computeGridMetrics() {
    const gridEl = this.gridRef?.nativeElement as HTMLElement;
    if (!gridEl) return;
  const gridRect = gridEl.getBoundingClientRect();
  this.gridWidth = gridRect.width;
    // read cell height CSS variable if present
    const computed = window.getComputedStyle(gridEl);
    const ch = parseFloat(computed.getPropertyValue('--calendar-cell-height') || '') || this.cellHeight;
    this.cellHeight = ch;
    const gap = parseFloat(computed.getPropertyValue('gap') || '') || 10;
    const paddingLeft = parseFloat(computed.paddingLeft || '0') || 0;

    // compute columns using the grid children (weekday header not counted) — rely on day elements
    const dayEls = Array.from(gridEl.querySelectorAll('.day')) as HTMLElement[];
    if (dayEls.length >= 7) {
      // compute lefts by taking the bounding rect of the first row's cells
      const firstRow = dayEls.slice(0, 7);
      this.columnLefts = firstRow.map((d) => d.getBoundingClientRect().left - gridRect.left + paddingLeft);
      this.columnWidths = firstRow.map((d) => d.getBoundingClientRect().width);
    } else {
      // fallback: evenly split
      const totalGap = (7 - 1) * gap;
      const avail = Math.max(0, gridRect.width - totalGap);
      const colW = Math.floor(avail / 7);
      this.columnLefts = [];
      this.columnWidths = [];
      for (let i = 0; i < 7; i++) {
        const left = paddingLeft + i * (colW + gap);
        this.columnLefts.push(left);
        this.columnWidths.push(colW);
      }
    }

    // compute row tops by measuring day elements per week row
    this.rowTops = [];
    for (let r = 0; r < this.weeks.length; r++) {
      // top of row r = headerHeight + r * (cellHeight + gap) — but we can compute from the first day of that row
      const idx = r * 7;
      const el = dayEls[idx];
      if (el) {
        this.rowTops.push(el.getBoundingClientRect().top - gridRect.top);
      } else {
        this.rowTops.push(r * (this.cellHeight + gap));
      }
    }
  }

  computeSpanLeft(weekIndex: number, dayIndex: number) {
    const col = dayIndex;
    return this.columnLefts[col] ?? 0;
  }

  computeSpanTop(weekIndex: number, _dayIndex: number, continuesFromPrev = false) {
    const overlap = 8; // px overlap between rows to visually stitch segments
    const top = this.rowTops[weekIndex] ?? 0;
    return continuesFromPrev ? top - overlap : top;
  }

  computeSpanWidth(_weekIndex: number, dayIndex: number, spanDays: number) {
    const colW = this.columnWidths[dayIndex] ?? 0;
    // include gaps between columns
    const computed = window.getComputedStyle(this.gridRef.nativeElement);
    const gap = parseFloat(computed.getPropertyValue('gap') || '') || 10;
    const raw = colW * spanDays + Math.max(0, spanDays - 1) * gap;
    // clamp so the span doesn't overflow the grid container
    const left = this.columnLefts[dayIndex] ?? 0;
    const maxAvailable = Math.max(0, this.gridWidth - left - 8); // 8px padding safety
    return Math.min(raw, maxAvailable);
  }

  computeSpanHeight(continuesFromPrev = false, continuesToNext = false) {
    const overlap = 8; // pixels to extend into adjacent row for visual stitching
    let h = this.cellHeight;
    if (continuesFromPrev) h += overlap;
    if (continuesToNext) h += overlap;
    return h;
  }

  trackByDate(i: number, cell: { date: Date; tasks: CalendarTask[]; isToday?: boolean }) {
    return cell?.date ? cell.date.toDateString() : 'empty-' + i;
  }
}
