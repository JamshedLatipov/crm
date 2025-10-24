import { Component, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TaskCalendarDay {
  date: Date;
  tasks: Array<{ id: string; title: string; status: string; }>;
}

@Component({
  selector: 'app-task-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-calendar.component.html',
  styleUrls: ['./task-calendar.component.css']
})
export class TaskCalendarComponent {
  days = input<TaskCalendarDay[]>();
  selectedDate = signal<Date | null>(null);

  setSelectedDate(date: Date) {
    this.selectedDate.set(date);
  }
}
