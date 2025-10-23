import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule, MatCheckboxModule],
  template: `
    <div class="crm-table">
      <div class="crm-table-toolbar" *ngIf="title">
        <h3 class="crm-table-title">{{ title }}</h3>
        <div class="crm-table-actions">
          <button mat-icon-button *ngIf="loading | async" aria-label="loading"><mat-progress-spinner diameter="20" mode="indeterminate"></mat-progress-spinner></button>
        </div>
      </div>

      <table mat-table [dataSource]="pagedData" matSort class="mat-elevation-z1 crm-deals-table">

        <ng-container matColumnDef="select" *ngIf="selectable">
          <th mat-header-cell *matHeaderCellDef style="width:48px"><mat-checkbox (change)="toggleAll($event)" [checked]="allSelected"></mat-checkbox></th>
          <td mat-cell *matCellDef="let row" style="width:48px"><mat-checkbox (change)="toggleRow(row, $event)" [checked]="isSelected(row)"></mat-checkbox></td>
        </ng-container>

        <ng-container *ngFor="let col of columns" [matColumnDef]="col.key">
          <th mat-header-cell *matHeaderCellDef [style.width]="col.width || null">
            <div class="th-wrap">
              <span class="th-label">{{ col.label }}</span>
              <button *ngIf="col.sortable" class="th-sort" (click)="$event.stopPropagation();"> <mat-icon class="sort-icon">unfold_more</mat-icon></button>
            </div>
          </th>
          <td mat-cell *matCellDef="let row">
            <div class="cell-wrap">
              <div *ngIf="col.key === 'title'" class="title-cell">
                <div class="avatar">{{ (renderCell(row, { key: col.key, label: '' }) || '?').toString().charAt(0) }}</div>
                <div class="title-meta">{{ renderCell(row, col) }}</div>
              </div>
              <ng-container *ngIf="col.key !== 'title' && col.key !== 'actions'">{{ renderCell(row, col) }}</ng-container>
              <ng-container *ngIf="col.key === 'actions'">{{ renderCell(row, col) }}</ng-container>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;" (click)="onRowClick(row)"></tr>
      </table>

      <div class="crm-table-footer">
        <mat-paginator *ngIf="showPaginator" [length]="total" [pageSize]="pageSize" [pageSizeOptions]="pageSizeOptions" (page)="onPage($event)"></mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
    .crm-table { width: 100%; background: var(--card-bg, #fff); border-radius: 10px; overflow: hidden; }
    .crm-table-toolbar { display:flex; align-items:center; justify-content:space-between; padding: 16px 20px; border-bottom: 1px solid #e6e9ee; }
    .crm-table-title { margin:0; font-size:18px; font-weight:700; color: var(--text-primary); }
    table.crm-deals-table { width:100%; border-collapse: separate; }
    .crm-deals-table th.mat-header-cell { background: transparent; padding: 12px 16px; font-weight:600; color: var(--text-secondary); border-bottom: 1px solid #eef2f6; }
    .crm-deals-table td.mat-cell { padding: 12px 16px; vertical-align: middle; }
    .crm-deals-table tr.mat-row:hover { background: rgba(47,120,255,0.03); }
    .th-wrap { display:flex; align-items:center; gap:8px; }
    .th-label { font-size:13px; color:var(--text-muted); }
    .th-sort { background:none; border:0; padding:4px; cursor:pointer; }
    .title-cell { display:flex; align-items:center; gap:12px; }
    .avatar { width:36px; height:36px; border-radius:6px; background:var(--primary-color-light, #eef5ff); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--primary-color, #2f78ff); }
    .title-meta { font-weight:600; }
    .crm-table-footer { padding: 8px 12px; display:flex; justify-content:flex-end; }
    `
  ]
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
    this.displayedColumns.push(...this.columns.map(c => c.key));
    this.total = this.data ? this.data.length : 0;
  }

  private applyPaging() {
    const pageIndex = this.paginator ? this.paginator.pageIndex : 0;
    const size = this.paginator ? this.paginator.pageSize || this.pageSize : this.pageSize;
    const start = pageIndex * size;
    this.pagedData = this.data ? this.data.slice(start, start + size) : [];
  }

  reload() {
    this.applyPaging();
  }

  onPage(e: any) {
    this.applyPaging();
  }

  onRowClick(row: any) { this.rowClick.emit(row); }

  renderCell(row: any, col: CrmColumn) {
    try {
      if (col.cell) return col.cell(row);
      return row[col.key] ?? '';
    } catch { return '' }
  }

  toggleRow(row: any, ev: any) {
    if (ev.checked) this.selected.add(row); else this.selected.delete(row);
    this.allSelected = this.selected.size > 0 && this.selected.size === (this.data?.length || 0);
    this.selectionChange.emit(Array.from(this.selected));
  }

  toggleAll(ev: any) {
    if (ev.checked) { this.data?.forEach(d => this.selected.add(d)); this.allSelected = true; }
    else { this.selected.clear(); this.allSelected = false; }
    this.selectionChange.emit(Array.from(this.selected));
  }

  isSelected(row: any) { return this.selected.has(row); }
}
