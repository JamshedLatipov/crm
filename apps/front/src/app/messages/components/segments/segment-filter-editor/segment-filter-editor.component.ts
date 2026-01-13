import { Component, input, output, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SegmentFilter } from '../../../../shared/models/segment.models';
import { CustomFieldsService } from '../../../../services/custom-fields.service';
import { CustomFieldDefinition, FieldType } from '../../../../models/custom-field.model';

interface FilterField {
  value: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  isCustomField?: boolean;
  customFieldDef?: CustomFieldDefinition;
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
            <mat-optgroup label="Стандартные поля">
              @for (field of standardFields; track field.value) {
                <mat-option [value]="field.value">{{ field.label }}</mat-option>
              }
            </mat-optgroup>
            @if (customFields().length > 0) {
              <mat-optgroup label="Кастомные поля">
                @for (field of customFields(); track field.value) {
                  <mat-option [value]="field.value">{{ field.label }}</mat-option>
                }
              </mat-optgroup>
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
            } @else if (selectedFieldType() === 'boolean') {
              <mat-select [value]="filter().value" (selectionChange)="onBooleanChange($event.value)">
                <mat-option [value]="true">Да</mat-option>
                <mat-option [value]="false">Нет</mat-option>
              </mat-select>
            } @else if (selectedCustomFieldDef()?.fieldType === 'select') {
              <mat-select [value]="filter().value" (selectionChange)="onSelectChange($event.value)">
                @for (option of selectedCustomFieldDef()?.selectOptions || []; track option.value) {
                  <mat-option [value]="option.value">{{ option.label }}</mat-option>
                }
              </mat-select>
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
export class SegmentFilterEditorComponent implements OnInit {
  private readonly customFieldsService = inject(CustomFieldsService);
  
  filter = input.required<SegmentFilter>();
  filterChange = output<SegmentFilter>();
  delete = output<void>();

  // Стандартные поля контактов
  standardFields: FilterField[] = [
    { value: 'name', label: 'Имя', type: 'string' },
    { value: 'phone', label: 'Телефон', type: 'string' },
    { value: 'email', label: 'Email', type: 'string' },
    { value: 'company', label: 'Компания', type: 'string' },
    { value: 'dealStatus', label: 'Статус сделки', type: 'string' },
    { value: 'dealValue', label: 'Сумма сделки', type: 'number' },
    { value: 'createdAt', label: 'Дата создания', type: 'date' },
    { value: 'lastContact', label: 'Последний контакт', type: 'date' },
  ];

  // Кастомные поля (загружаются из API)
  customFields = signal<FilterField[]>([]);

  // Все поля (стандартные + кастомные)
  allFields = computed(() => [...this.standardFields, ...this.customFields()]);

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

  ngOnInit(): void {
    this.loadCustomFields();
  }

  private loadCustomFields(): void {
    this.customFieldsService.findByEntity('contact').subscribe({
      next: (fields) => {
        const customFieldsList: FilterField[] = fields
          .filter(f => f.isActive && f.displayConfig?.showInFilters !== false)
          .map(f => ({
            value: `customFields.${f.name}`,
            label: f.label,
            type: this.mapFieldTypeToFilterType(f.fieldType),
            isCustomField: true,
            customFieldDef: f,
          }));
        this.customFields.set(customFieldsList);
      },
      error: (error) => {
        console.error('Error loading custom fields:', error);
      }
    });
  }

  private mapFieldTypeToFilterType(fieldType: FieldType): 'string' | 'number' | 'date' | 'boolean' {
    switch (fieldType) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'boolean':
        return 'boolean';
      case 'select':
      case 'multiselect':
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      case 'textarea':
      default:
        return 'string';
    }
  }

  selectedFieldType = computed(() => {
    const field = this.allFields().find(f => f.value === this.filter().field);
    return field?.type || 'string';
  });

  selectedCustomFieldDef = computed(() => {
    const field = this.allFields().find(f => f.value === this.filter().field);
    return field?.customFieldDef;
  });

  availableOperators = computed(() => {
    const fieldType = this.selectedFieldType();
    const customFieldDef = this.selectedCustomFieldDef();
    
    // Для select/multiselect полей показываем только операторы выбора
    if (customFieldDef?.fieldType === 'select') {
      return this.operators.filter(op => 
        ['equals', 'not_equals', 'is_null', 'is_not_null'].includes(op.value)
      );
    }
    
    if (customFieldDef?.fieldType === 'multiselect') {
      return this.operators.filter(op => 
        ['in', 'not_in', 'is_null', 'is_not_null'].includes(op.value)
      );
    }
    
    if (fieldType === 'number' || fieldType === 'date') {
      return this.operators.filter(op => 
        ['equals', 'not_equals', 'greater', 'less', 'between', 'is_null', 'is_not_null'].includes(op.value)
      );
    }

    if (fieldType === 'boolean') {
      return this.operators.filter(op => 
        ['equals', 'not_equals', 'is_null', 'is_not_null'].includes(op.value)
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

  onBooleanChange(value: boolean): void {
    this.filterChange.emit({
      ...this.filter(),
      value
    });
  }

  onSelectChange(value: string): void {
    this.filterChange.emit({
      ...this.filter(),
      value
    });
  }

  onDelete(): void {
    this.delete.emit();
  }
}
