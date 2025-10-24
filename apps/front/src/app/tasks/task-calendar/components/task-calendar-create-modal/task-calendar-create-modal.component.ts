import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'crm-task-calendar-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-calendar-create-modal.component.html',
  styleUrls: ['./task-calendar-create-modal.component.scss'],
})
export class TaskCalendarCreateModalComponent {
  @Input() open = false;
  @Input() dateStr = '';
  @Input() timeStr = '';
  @Input() title = '';
  @Input() showTime = false;

  @Output() create = new EventEmitter<{ title: string; dateStr: string; timeStr?: string }>();
  @Output() cancel = new EventEmitter<void>();
}
