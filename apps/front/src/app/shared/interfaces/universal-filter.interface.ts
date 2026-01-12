/**
 * Universal filter operator types
 */
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater'
  | 'less'
  | 'between'
  | 'in'
  | 'not_in'
  | 'exists';

/**
 * Universal filter for both static and custom fields
 */
export interface UniversalFilter {
  fieldType: 'static' | 'custom';
  fieldName: string;
  fieldLabel: string;
  operator: FilterOperator;
  value?: string | number | boolean | string[] | number[];
}

/**
 * Base filter state that can be extended by any entity
 */
export interface BaseFilterState {
  search?: string;
  isActive?: boolean;
  filters: UniversalFilter[];
}

/**
 * Base advanced search request that can be extended by any entity
 */
export interface BaseAdvancedSearchRequest extends BaseFilterState {
  page?: number;
  pageSize?: number;
}

/**
 * Base advanced search response
 */
export interface BaseAdvancedSearchResponse<T> {
  data: T[];
  total: number;
}

/**
 * Field definition for filter configuration
 */
export interface FilterFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'email' | 'phone' | 'url' | 'textarea';
  selectOptions?: Array<{ label: string; value: string }>;
  operators?: FilterOperator[];
}

/**
 * Operator definition for UI display
 */
export interface OperatorDefinition {
  value: FilterOperator;
  label: string;
  requiresValue: boolean;
  supportsArray: boolean;
}
