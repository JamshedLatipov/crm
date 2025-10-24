import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'crm-task-calendar-year',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-calendar-year.component.html',
  styleUrls: ['./task-calendar-year.component.scss'],
})
export class TaskCalendarYearComponent {
  @Input() months: Array<{ index: number; name: string; tasksCount: number }> = [];
  @Output() goToMonth = new EventEmitter<number>();
}
