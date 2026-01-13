import { Component, input, output, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SegmentFilter } from '../../../../shared/models/segment.models';

interface FilterField {
  value: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

interface FilterOperator {
  value: string;
  label: string;
  requiresValue: boolean;
}

@Component({
  selector: 'app-segment-filter-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="filter-editor">
      <div class="filter-fields">
        <!-- Field Selector -->
        <mat-form-field appearance="outline" class="field-select">
          <mat-label>Поле</mat-label>
          <mat-select [value]="filter().field" (selectionChange)="onFieldChange($event.value)">
            @for (field of fields; track field.value) {
              <mat-option [value]="field.value">{{ field.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Operator Selector -->
        <mat-form-field appearance="outline" class="operator-select">
          <mat-label>Условие</mat-label>
          <mat-select [value]="filter().operator" (selectionChange)="onOperatorChange($event.value)">
            @for (op of availableOperators(); track op.value) {
              <mat-option [value]="op.value">{{ op.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Value Input -->
        @if (selectedOperator()?.requiresValue) {
          <mat-form-field appearance="outline" class="value-input">
            <mat-label>Значение</mat-label>
            @if (selectedFieldType() === 'number') {
              <input matInput type="number" [value]="filter().value" (input)="onValueChange($event)">
            } @else if (selectedFieldType() === 'date') {
              <input matInput type="date" [value]="filter().value" (input)="onValueChange($event)">
            } @else {
              <input matInput type="text" [value]="filter().value" (input)="onValueChange($event)">
            }
          </mat-form-field>
        }

        <!-- Delete Button -->
        <button mat-icon-button color="warn" (click)="onDelete()" type="button" class="delete-btn">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .filter-editor {
      margin-bottom: 12px;
    }

    .filter-fields {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .field-select {
      flex: 2;
      min-width: 150px;
    }

    .operator-select {
      flex: 2;
      min-width: 150px;
    }

    .value-input {
      flex: 3;
      min-width: 200px;
    }

    .delete-btn {
      margin-top: 8px;
    }

    @media (max-width: 768px) {
      .filter-fields {
        flex-wrap: wrap;
      }

      .field-select,
      .operator-select,
      .value-input {
        flex: 1 1 100%;
        min-width: 100%;
      }
    }
  `]
})
export class SegmentFilterEditorComponent {
  filter = input.required<SegmentFilter>();
  filterChange = output<SegmentFilter>();
  delete = output<void>();

  fields: FilterField[] = [
    { value: 'name', label: 'Имя', type: 'string' },
    { value: 'phone', label: 'Телефон', type: 'string' },
    { value: 'email', label: 'Email', type: 'string' },
    { value: 'company', label: 'Компания', type: 'string' },
    { value: 'dealStatus', label: 'Статус сделки', type: 'string' },
    { value: 'dealValue', label: 'Сумма сделки', type: 'number' },
    { value: 'createdAt', label: 'Дата создания', type: 'date' },
    { value: 'lastContact', label: 'Последний контакт', type: 'date' },
  ];

  operators: FilterOperator[] = [
    { value: 'equals', label: 'Равно', requiresValue: true },
    { value: 'not_equals', label: 'Не равно', requiresValue: true },
    { value: 'contains', label: 'Содержит', requiresValue: true },
    { value: 'not_contains', label: 'Не содержит', requiresValue: true },
    { value: 'starts_with', label: 'Начинается с', requiresValue: true },
    { value: 'ends_with', label: 'Заканчивается на', requiresValue: true },
    { value: 'greater', label: 'Больше', requiresValue: true },
    { value: 'less', label: 'Меньше', requiresValue: true },
    { value: 'between', label: 'Между', requiresValue: true },
    { value: 'in', label: 'В списке', requiresValue: true },
    { value: 'not_in', label: 'Не в списке', requiresValue: true },
    { value: 'is_null', label: 'Пусто', requiresValue: false },
    { value: 'is_not_null', label: 'Не пусто', requiresValue: false },
  ];

  selectedFieldType = computed(() => {
    const field = this.fields.find(f => f.value === this.filter().field);
    return field?.type || 'string';
  });

  availableOperators = computed(() => {
    const fieldType = this.selectedFieldType();
    
    if (fieldType === 'number' || fieldType === 'date') {
      return this.operators.filter(op => 
        ['equals', 'not_equals', 'greater', 'less', 'between', 'is_null', 'is_not_null'].includes(op.value)
      );
    }
    
    return this.operators;
  });

  selectedOperator = computed(() => {
    return this.operators.find(op => op.value === this.filter().operator);
  });

  onFieldChange(field: string): void {
    this.filterChange.emit({
      ...this.filter(),
      field,
      value: ''
    });
  }

  onOperatorChange(operator: string): void {
    this.filterChange.emit({
      ...this.filter(),
      operator: operator as any,
      value: ''
    });
  }

  onValueChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterChange.emit({
      ...this.filter(),
      value
    });
  }

  onDelete(): void {
    this.delete.emit();
  }
}
