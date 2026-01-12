import { Injectable } from '@angular/core';
import {
  FilterOperator,
  OperatorDefinition,
  FilterFieldDefinition,
} from '../interfaces/universal-filter.interface';

/**
 * Universal filter utility service
 * Provides helper methods for working with filters across all entities
 */
@Injectable({
  providedIn: 'root',
})
export class UniversalFilterService {
  /**
   * All available operators with their definitions
   */
  readonly operators: OperatorDefinition[] = [
    {
      value: 'equals',
      label: 'Равно',
      requiresValue: true,
      supportsArray: false,
    },
    {
      value: 'not_equals',
      label: 'Не равно',
      requiresValue: true,
      supportsArray: false,
    },
    {
      value: 'contains',
      label: 'Содержит',
      requiresValue: true,
      supportsArray: false,
    },
    {
      value: 'not_contains',
      label: 'Не содержит',
      requiresValue: true,
      supportsArray: false,
    },
    {
      value: 'starts_with',
      label: 'Начинается с',
      requiresValue: true,
      supportsArray: false,
    },
    {
      value: 'ends_with',
      label: 'Заканчивается на',
      requiresValue: true,
      supportsArray: false,
    },
    {
      value: 'greater',
      label: 'Больше',
      requiresValue: true,
      supportsArray: false,
    },
    {
      value: 'less',
      label: 'Меньше',
      requiresValue: true,
      supportsArray: false,
    },
    {
      value: 'between',
      label: 'Между',
      requiresValue: true,
      supportsArray: true,
    },
    {
      value: 'in',
      label: 'Входит в список',
      requiresValue: true,
      supportsArray: true,
    },
    {
      value: 'not_in',
      label: 'Не входит в список',
      requiresValue: true,
      supportsArray: true,
    },
    {
      value: 'exists',
      label: 'Существует',
      requiresValue: false,
      supportsArray: false,
    },
  ];

  /**
   * Get operators suitable for a specific field type
   */
  getOperatorsForFieldType(
    fieldType: FilterFieldDefinition['type']
  ): FilterOperator[] {
    const operatorMap: Record<
      FilterFieldDefinition['type'],
      FilterOperator[]
    > = {
      text: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'exists',
      ],
      email: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'exists',
      ],
      phone: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'exists',
      ],
      url: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'exists',
      ],
      textarea: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'exists',
      ],
      number: [
        'equals',
        'not_equals',
        'greater',
        'less',
        'between',
        'in',
        'not_in',
        'exists',
      ],
      date: [
        'equals',
        'not_equals',
        'greater',
        'less',
        'between',
        'exists',
      ],
      select: ['equals', 'not_equals', 'in', 'not_in', 'exists'],
      multiselect: ['in', 'not_in', 'exists'],
      boolean: ['equals', 'not_equals'],
    };

    return operatorMap[fieldType] || ['equals'];
  }

  /**
   * Get operator definition by value
   */
  getOperatorDefinition(operator: FilterOperator): OperatorDefinition | undefined {
    return this.operators.find((op) => op.value === operator);
  }

  /**
   * Get operator label by value
   */
  getOperatorLabel(operator: FilterOperator): string {
    return this.getOperatorDefinition(operator)?.label || operator;
  }

  /**
   * Check if field should show select dropdown
   */
  isSelectField(field: FilterFieldDefinition): boolean {
    if (field.type === 'select' || field.type === 'multiselect') {
      return !!field.selectOptions && field.selectOptions.length > 0;
    }
    if (field.type === 'boolean') {
      return true;
    }
    return false;
  }

  /**
   * Get select options for a field
   */
  getSelectOptions(
    field: FilterFieldDefinition
  ): Array<{ label: string; value: string }> {
    if (field.type === 'boolean') {
      return [
        { label: 'Да', value: 'true' },
        { label: 'Нет', value: 'false' },
      ];
    }
    return field.selectOptions || [];
  }

  /**
   * Get field type hint for display
   */
  getFieldTypeHint(fieldType: FilterFieldDefinition['type']): string {
    const hints: Record<FilterFieldDefinition['type'], string> = {
      text: 'текст',
      number: 'число',
      date: 'дата',
      boolean: 'да/нет',
      select: 'выбор',
      multiselect: 'множ. выбор',
      email: 'email',
      phone: 'телефон',
      url: 'ссылка',
      textarea: 'текст',
    };
    return hints[fieldType] || 'текст';
  }

  /**
   * Validate filter value based on operator
   */
  isValidFilterValue(
    operator: FilterOperator,
    value: unknown
  ): boolean {
    const operatorDef = this.getOperatorDefinition(operator);
    if (!operatorDef) return false;

    // Exists operator doesn't need a value
    if (!operatorDef.requiresValue) return true;

    // Check if value is provided
    if (value === undefined || value === null || value === '') return false;

    // Array operators need array values
    if (operatorDef.supportsArray && operator !== 'between') {
      return Array.isArray(value) && value.length > 0;
    }

    // Between needs exactly 2 values
    if (operator === 'between') {
      return Array.isArray(value) && value.length === 2;
    }

    return true;
  }

  /**
   * Create a default filter object
   */
  createDefaultFilter(
    fieldType: 'static' | 'custom',
    field?: FilterFieldDefinition
  ) {
    const operators = field
      ? this.getOperatorsForFieldType(field.type)
      : ['equals' as FilterOperator];

    return {
      fieldType,
      fieldName: field?.name || '',
      fieldLabel: field?.label || '',
      operator: operators[0],
      value: undefined,
    };
  }

  /**
   * Count total active filters (including search)
   */
  countActiveFilters(filterState: {
    search?: string;
    filters: unknown[];
  }): number {
    let count = 0;
    if (filterState.search && filterState.search.trim()) {
      count++;
    }
    count += filterState.filters.length;
    return count;
  }
}
