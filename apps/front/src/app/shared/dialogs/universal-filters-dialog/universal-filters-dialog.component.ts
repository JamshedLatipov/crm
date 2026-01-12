import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import {
  UniversalFilter,
  BaseFilterState,
  FilterFieldDefinition,
} from '../../interfaces/universal-filter.interface';
import { UniversalFilterService } from '../../services/universal-filter.service';

export interface UniversalFiltersDialogData {
  title: string;
  staticFields: FilterFieldDefinition[];
  customFields: FilterFieldDefinition[];
  initialState: BaseFilterState;
  showSearch?: boolean;
  showStatus?: boolean;
}

/**
 * Universal filters dialog component
 * Can be used for any entity (contacts, leads, companies, deals)
 */
@Component({
  selector: 'app-universal-filters-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatDividerModule,
  ],
  templateUrl: './universal-filters-dialog.component.html',
  styleUrls: ['./universal-filters-dialog.component.scss'],
})
export class UniversalFiltersDialogComponent {
  private dialogRef = inject(MatDialogRef<UniversalFiltersDialogComponent>);
  private filterService = inject(UniversalFilterService);
  data = inject<UniversalFiltersDialogData>(MAT_DIALOG_DATA);

  // State
  search = signal<string>(this.data.initialState.search || '');
  isActive = signal<boolean>(
    this.data.initialState.isActive !== undefined
      ? this.data.initialState.isActive
      : true
  );
  staticFilters = signal<UniversalFilter[]>(
    this.data.initialState.filters.filter((f) => f.fieldType === 'static')
  );
  customFilters = signal<UniversalFilter[]>(
    this.data.initialState.filters.filter((f) => f.fieldType === 'custom')
  );

  /**
   * Add new static filter
   */
  addStaticFilter(): void {
    const newFilter = this.filterService.createDefaultFilter(
      'static',
      this.data.staticFields[0]
    );
    this.staticFilters.update((filters) => [...filters, newFilter]);
  }

  /**
   * Add new custom filter
   */
  addCustomFilter(): void {
    if (this.data.customFields.length === 0) return;
    const newFilter = this.filterService.createDefaultFilter(
      'custom',
      this.data.customFields[0]
    );
    this.customFilters.update((filters) => [...filters, newFilter]);
  }

  /**
   * Remove filter
   */
  removeFilter(index: number, fieldType: 'static' | 'custom'): void {
    if (fieldType === 'static') {
      this.staticFilters.update((filters) =>
        filters.filter((_, i) => i !== index)
      );
    } else {
      this.customFilters.update((filters) =>
        filters.filter((_, i) => i !== index)
      );
    }
  }

  /**
   * Update filter field and reset dependent properties
   */
  onFieldChange(filter: UniversalFilter, fieldName: string): void {
    const fields =
      filter.fieldType === 'static'
        ? this.data.staticFields
        : this.data.customFields;
    const field = fields.find((f) => f.name === fieldName);

    if (field) {
      filter.fieldName = field.name;
      filter.fieldLabel = field.label;

      // Reset operator to first available for this field type
      const operators = field.operators || this.filterService.getOperatorsForFieldType(field.type);
      filter.operator = operators[0];

      // Reset value
      filter.value = undefined;
    }
  }

  /**
   * Get operators for a filter
   */
  getOperatorsForFilter(filter: UniversalFilter) {
    const fields =
      filter.fieldType === 'static'
        ? this.data.staticFields
        : this.data.customFields;
    const field = fields.find((f) => f.name === filter.fieldName);

    if (!field) return [{ value: 'equals', label: 'Равно' }];

    const operators = field.operators || this.filterService.getOperatorsForFieldType(field.type);
    return operators.map((op) => ({
      value: op,
      label: this.filterService.getOperatorLabel(op),
    }));
  }

  /**
   * Check if field should show select dropdown
   */
  isSelectField(filter: UniversalFilter): boolean {
    const fields =
      filter.fieldType === 'static'
        ? this.data.staticFields
        : this.data.customFields;
    const field = fields.find((f) => f.name === filter.fieldName);
    return field ? this.filterService.isSelectField(field) : false;
  }

  /**
   * Get select options for a filter
   */
  getSelectOptions(filter: UniversalFilter) {
    const fields =
      filter.fieldType === 'static'
        ? this.data.staticFields
        : this.data.customFields;
    const field = fields.find((f) => f.name === filter.fieldName);
    return field ? this.filterService.getSelectOptions(field) : [];
  }

  /**
   * Get field type hint
   */
  getFieldTypeHint(filter: UniversalFilter): string {
    const fields =
      filter.fieldType === 'static'
        ? this.data.staticFields
        : this.data.customFields;
    const field = fields.find((f) => f.name === filter.fieldName);
    return field ? this.filterService.getFieldTypeHint(field.type) : '';
  }

  /**
   * Get input type for value field
   */
  getInputType(filter: UniversalFilter): string {
    const fields =
      filter.fieldType === 'static'
        ? this.data.staticFields
        : this.data.customFields;
    const field = fields.find((f) => f.name === filter.fieldName);
    
    if (!field) return 'text';
    
    switch (field.type) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      default:
        return 'text';
    }
  }

  /**
   * Get total count of all filters
   */
  getTotalFilters(): number {
    return this.staticFilters().length + this.customFilters().length;
  }

  /**
   * Check if any filters are active
   */
  hasAnyActiveFilters(): boolean {
    return (
      (this.search().trim().length > 0) ||
      this.getTotalFilters() > 0
    );
  }

  /**
   * Apply filters and close dialog
   */
  apply(): void {
    const result: BaseFilterState = {
      search: this.search().trim() || undefined,
      isActive: this.isActive(),
      filters: [...this.staticFilters(), ...this.customFilters()],
    };
    this.dialogRef.close(result);
  }

  /**
   * Reset all filters
   */
  reset(): void {
    this.search.set('');
    this.isActive.set(true);
    this.staticFilters.set([]);
    this.customFilters.set([]);
  }

  /**
   * Close dialog without applying
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Check if operator requires value input
   */
  requiresValue(operator: string): boolean {
    return operator !== 'exists';
  }
}
