import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, AfterViewInit, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CalendarTask } from '../../task-calendar.service';

@Component({
  selector: 'crm-task-calendar-month',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatIconModule, MatButtonModule],
  templateUrl: './task-calendar-month.component.html',
  styleUrls: ['./task-calendar-month.component.scss'],
})
export class TaskCalendarMonthComponent implements AfterViewInit, OnChanges {
  @Input() weeks: Array<Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean; tasksWithSpan?: Array<{ task: CalendarTask; spanDays?: number; continuesFromPrev?: boolean; continuesToNext?: boolean; spanIndex?: number }> }>> = [];
  @Input() maxTasksPerCell = 3;
  @Output() openCreate = new EventEmitter<Date | null>();
  @Output() taskClick = new EventEmitter<CalendarTask>();
  @Output() showMore = new EventEmitter<any>();

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

  computeSpanTop(weekIndex: number, _dayIndex: number, continuesFromPrev = false, spanIndex = 0) {
    const headerOffset = 35; // offset to avoid covering day header/add button
    const spanHeight = 20; // height + gap for each span task
    const top = this.rowTops[weekIndex] ?? 0;
    return top + headerOffset + (spanIndex * spanHeight);
  }

  computeSpanWidth(_weekIndex: number, dayIndex: number, spanDays: number) {
    if (spanDays <= 0) return 0;
    
    const startColW = this.columnWidths[dayIndex] ?? 0;
    const computed = window.getComputedStyle(this.gridRef.nativeElement);
    const gap = parseFloat(computed.getPropertyValue('gap') || '') || 10;
    
    // Calculate width by summing individual column widths + gaps between them
    let totalWidth = 0;
    for (let i = 0; i < spanDays; i++) {
      const colIdx = dayIndex + i;
      if (colIdx < this.columnWidths.length) {
        totalWidth += this.columnWidths[colIdx];
        // Add gap after each column except the last one
        if (i < spanDays - 1) {
          totalWidth += gap;
        }
      }
    }
    
    return totalWidth;
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

  getTaskTooltip(task: CalendarTask): string {
    const parts = [task.title];
    if (task.priority) parts.push(`Приоритет: ${this.getPriorityLabel(task.priority)}`);
    if (task.status) parts.push(`Статус: ${this.getStatusLabel(task.status)}`);
    if (task.assignedTo) parts.push(`Ответственный: ${task.assignedTo}`);
    if (task.taskType) parts.push(`Тип: ${task.taskType}`);
    return parts.join('\n');
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      urgent: 'Срочный'
    };
    return labels[priority] || priority;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'В ожидании',
      in_progress: 'В работе',
      done: 'Выполнена',
      cancelled: 'Отменена'
    };
    return labels[status] || status;
  }

  getMultiDayTaskCount(cell: any): number {
    if (!cell?.tasksWithSpan) return 0;
    return cell.tasksWithSpan.filter((s: any) => s.spanDays && s.spanDays > 1).length;
  }
}
