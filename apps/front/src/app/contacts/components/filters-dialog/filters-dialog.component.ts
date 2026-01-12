import { Component, inject, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { CustomFieldDefinition, FieldType } from '../../../models/custom-field.model';
import { UniversalFilter, ContactsFilterState, ContactType, ContactSource } from '../../contact.interfaces';

export interface FiltersDialogData {
  customFieldDefinitions: CustomFieldDefinition[];
  filterState: ContactsFilterState;
}

interface StaticFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'select' | 'boolean' | 'date';
  options?: Array<{ value: string; label: string }>;
}

@Component({
  selector: 'app-filters-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule,
    MatTabsModule,
  ],
  templateUrl: './filters-dialog.component.html',
  styleUrls: ['./filters-dialog.component.scss'],
})
export class FiltersDialogComponent {
  private dialogRef = inject(MatDialogRef<FiltersDialogComponent>);
  
  customFieldDefinitions: CustomFieldDefinition[];
  searchQuery: string;
  isActive: boolean | null;
  filters: UniversalFilter[];

  // Static field definitions
  staticFields: StaticFieldDefinition[] = [
    {
      name: 'type',
      label: 'Тип контакта',
      type: 'select',
      options: [
        { value: ContactType.PERSON, label: 'Физическое лицо' },
        { value: ContactType.COMPANY, label: 'Компания' },
      ],
    },
    {
      name: 'source',
      label: 'Источник',
      type: 'select',
      options: [
        { value: ContactSource.WEBSITE, label: 'Веб-сайт' },
        { value: ContactSource.PHONE, label: 'Телефон' },
        { value: ContactSource.EMAIL, label: 'Email' },
        { value: ContactSource.REFERRAL, label: 'Рекомендация' },
        { value: ContactSource.SOCIAL_MEDIA, label: 'Социальные сети' },
        { value: ContactSource.ADVERTISING, label: 'Реклама' },
        { value: ContactSource.IMPORT, label: 'Импорт' },
        { value: ContactSource.OTHER, label: 'Другое' },
      ],
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
    },
    {
      name: 'phone',
      label: 'Телефон',
      type: 'text',
    },
    {
      name: 'companyName',
      label: 'Компания',
      type: 'text',
    },
    {
      name: 'position',
      label: 'Должность',
      type: 'text',
    },
    {
      name: 'assignedTo',
      label: 'Ответственный',
      type: 'text',
    },
    {
      name: 'createdAt',
      label: 'Дата создания',
      type: 'date',
    },
    {
      name: 'isBlacklisted',
      label: 'В черном списке',
      type: 'boolean',
    },
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: FiltersDialogData) {
    this.customFieldDefinitions = data.customFieldDefinitions;
    this.searchQuery = data.filterState.search || '';
    this.isActive = data.filterState.isActive ?? null;
    // Create a deep copy to avoid mutating the original
    this.filters = JSON.parse(JSON.stringify(data.filterState.filters));
  }

  addStaticFilter(): void {
    this.filters.push({
      fieldType: 'static',
      fieldName: this.staticFields[0]?.name || '',
      fieldLabel: this.staticFields[0]?.label || '',
      operator: 'equals',
      value: '',
    });
  }

  addCustomFilter(): void {
    if (this.customFieldDefinitions.length === 0) {
      return;
    }
    
    this.filters.push({
      fieldType: 'custom',
      fieldName: this.customFieldDefinitions[0]?.name || '',
      fieldLabel: this.customFieldDefinitions[0]?.label || '',
      operator: 'equals',
      value: '',
    });
  }

  removeFilter(index: number): void {
    this.filters.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  getStaticFieldDefinition(fieldName: string): StaticFieldDefinition | undefined {
    return this.staticFields.find((def) => def.name === fieldName);
  }

  getCustomFieldDefinition(fieldName: string): CustomFieldDefinition | undefined {
    return this.customFieldDefinitions.find((def) => def.name === fieldName);
  }

  onFieldChange(filter: UniversalFilter): void {
    if (filter.fieldType === 'static') {
      const def = this.getStaticFieldDefinition(filter.fieldName);
      if (def) {
        filter.fieldLabel = def.label;
      }
    } else {
      const def = this.getCustomFieldDefinition(filter.fieldName);
      if (def) {
        filter.fieldLabel = def.label;
      }
    }
  }

  getFieldTypeLabel(fieldType: FieldType): string {
    const labels: Partial<Record<FieldType, string>> = {
      text: 'Текст',
      number: 'Число',
      date: 'Дата',
      boolean: 'Да/Нет',
      select: 'Выбор',
      multiselect: 'Множественный выбор',
      email: 'Email',
      phone: 'Телефон',
      url: 'URL',
      textarea: 'Текстовая область',
    };
    return labels[fieldType] || fieldType;
  }

  getOperatorsForFilter(filter: UniversalFilter): Array<{ value: UniversalFilter['operator']; label: string }> {
    let fieldType: string;
    
    if (filter.fieldType === 'static') {
      const staticDef = this.getStaticFieldDefinition(filter.fieldName);
      fieldType = staticDef?.type || 'text';
    } else {
      const customDef = this.getCustomFieldDefinition(filter.fieldName);
      fieldType = customDef?.fieldType || 'text';
    }

    const baseOps: Array<{ value: UniversalFilter['operator']; label: string }> = [
      { value: 'equals', label: 'Равно' },
      { value: 'not_equals', label: 'Не равно' },
      { value: 'exists', label: 'Существует' },
    ];

    if (fieldType === 'text' || fieldType === 'textarea' || fieldType === 'email' || fieldType === 'phone' || fieldType === 'url') {
      return [
        ...baseOps,
        { value: 'contains', label: 'Содержит' },
        { value: 'not_contains', label: 'Не содержит' },
        { value: 'starts_with', label: 'Начинается с' },
        { value: 'ends_with', label: 'Заканчивается на' },
      ];
    }

    if (fieldType === 'number' || fieldType === 'date') {
      return [
        ...baseOps,
        { value: 'greater', label: 'Больше' },
        { value: 'less', label: 'Меньше' },
        { value: 'between', label: 'Между' },
      ];
    }

    if (fieldType === 'select' || fieldType === 'multiselect') {
      return [
        ...baseOps,
        { value: 'in', label: 'Входит в' },
        { value: 'not_in', label: 'Не входит в' },
      ];
    }

    if (fieldType === 'boolean') {
      return baseOps.slice(0, 2); // Only equals and not_equals
    }

    return baseOps;
  }

  getInputType(filter: UniversalFilter): string {
    if (filter.fieldType === 'static') {
      const staticDef = this.getStaticFieldDefinition(filter.fieldName);
      return staticDef?.type === 'date' ? 'date' : 'text';
    } else {
      const customDef = this.getCustomFieldDefinition(filter.fieldName);
      if (customDef?.fieldType === 'number') return 'number';
      if (customDef?.fieldType === 'date') return 'date';
      return 'text';
    }
  }

  isSelectField(filter: UniversalFilter): boolean {
    if (filter.fieldType === 'static') {
      const staticDef = this.getStaticFieldDefinition(filter.fieldName);
      return staticDef?.type === 'select';
    }
    return false;
  }

  getSelectOptions(filter: UniversalFilter): Array<{ value: string; label: string }> {
    if (filter.fieldType === 'static') {
      const staticDef = this.getStaticFieldDefinition(filter.fieldName);
      return staticDef?.options || [];
    }
    return [];
  }

  clearAll(): void {
    this.searchQuery = '';
    this.isActive = null;
    this.filters = [];
  }

  apply(): void {
    const result: ContactsFilterState = {
      search: this.searchQuery || undefined,
      isActive: this.isActive,
      filters: this.filters,
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  hasStaticFilters(): boolean {
    return this.filters.some(f => f.fieldType === 'static');
  }

  hasCustomFilters(): boolean {
    return this.filters.some(f => f.fieldType === 'custom');
  }

  hasAnyActiveFilters(): boolean {
    return !!this.searchQuery || this.isActive !== null || this.filters.length > 0;
  }
}
