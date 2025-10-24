import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskCalendarComponent } from './components/task-calendar/task-calendar.component';

@Component({
  selector: 'crm-task-calendar-page',
  standalone: true,
  imports: [CommonModule, TaskCalendarComponent],
  templateUrl: './task-calendar-page.component.html',
  styleUrls: ['./task-calendar-page.component.scss'],
})
export class TaskCalendarPageComponent {}
