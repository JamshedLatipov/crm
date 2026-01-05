import { Component, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { CallFilters, CallDirection } from '../../../models/analytics.models';

@Component({
  selector: 'app-report-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
  ],
  template: `
    <div class="filters-container">
      <div class="filters-row">
        <mat-form-field appearance="outline">
          <mat-label>Дата начала</mat-label>
          <input
            matInput
            [matDatepicker]="startPicker"
            [(ngModel)]="startDate"
            (dateChange)="onDateChange()"
          />
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Дата окончания</mat-label>
          <input
            matInput
            [matDatepicker]="endPicker"
            [(ngModel)]="endDate"
            (dateChange)="onDateChange()"
          />
          <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Направление</mat-label>
          <mat-select
            [(ngModel)]="selectedDirections"
            multiple
            (selectionChange)="onFiltersChange()"
            hideSingleSelectionIndicator
          >
            <mat-select-trigger>
              @if (selectedDirections().length === 0) {
                <span class="placeholder-text">Все направления</span>
              } @else if (selectedDirections().length === 1) {
                <span>{{ getDirectionLabel(selectedDirections()[0]) }}</span>
              } @else {
                <span>Выбрано: {{ selectedDirections().length }}</span>
              }
            </mat-select-trigger>
            <mat-option value="inbound" [disabled]="false">Входящие</mat-option>
            <mat-option value="outbound" [disabled]="false">Исходящие</mat-option>
            <mat-option value="internal" [disabled]="false">Внутренние</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Статус</mat-label>
          <mat-select
            [(ngModel)]="selectedStatuses"
            multiple
            (selectionChange)="onFiltersChange()"
            hideSingleSelectionIndicator
          >
            <mat-select-trigger>
              @if (selectedStatuses().length === 0) {
                <span class="placeholder-text">Все статусы</span>
              } @else if (selectedStatuses().length === 1) {
                <span>{{ getStatusLabel(selectedStatuses()[0]) }}</span>
              } @else {
                <span>Выбрано: {{ selectedStatuses().length }}</span>
              }
            </mat-select-trigger>
            <mat-option value="ANSWERED" [disabled]="false">Отвечен</mat-option>
            <mat-option value="NO ANSWER" [disabled]="false">Не отвечен</mat-option>
            <mat-option value="BUSY" [disabled]="false">Занято</mat-option>
            <mat-option value="ABANDON" [disabled]="false">Брошен</mat-option>
          </mat-select>
        </mat-form-field>

        <button
          mat-raised-button
          color="primary"
          (click)="applyFilters()"
          class="apply-btn"
        >
          <mat-icon>filter_list</mat-icon>
          Применить
        </button>

        <button
          mat-button
          (click)="resetFilters()"
          class="reset-btn"
        >
          <mat-icon>clear</mat-icon>
          Сбросить
        </button>
      </div>

      <!-- Selected filters chips -->
      @if (hasActiveFilters()) {
        <div class="active-filters">
          <span class="filters-label">Активные фильтры:</span>
          @for (dir of selectedDirections(); track dir) {
            <mat-chip class="filter-chip" (removed)="removeDirection(dir)">
              {{ getDirectionLabel(dir) }}
              <mat-icon matChipRemove>cancel</mat-icon>
            </mat-chip>
          }
          @for (status of selectedStatuses(); track status) {
            <mat-chip class="filter-chip" (removed)="removeStatus(status)">
              {{ getStatusLabel(status) }}
              <mat-icon matChipRemove>cancel</mat-icon>
            </mat-chip>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .filters-container {
      background: white;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .filters-row {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    mat-form-field {
      min-width: 200px;
    }

    /* Remove inner border from select panel */
    ::ng-deep .mat-mdc-select-panel {
      border: none !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
    }

    ::ng-deep .mat-mdc-select-panel-above {
      border: none !important;
    }

    .placeholder-text {
      color: rgba(0, 0, 0, 0.6);
    }

    .apply-btn {
      height: 48px;
    }

    .reset-btn {
      height: 48px;
    }

    .active-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .filters-label {
      font-size: 13px;
      font-weight: 500;
      color: #666;
      margin-right: 4px;
    }

    .filter-chip {
      background-color: #e3f2fd !important;
      color: #1976d2 !important;
      font-size: 12px;
      height: 24px;
    }

    .filter-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      opacity: 0.7;
    }

    .filter-chip mat-icon:hover {
      opacity: 1;
    }

    ::ng-deep .mat-mdc-chip {
      --mdc-chip-container-height: 24px;
    }

    /* Hide checkboxes in multi-select */
    ::ng-deep .mat-pseudo-checkbox {
      display: none !important;
    }

    /* Remove extra padding from options when checkboxes are hidden */
    ::ng-deep .mat-mdc-option.mat-mdc-option-multiple {
      padding-left: 16px !important;
    }

    /* Ensure selected state is visible */
    ::ng-deep .mat-mdc-option.mat-mdc-option-multiple.mdc-list-item--selected {
      background-color: rgba(63, 81, 181, 0.12);
    }

    ::ng-deep .mat-mdc-option.mat-mdc-option-multiple.mdc-list-item--selected:not(.mdc-list-item--disabled) {
      background-color: rgba(63, 81, 181, 0.12);
    }
  `],
})
export class ReportFiltersComponent {
  filtersChange = output<CallFilters>();

  startDate = signal<Date | null>(this.getDefaultStartDate());
  endDate = signal<Date | null>(new Date());
  selectedDirections = signal<string[]>([]);
  selectedStatuses = signal<string[]>([]);

  constructor() {
    // Emit initial filters
    effect(() => {
      this.emitFilters();
    }, { allowSignalWrites: true });
  }

  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date;
  }

  onDateChange(): void {
    this.emitFilters();
  }

  onFiltersChange(): void {
    // Will be triggered by ngModel changes
  }

  applyFilters(): void {
    this.emitFilters();
  }

  resetFilters(): void {
    this.startDate.set(this.getDefaultStartDate());
    this.endDate.set(new Date());
    this.selectedDirections.set([]);
    this.selectedStatuses.set([]);
    this.emitFilters();
  }

  private emitFilters(): void {
    const filters: CallFilters = {
      startDate: this.startDate()?.toISOString(),
      endDate: this.endDate()?.toISOString(),
    };

    if (this.selectedDirections().length > 0) {
      filters.directions = this.selectedDirections() as CallDirection[];
    }

    if (this.selectedStatuses().length > 0) {
      filters.statuses = this.selectedStatuses();
    }

    this.filtersChange.emit(filters);
  }

  hasActiveFilters(): boolean {
    return this.selectedDirections().length > 0 || this.selectedStatuses().length > 0;
  }

  getDirectionLabel(value: string): string {
    const labels: { [key: string]: string } = {
      'inbound': 'Входящие',
      'outbound': 'Исходящие',
      'internal': 'Внутренние',
    };
    return labels[value] || value;
  }

  getStatusLabel(value: string): string {
    const labels: { [key: string]: string } = {
      'ANSWERED': 'Отвечен',
      'NO ANSWER': 'Не отвечен',
      'BUSY': 'Занято',
      'ABANDON': 'Брошен',
    };
    return labels[value] || value;
  }

  removeDirection(dir: string): void {
    const current = this.selectedDirections();
    this.selectedDirections.set(current.filter(d => d !== dir));
    this.emitFilters();
  }

  removeStatus(status: string): void {
    const current = this.selectedStatuses();
    this.selectedStatuses.set(current.filter(s => s !== status));
    this.emitFilters();
  }
}
