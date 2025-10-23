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
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ label }}</mat-label>
      <mat-select [value]="value" (selectionChange)="onSelect($event.value)" [disabled]="disabled">
        <!-- Trigger shown when select is closed: show only name and duration, hide icon -->
        <mat-select-trigger>
          <ng-container *ngIf="value; else noType">
            {{ getTypeById(value)?.name }}
            <span class="type-duration" *ngIf="getTypeById(value)?.timeFrameSettings?.defaultDuration">
              ({{ getTypeById(value)?.timeFrameSettings?.defaultDuration }} мин)
            </span>
          </ng-container>
          <ng-template #noType>Без типа</ng-template>
        </mat-select-trigger>

        <mat-option [value]="null">Без типа</mat-option>
        <mat-option *ngFor="let type of taskTypes" [value]="type.id">
          <div class="task-type-option">
            <span class="type-icon" [style.background-color]="type.color">
              <mat-icon>{{ type.icon || 'task' }}</mat-icon>
            </span>
            <span class="type-name">{{ type.name }}</span>
            <span class="type-duration" *ngIf="type.timeFrameSettings?.defaultDuration">
              ({{ type.timeFrameSettings.defaultDuration }} мин)
            </span>
          </div>
        </mat-option>
      </mat-select>
      <mat-icon matPrefix>category</mat-icon>
    </mat-form-field>
  `,
  styles: [
    `:host { display: block; width: 100%; }
     .full-width, mat-form-field.full-width { width: 100%; }
     .task-type-option { display: flex; align-items: center; gap: 8px; width: 100%; }
     /* Icon container: fixed size, center content */
     .type-icon { display:flex; align-items:center; justify-content:center; flex: 0 0 32px; width:32px; height:32px; border-radius:6px; color:#fff }
     .type-icon mat-icon { font-size: 18px; line-height: 18px; }
     /* Ensure name takes available space */
     .type-name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

     /* Overlay options live outside the component; ensure they inherit the same layout */
     ::ng-deep .cdk-overlay-pane .mat-option .task-type-option { display: flex; align-items: center; gap: 8px; width: 100%; }
     ::ng-deep .cdk-overlay-pane .mat-option .type-icon { display:flex; align-items:center; justify-content:center; flex: 0 0 32px; width:32px; height:32px; border-radius:6px; color:#fff }
     ::ng-deep .cdk-overlay-pane .mat-option .type-icon mat-icon { font-size: 18px; line-height: 18px; }
     /* Adjust material option icon and pseudo-checkbox spacing via host-scoped rule */
     /* More specific overlay selectors to cover MDC-based select panel rendered in cdk overlay */
     :host ::ng-deep .mat-mdc-option .mat-icon,
     :host ::ng-deep .mat-mdc-option .mat-pseudo-checkbox-full,
     :host ::ng-deep .cdk-overlay-pane .mat-mdc-select-panel .mat-mdc-option .mat-icon,
     :host ::ng-deep .cdk-overlay-pane .mat-mdc-select-panel .mat-mdc-option .mat-pseudo-checkbox-full,
     :host ::ng-deep .cdk-overlay-pane .mat-select-panel .mat-option .mat-icon,
     :host ::ng-deep .cdk-overlay-pane .mat-select-panel .mat-option .mat-pseudo-checkbox-full {
       margin-right: -8px !important;
       margin-top: 7px !important;
     }
  /* Ensure the mat-option itself aligns its children centrally */
  ::ng-deep .cdk-overlay-pane .mat-option { display:flex; align-items:center; }
    
    `
  ],
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
