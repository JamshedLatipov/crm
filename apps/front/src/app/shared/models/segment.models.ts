/**
 * Universal Segment Models
 * Used across all modules (messages, contact-center, etc.)
 */

export enum SegmentUsageType {
  SMS = 'sms',
  CAMPAIGN = 'campaign',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  GENERAL = 'general'
}

export interface SegmentFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater' | 'less' | 'between' | 'in' | 'notIn' | 'is_null' | 'is_not_null';
  value?: any;
  // Логический оператор для связи с предыдущим условием (не применяется к первому условию)
  logicOperator?: 'AND' | 'OR';
}

/**
 * Condition wrapper - обертка для условия или группы с индивидуальным логическим оператором
 */
export interface FilterCondition {
  // Условие или группа
  item: SegmentFilter | FilterGroup;
  // Логический оператор для связи с предыдущим условием (не применяется к первому)
  logicOperator: 'AND' | 'OR';
}

/**
 * Filter group with support for nested groups (recursive structure)
 * Теперь каждое условие имеет свой логический оператор
 */
export interface FilterGroup {
  // Deprecated: используется только для обратной совместимости
  logic?: 'AND' | 'OR';
  // Массив условий с индивидуальными операторами
  conditions: Array<FilterCondition>;
}

/**
 * Type guard to check if condition is a FilterGroup
 */
export function isFilterGroup(item: SegmentFilter | FilterGroup): item is FilterGroup {
  return 'conditions' in item && Array.isArray((item as FilterGroup).conditions);
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  filters: SegmentFilter[] | FilterGroup; // Support both old and new format
  filterLogic?: 'AND' | 'OR'; // Deprecated: use FilterGroup instead
  usageType: SegmentUsageType;
  contactsCount: number;
  isDynamic: boolean;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSegmentDto {
  name: string;
  description?: string;
  filters: FilterGroup; // Use new FilterGroup structure
  usageType: SegmentUsageType;
  isDynamic?: boolean;
  isActive?: boolean;
}

export interface UpdateSegmentDto {
  name?: string;
  description?: string;
  filters?: FilterGroup; // Use new FilterGroup structure
  usageType?: SegmentUsageType;
  isDynamic?: boolean;
  isActive?: boolean;
}

export interface SegmentContact {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: {
    id: string;
    name: string;
  };
  tags?: string[];
  createdAt: Date;
}

export interface PhoneNumber {
  contactId: string;
  phoneNumber: string;
  name: string;
}

export interface Email {
  contactId: string;
  email: string;
  name: string;
}
