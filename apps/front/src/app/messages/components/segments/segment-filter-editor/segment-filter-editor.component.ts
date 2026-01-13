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
  templateUrl: './segment-filter-editor.component.html',
  styleUrls: ['./segment-filter-editor.component.scss']
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
    
    // Правильно инициализируем value в зависимости от оператора
    const newValue = newOperator === 'between' ? ['', ''] : '';
    
    this.filterChange.emit({
      ...this.filter(),
      field,
      operator: newOperator as any,
      value: newValue
    });
  }

  onOperatorChange(operator: string): void {
    // При смене на between инициализируем массив, иначе пустая строка
    const newValue = operator === 'between' ? ['', ''] : '';
    
    this.filterChange.emit({
      ...this.filter(),
      operator: operator as any,
      value: newValue
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

  // Методы для оператора between (диапазон значений)
  getRangeValue(position: 'start' | 'end'): any {
    const value = this.filter().value;
    if (Array.isArray(value)) {
      return position === 'start' ? value[0] : value[1];
    }
    return '';
  }

  onRangeValueChange(position: 'start' | 'end', event: Event): void {
    const inputValue = (event.target as HTMLInputElement).value;
    const currentValue = Array.isArray(this.filter().value) ? this.filter().value : ['', ''];
    
    const newValue = [...currentValue];
    newValue[position === 'start' ? 0 : 1] = inputValue;
    
    this.filterChange.emit({
      ...this.filter(),
      value: newValue
    });
  }

  onRangeDateChange(position: 'start' | 'end', event: any): void {
    const date = event.value;
    if (date) {
      const dateValue = date.toISOString();
      const currentValue = Array.isArray(this.filter().value) ? this.filter().value : ['', ''];
      
      const newValue = [...currentValue];
      newValue[position === 'start' ? 0 : 1] = dateValue;
      
      this.filterChange.emit({
        ...this.filter(),
        value: newValue
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
