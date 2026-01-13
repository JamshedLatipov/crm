import { Component, input, output, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
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
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <div class="filter-editor">
      <div class="filter-fields">
        <!-- Field Selector -->
        <mat-form-field appearance="outline" class="field-select">
          <mat-label>Поле</mat-label>
          <mat-icon matPrefix class="field-icon">filter_alt</mat-icon>
          <mat-select [value]="filter().field" (selectionChange)="onFieldChange($event.value)">
            <mat-optgroup label="Стандартные поля">
              @for (field of standardFields; track field.value) {
                <mat-option [value]="field.value">
                  <span class="option-label">{{ field.label }}</span>
                </mat-option>
              }
            </mat-optgroup>
            @if (customFields().length > 0) {
              <mat-optgroup label="Кастомные поля">
                @for (field of customFields(); track field.value) {
                  <mat-option [value]="field.value">
                    <mat-icon class="custom-field-icon">extension</mat-icon>
                    <span class="option-label">{{ field.label }}</span>
                  </mat-option>
                }
              </mat-optgroup>
            }
          </mat-select>
        </mat-form-field>

        <!-- Operator Selector -->
        <mat-form-field appearance="outline" class="operator-select">
          <mat-label>Условие</mat-label>
          <mat-icon matPrefix class="operator-icon">rule</mat-icon>
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
               <mat-icon matPrefix>tag</mat-icon>
              } @else if (selectedFieldType() === 'boolean') {
                <mat-icon matPrefix>check_circle</mat-icon>
              } @else if (selectedCustomFieldDef()?.fieldType === 'select') {
                <mat-icon matPrefix>list</mat-icon>
              } @else if (selectedFieldType() === 'date') {}
              @else {
                <mat-icon matPrefix>text_fields</mat-icon>
              }
            @if (selectedFieldType() === 'number') {
              <input matInput type="number" [value]="filter().value" (input)="onValueChange($event)" placeholder="Введите число">
            } @else if (selectedFieldType() === 'date') {
              <input matInput [matDatepicker]="datePicker" [value]="filter().value" (dateChange)="onDateChange($event)" placeholder="Выберите дату">
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
              <input matInput type="text" [value]="filter().value" (input)="onValueChange($event)" placeholder="Введите значение">
            }
            
            @if (selectedFieldType() === 'date') {
              <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
            }
            
            <mat-datepicker #datePicker></mat-datepicker>
          </mat-form-field>
        }

        <!-- Delete Button -->
        <button mat-icon-button color="warn" (click)="onDelete()" type="button" class="delete-btn" 
                matTooltip="Удалить условие">
          <mat-icon>delete_outline</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .filter-editor {
      margin-bottom: 0;
    }

    .filter-fields {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      flex-wrap: nowrap;
    }

    .field-select {
      flex: 0 1 220px;
      min-width: 170px;
    }

    .operator-select {
      flex: 0 1 180px;
      min-width: 140px;
    }

    .value-input {
      flex: 1 1 auto;
      min-width: 180px;
    }

    .delete-btn {
      flex-shrink: 0;
      margin-top: 2px;
      transition: all 0.2s ease;
      width: 36px;
      height: 36px;
      
      mat-icon {
        font-size: 20px;
      }
      
      &:hover {
        transform: scale(1.1);
      }
    }

    /* Стили для иконок в префиксах */
    .field-icon {
      color: #1976d2;
      margin-right: 6px;
      font-size: 20px;
    }

    .operator-icon {
      color: #7b1fa2;
      margin-right: 6px;
      font-size: 20px;
    }

    mat-icon[matPrefix] {
      color: #616161;
      margin-right: 6px;
      font-size: 20px;
    }

    /* Стили для кастомных полей в выпадающем списке */
    .custom-field-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 6px;
      color: #ff9800;
      vertical-align: middle;
    }

    .option-label {
      vertical-align: middle;
    }

    /* Responsive design */
    @media (max-width: 1024px) {
      .filter-fields {
        flex-wrap: wrap;
        gap: 8px;
      }

      .field-select,
      .operator-select {
        flex: 1 1 calc(50% - 4px);
        min-width: 140px;
      }

      .value-input {
        flex: 1 1 calc(100% - 40px);
        min-width: 180px;
      }
    }

    @media (max-width: 768px) {
      .filter-fields {
        gap: 8px;
      }

      .field-select,
      .operator-select,
      .value-input {
        flex: 1 1 100%;
        min-width: 100%;
      }

      .delete-btn {
        align-self: center;
        margin-top: 0;
      }
    }

    /* Уменьшенные form fields */
    ::ng-deep .filter-editor {
      mat-form-field {
        .mat-mdc-form-field-infix {
          padding-top: 14px;
          padding-bottom: 14px;
        }

        .mat-mdc-text-field-wrapper {
          background-color: #ffffff;
        }

        &.mat-focused {
          .mat-mdc-form-field-focus-overlay {
            opacity: 0.05;
          }
        }
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
    const newFieldType = this.allFields().find(f => f.value === field)?.type || 'string';
    const currentOperator = this.filter().operator;
    
    // Проверяем, доступен ли текущий оператор для нового типа поля
    let newOperator = currentOperator;
    
    if (newFieldType === 'date' || newFieldType === 'number') {
      // Для date и number разрешены только: equals, not_equals, greater, less, between, is_null, is_not_null
      const allowedOps = ['equals', 'not_equals', 'greater', 'less', 'between', 'is_null', 'is_not_null'];
      if (!allowedOps.includes(currentOperator as string)) {
        newOperator = 'equals'; // Сбрасываем на безопасный оператор
      }
    } else if (newFieldType === 'boolean') {
      // Для boolean разрешены только: equals, not_equals, is_null, is_not_null
      const allowedOps = ['equals', 'not_equals', 'is_null', 'is_not_null'];
      if (!allowedOps.includes(currentOperator as string)) {
        newOperator = 'equals';
      }
    }
    
    this.filterChange.emit({
      ...this.filter(),
      field,
      operator: newOperator as any,
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

  onDateChange(event: any): void {
    const date = event.value;
    if (date) {
      // Convert to ISO string for storage
      const value = date.toISOString();
      this.filterChange.emit({
        ...this.filter(),
        value
      });
    }
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
