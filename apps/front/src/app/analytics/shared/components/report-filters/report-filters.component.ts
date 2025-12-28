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
          >
            <mat-option value="inbound">Входящие</mat-option>
            <mat-option value="outbound">Исходящие</mat-option>
            <mat-option value="internal">Внутренние</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Статус</mat-label>
          <mat-select
            [(ngModel)]="selectedStatuses"
            multiple
            (selectionChange)="onFiltersChange()"
          >
            <mat-option value="ANSWERED">Отвечен</mat-option>
            <mat-option value="NO ANSWER">Не отвечен</mat-option>
            <mat-option value="BUSY">Занято</mat-option>
            <mat-option value="ABANDON">Брошен</mat-option>
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

    .apply-btn {
      height: 48px;
    }

    .reset-btn {
      height: 48px;
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
}
