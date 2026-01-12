export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'email'
  | 'phone'
  | 'url'
  | 'textarea';

export type EntityType = 'contact' | 'lead' | 'deal' | 'company';

export interface ValidationRule {
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'min'
    | 'max'
    | 'pattern'
    | 'email'
    | 'url'
    | 'phone';
  value?: any;
  message?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface DisplayConfig {
  label: string;
  description?: string;
  placeholder?: string;
  icon?: string;
  helpText?: string;
  showInList?: boolean;
  showInDetail?: boolean;
  showInFilters?: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  entityType: EntityType;
  name: string;
  label: string;
  fieldType: FieldType;
  validationRules?: ValidationRule[];
  selectOptions?: SelectOption[];
  displayConfig: DisplayConfig;
  isActive: boolean;
  sortOrder: number;
  defaultValue?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomFieldDto {
  entityType: EntityType;
  name: string;
  label: string;
  fieldType: FieldType;
  validationRules?: ValidationRule[];
  selectOptions?: SelectOption[];
  displayConfig: DisplayConfig;
  isActive?: boolean;
  sortOrder?: number;
  defaultValue?: string;
}

export interface UpdateCustomFieldDto {
  name?: string;
  label?: string;
  fieldType?: FieldType;
  validationRules?: ValidationRule[];
  selectOptions?: SelectOption[];
  displayConfig?: DisplayConfig;
  isActive?: boolean;
  sortOrder?: number;
  defaultValue?: string;
}
