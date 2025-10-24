import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'crm-task-calendar-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-calendar-header.component.html',
  styleUrls: ['./task-calendar-header.component.scss'],
})
export class TaskCalendarHeaderComponent {
  @Input() active!: Date;
  @Input() viewMode: 'month' | 'week' | 'work-week' | 'year' = 'month';

  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() setView = new EventEmitter<'month' | 'week' | 'work-week' | 'year'>();

  onPrev() { this.prev.emit(); }
  onNext() { this.next.emit(); }
  onSet(mode: 'month' | 'week' | 'work-week' | 'year') { this.setView.emit(mode); }
}
