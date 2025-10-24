import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'crm-task-calendar-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule],
  templateUrl: './task-calendar-create-modal.component.html',
  styleUrls: ['./task-calendar-create-modal.component.scss'],
})
export class TaskCalendarCreateModalComponent implements OnChanges {
  @Input() open = false;
  @Input() dateStr = '';
  @Input() timeStr = '';
  @Input() title = '';
  @Input() showTime = false;

  @Output() create = new EventEmitter<{ title: string; dateStr: string; timeStr?: string }>();
  @Output() cancel = new EventEmitter<void>();

  // local date model used by Material datepicker
  public selectedDate: Date | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dateStr']) {
      const v = changes['dateStr'].currentValue as string;
      if (v) {
        const parts = v.split('-').map((p) => parseInt(p, 10));
        if (parts.length === 3 && !isNaN(parts[0])) {
          this.selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
          this.selectedDate = null;
        }
      } else {
        this.selectedDate = null;
      }
    }
  }

  onDateChange(event: any) {
    const d: Date | null = event?.value ?? this.selectedDate;
    if (d instanceof Date && !isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      this.dateStr = `${y}-${m}-${day}`;
      this.selectedDate = d;
    } else {
      this.dateStr = '';
      this.selectedDate = null;
    }
  }

  onCreateClicked() {
    this.create.emit({ title: this.title, dateStr: this.dateStr, timeStr: this.timeStr });
  }
}

