import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UniversalFilterService } from '../../services/universal-filter.service';
import { UniversalFilter } from '../../interfaces/universal-filter.interface';

@Component({
  selector: 'app-active-filters',
  standalone: true,
  imports: [CommonModule, MatChipsModule, MatIconModule, MatButtonModule],
  templateUrl: './active-filters.component.html',
  styleUrl: './active-filters.component.scss',
})
export class ActiveFiltersComponent {
  // Inputs
  search = input<string>('');
  filters = input<UniversalFilter[]>([]);
  
  // Outputs
  filterRemoved = output<number>();
  clearAllFilters = output<void>();
  
  constructor(public universalFilterService: UniversalFilterService) {}

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
}
