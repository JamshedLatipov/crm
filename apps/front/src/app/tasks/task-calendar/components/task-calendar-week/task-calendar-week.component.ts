import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Input() weekDays: Array<{ date: Date; tasks: CalendarTask[]; tasksByHour?: CalendarTask[][]; isToday?: boolean }> = [];
  @Input() weekHours: number[] = [];
  @Input() maxTasksPerCell = 3;
  @Input() currentHour = -1;
  @Output() openCreate = new EventEmitter<{ date: Date; hour?: number }>();

  trackByDate(_i: number, cell: { date: Date; tasks?: CalendarTask[] }) {
    return cell?.date ? cell.date.toDateString() : 'empty-' + _i;
  }
}
