import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';

export interface CrmColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  cell?: (row: any) => string | number | null;
}

@Component({
  selector: 'crm-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCheckboxModule,
  ],
  template: `
    <div class="crm-table">
      <div class="crm-table-toolbar" *ngIf="title">
        <h3 class="crm-table-title">{{ title }}</h3>
        <div class="crm-table-actions">
          <button mat-icon-button *ngIf="loading | async" aria-label="loading">
            <mat-progress-spinner
              diameter="20"
              mode="indeterminate"
            ></mat-progress-spinner>
          </button>
        </div>
      </div>

      <table
        mat-table
        [dataSource]="pagedData"
        matSort
        class="mat-elevation-z1 crm-deals-table deals-style"
      >
        <ng-container matColumnDef="select" *ngIf="selectable">
          <th mat-header-cell *matHeaderCellDef style="width:48px">
            <mat-checkbox
              (change)="toggleAll($event)"
              [checked]="allSelected"
            ></mat-checkbox>
          </th>
          <td mat-cell *matCellDef="let row" style="width:48px">
            <mat-checkbox
              (change)="toggleRow(row, $event)"
              [checked]="isSelected(row)"
            ></mat-checkbox>
          </td>
        </ng-container>

        <ng-container *ngFor="let col of columns" [matColumnDef]="col.key">
          <th
            mat-header-cell
            *matHeaderCellDef
            [style.width]="col.width || null"
          >
            <div class="th-wrap">
              <span class="th-label">{{ col.label }}</span>
              <button
                *ngIf="col.sortable"
                class="th-sort"
                (click)="$event.stopPropagation()"
              >
                <mat-icon class="sort-icon">unfold_more</mat-icon>
              </button>
            </div>
          </th>
          <td mat-cell *matCellDef="let row">
            <div class="cell-wrap">
              <div *ngIf="col.key === 'title'" class="title-cell">
                <div class="avatar circle">
                  {{
                    (renderCell(row, { key: col.key, label: '' }) || '?')
                      .toString()
                      .charAt(0)
                  }}
                </div>
                <div class="title-meta">
                  <div class="title-main">{{ renderCell(row, col) }}</div>
                  <div class="title-sub" *ngIf="row.subtitle">
                    {{ row.subtitle }}
                  </div>
                </div>
              </div>
              <ng-container
                *ngIf="col.key !== 'title' && col.key !== 'actions'"
                >{{ renderCell(row, col) }}</ng-container
              >
              <ng-container *ngIf="col.key === 'actions'">
                <div class="actions-cell">
                  <span class="actions-inner" [innerHTML]="renderCell(row, col)"></span>
                </div>
              </ng-container>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr
          mat-row
          *matRowDef="let row; columns: displayedColumns"
          (click)="onRowClick(row)"
        ></tr>
      </table>

      <div class="crm-table-footer">
        <mat-paginator
          *ngIf="showPaginator"
          [length]="total"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          (page)="onPage($event)"
        ></mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .crm-table {
        width: 100%;
        background: var(--card-bg, #ffffff);
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      .crm-table-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
      }
      .crm-table-title {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--text-primary);
      }
      table.crm-deals-table {
        width: 100%;
        border-collapse: separate;
        background-color: white;
        border-spacing: 0;
      }
      /* compact header - matching deals style */
      .crm-deals-table .mat-mdc-header-row {
        background-color: #f8f9fa;
        border-bottom: 1px solid #e1e4e8;
      }
      .crm-deals-table th.mat-header-cell:first-child,
      .crm-deals-table .mat-mdc-header-cell:first-child {
        border-top-left-radius: 12px;
      }
      .crm-deals-table th.mat-header-cell:last-child,
      .crm-deals-table .mat-mdc-header-cell:last-child {
        border-top-right-radius: 12px;
      }
      .crm-deals-table tr:last-child td.mat-cell:first-child,
      .crm-deals-table .mat-mdc-row:last-child .mat-mdc-cell:first-child {
        border-bottom-left-radius: 12px;
      }
      .crm-deals-table tr:last-child td.mat-cell:last-child,
      .crm-deals-table .mat-mdc-row:last-child .mat-mdc-cell:last-child {
        border-bottom-right-radius: 12px;
      }
      .crm-deals-table th.mat-header-cell,
      .crm-deals-table .mat-mdc-header-cell {
        background: #f8f9fa;
        padding: 16px 12px;
        font-weight: 600;
        color: #6c757d;
        border-bottom: 1px solid #e1e4e8;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      /* compact rows - matching deals style */
      .crm-deals-table td.mat-cell,
      .crm-deals-table .mat-mdc-cell {
        padding: 16px 12px;
        vertical-align: middle;
        font-size: 14px;
        color: #1a1a1a;
        border-bottom: 1px solid #f1f3f4;
      }
      .crm-deals-table tr.mat-row,
      .crm-deals-table .mat-mdc-row {
        transition: background-color 0.2s ease;
        cursor: pointer;
      }
      .crm-deals-table tr.mat-row:hover,
      .crm-deals-table .mat-mdc-row:hover {
        background-color: #f8f9fa;
      }
      .th-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .th-label {
        font-size: 12px;
        color: #6c757d;
      }
      .th-sort {
        background: none;
        border: 0;
        padding: 0;
        font: inherit;
        color: inherit;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      .sort-icon {
        font-size: 16px;
        opacity: 0.7;
      }
      .title-cell {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .avatar {
        background: var(--primary-color, #667eea);
        color: #fff;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 20px;
        flex-shrink: 0;
      }
      .title-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .title-main {
        font-weight: 600;
        color: var(--primary-color);
        font-size: 14px;
      }
      .title-sub {
        font-size: 12px;
        color: #6b7280;
        margin-top: 2px;
      }
      /* actions always visible */
      .actions-cell {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        width: 120px;
      }
      .actions-inner {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .crm-table-footer {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--card-bg, #fff);
      }
      .crm-table-footer .mat-paginator {
        margin-left: auto;
      }
      /* Icon styling - matching deals */
      .crm-deals-table .mat-icon {
        vertical-align: middle;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .crm-deals-table .mat-icon-button {
        width: 36px;
        height: 36px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
      }
      .crm-deals-table .mat-icon-button:hover {
        color: #374151;
        background-color: rgba(37, 99, 235, 0.06);
        border-radius: 6px;
      }
      .crm-deals-table .mat-icon-button .mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      /* Dark theme support */
      :host-context(.dark) {
        --primary-color: #3b82f6;
        --text-primary: #f9fafb;
        --card-bg: #1f2937;

        .crm-table {
          background-color: #1f2937;
        }

        .crm-deals-table {
          background-color: #1f2937;
        }

        .crm-deals-table .mat-mdc-header-row {
          background-color: #374151;
          border-bottom-color: #4b5563;
        }

        .crm-deals-table .mat-mdc-header-cell {
          color: #d1d5db;
          background-color: #374151;
        }

        .crm-deals-table .mat-mdc-cell {
          color: #f9fafb;
          border-bottom-color: #374151;
        }

        .crm-deals-table .mat-mdc-row:hover {
          background-color: #374151;
        }
      }
      /* Light theme defaults */
      :host-context(.light),
      :host {
        --primary-color: #2563eb;
        --text-primary: #111827;
        --card-bg: #ffffff;
      }
    `,
  ],
})
export class CrmTableComponent implements AfterViewInit {
  @Input() title?: string;
  @Input() columns: CrmColumn[] = [];
  @Input() data: any[] = [];
  @Input() pageSize = 10;
  @Input() pageSizeOptions = [5, 10, 25, 50];
  @Input() showPaginator = true;
  @Input() selectable = false;

  @Output() rowClick = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  loading = new BehaviorSubject<boolean>(false);

  displayedColumns: string[] = [];
  pagedData: any[] = [];
  total = 0;

  private selected = new Set<any>();
  allSelected = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngAfterViewInit(): void {
    this.setupColumns();
    this.reload();
  }

  ngOnChanges(): void {
    this.setupColumns();
    this.reload();
  }

  private setupColumns() {
    this.displayedColumns = [];
    if (this.selectable) this.displayedColumns.push('select');
    this.displayedColumns.push(...this.columns.map((c) => c.key));
    this.total = this.data ? this.data.length : 0;
  }

  private applyPaging() {
    const pageIndex = this.paginator ? this.paginator.pageIndex : 0;
    const size = this.paginator
      ? this.paginator.pageSize || this.pageSize
      : this.pageSize;
    const start = pageIndex * size;
    this.pagedData = this.data ? this.data.slice(start, start + size) : [];
  }

  reload() {
    this.applyPaging();
  }

  onPage(e: any) {
    this.applyPaging();
  }

  onRowClick(row: any) {
    this.rowClick.emit(row);
  }

  renderCell(row: any, col: CrmColumn): string | SafeHtml {
    try {
      if (col.cell) {
        const result = col.cell(row);
        if (col.key === 'actions') {
          return this.sanitizer.bypassSecurityTrustHtml(result as string);
        }
        return result;
      }
      return row[col.key] ?? '';
    } catch {
      return '';
    }
  }

  toggleRow(row: any, ev: any) {
    if (ev.checked) this.selected.add(row);
    else this.selected.delete(row);
    this.allSelected =
      this.selected.size > 0 && this.selected.size === (this.data?.length || 0);
    this.selectionChange.emit(Array.from(this.selected));
  }

  toggleAll(ev: any) {
    if (ev.checked) {
      this.data?.forEach((d) => this.selected.add(d));
      this.allSelected = true;
    } else {
      this.selected.clear();
      this.allSelected = false;
    }
    this.selectionChange.emit(Array.from(this.selected));
  }

  isSelected(row: any) {
    return this.selected.has(row);
  }
}
