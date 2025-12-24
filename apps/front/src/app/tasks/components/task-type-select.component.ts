import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TaskType } from '../../services/task-type.service';

@Component({
  selector: 'app-task-type-select',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatIconModule, MatOptionModule, FormsModule],
  host: {
    'class': 'task-type-select-host'
  },
  templateUrl: './task-type-select.component.html',
  styleUrls: ['./task-type-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TaskTypeSelectComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskTypeSelectComponent implements ControlValueAccessor {
  @Input() taskTypes: TaskType[] = [];
  @Input() label = 'Тип задачи';
  @Output() selectionChange = new EventEmitter<number | null>();

  value: number | null = null;
  disabled = false;

  getTypeById(id: number | null): TaskType | undefined {
    if (id === null || id === undefined) return undefined;
    return this.taskTypes.find(t => t.id === id);
  }

  private onChange = (_: any) => {};
  private onTouched = () => {};

  onSelect(v: number | null) {
    this.value = v;
    this.onChange(v);
    this.onTouched();
    this.selectionChange.emit(v);
  }

  writeValue(obj: any): void {
    this.value = obj === undefined ? null : obj;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = !!isDisabled;
  }
}
