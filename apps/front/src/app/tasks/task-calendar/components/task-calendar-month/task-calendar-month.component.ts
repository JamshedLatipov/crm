import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarTask } from '../../task-calendar.service';

@Component({
  selector: 'crm-task-calendar-month',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-calendar-month.component.html',
  styleUrls: ['./task-calendar-month.component.scss'],
})
export class TaskCalendarMonthComponent {
  @Input() weeks: Array<Array<{ date: Date; tasks: CalendarTask[]; isToday?: boolean }>> = [];
  @Input() maxTasksPerCell = 3;
  @Output() openCreate = new EventEmitter<Date | null>();

  trackByDate(_i: number, cell: { date: Date; tasks: CalendarTask[]; isToday?: boolean }) {
    return cell?.date ? cell.date.toDateString() : 'empty-' + _i;
  }
}
