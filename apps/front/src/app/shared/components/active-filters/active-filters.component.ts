import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UniversalFilterService } from '../../services/universal-filter.service';
import { UniversalFilter, FilterFieldDefinition } from '../../interfaces/universal-filter.interface';
import { UsersService, User } from '../../../users/users.service';

@Component({
  selector: 'app-active-filters',
  standalone: true,
  imports: [CommonModule, MatChipsModule, MatIconModule, MatButtonModule],
  templateUrl: './active-filters.component.html',
  styleUrl: './active-filters.component.scss',
})
export class ActiveFiltersComponent {
  private usersService = inject(UsersService);
  private usersCache = new Map<number | string, User>();
  private usersLoaded = false;

  // Inputs
  search = input<string>('');
  filters = input<UniversalFilter[]>([]);
  fieldDefinitions = input<FilterFieldDefinition[]>([]);
  
  // Outputs
  filterRemoved = output<number>();
  clearAllFilters = output<void>();
  
  constructor(public universalFilterService: UniversalFilterService) {
    // Load users for display in filters
    this.loadUsers();
  }

  /**
   * Load users for resolving user IDs to names
   */
  private loadUsers(): void {
    if (this.usersLoaded) return;
    
    this.usersService.getAllUsers().subscribe({
      next: (users) => {
        users.forEach(user => {
          if (user.id) {
            this.usersCache.set(user.id, user);
          }
        });
        this.usersLoaded = true;
      },
      error: (err) => {
        console.error('Error loading users for filter display:', err);
      }
    });
  }

  /**
   * Check if there are any active filters
   */
  hasActiveFilters(): boolean {
    return !!this.search() || this.filters().length > 0;
  }

  /**
   * Remove filter at specific index
   */
  removeFilter(index: number): void {
    this.filterRemoved.emit(index);
  }

  /**
   * Clear all filters
   */
  clearAll(): void {
    this.clearAllFilters.emit();
  }

  /**
   * Get display value for filter
   * Handles different types of values (arrays, objects, primitives)
   * and provides human-readable labels from selectOptions if available
   */
  getFilterDisplayValue(filter: UniversalFilter): string {
    if (filter.value === undefined || filter.value === null) {
      return '';
    }

    // Find the field definition for this filter
    const fieldDef = this.fieldDefinitions().find(f => f.name === filter.fieldName);

    // Handle array values (multiple selection)
    if (Array.isArray(filter.value)) {
      if (filter.value.length === 0) {
        return '';
      }
      
      // Map each value to its display label
      const displayValues = filter.value.map(val => 
        this.getSingleValueDisplay(val, fieldDef)
      );
      
      return displayValues.join(', ');
    }

    // Handle single value
    return this.getSingleValueDisplay(filter.value, fieldDef);
  }

  /**
   * Get display value for a single filter value
   */
  private getSingleValueDisplay(value: any, fieldDef?: FilterFieldDefinition): string {
    // If field definition has selectOptions, try to find the label
    if (fieldDef?.selectOptions && fieldDef.selectOptions.length > 0) {
      const option = fieldDef.selectOptions.find(opt => opt.value === value);
      if (option) {
        return option.label;
      }
    }

    // Check if this is a user field (assignedTo, createdBy, etc.)
    if (fieldDef && (fieldDef.name === 'assignedTo' || fieldDef.name === 'assignee' || 
        fieldDef.name === 'createdBy' || fieldDef.name === 'updatedBy' || 
        fieldDef.name === 'ownerId')) {
      // Try to resolve user ID to name
      const userId = typeof value === 'string' ? parseInt(value, 10) : value;
      if (typeof userId === 'number' && this.usersCache.has(userId)) {
        const user = this.usersCache.get(userId);
        if (user) {
          return this.getUserDisplayName(user);
        }
      }
    }

    // For user references (assignedTo, createdBy, etc.), show value as-is
    // The parent component should have already resolved user IDs to names
    // If it's still a number, we can't resolve it here without the user service
    if (typeof value === 'object' && value !== null) {
      // If value is an object with display properties
      if (value.label) return value.label;
      if (value.name) return value.name;
      if (value.fullName) return value.fullName;
      if (value.email) return value.email;
    }

    // Return the value as-is
    return String(value);
  }

  /**
   * Get user display name
   */
  private getUserDisplayName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.fullName) {
      return user.fullName;
    }
    if (user.name) {
      return user.name;
    }
    if (user.username) {
      return user.username;
    }
    if (user.email) {
      return user.email;
    }
    return user.id ? `User #${user.id}` : 'Unknown User';
  }
}
