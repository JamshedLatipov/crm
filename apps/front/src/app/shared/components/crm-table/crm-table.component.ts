import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
  AfterContentInit,
  ContentChildren,
  Directive,
  Input as NgInput,
  QueryList,
  TemplateRef,
  OnChanges,
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
import { BehaviorSubject } from 'rxjs';

export interface CrmColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  cell?: (row: any) => string | number | null;
  template?: string; // Template reference name for ng-template
}

/**
 * Directive to mark a projected template for a specific column key.
 * Usage: <ng-template crmColumnTemplate="status" let-row>...</ng-template>
 */
@Directive({ selector: '[crmColumnTemplate]', standalone: true })
export class CrmColumnTemplateDirective {
  @NgInput('crmColumnTemplate') name!: string;
  constructor(public template: TemplateRef<any>) {}
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
  templateUrl: './crm-table.component.html',
  styleUrls: ['./crm-table.component.scss']
})
export class CrmTableComponent implements AfterViewInit, AfterContentInit, OnChanges {
  // Collect projected templates marked with CrmColumnTemplateDirective
  @ContentChildren(CrmColumnTemplateDirective) projected?: QueryList<CrmColumnTemplateDirective>;

  // Map of projected templates by name
  projectedTemplates: { [k: string]: TemplateRef<any> } = {};

  ngAfterContentInit() {
    if (this.projected) {
      this.projectedTemplates = {};
      this.projected.forEach((d) => {
        if (d && d.name && d.template) {
          this.projectedTemplates[d.name] = d.template;
        }
      });
    }
  }

  // Support both @Input() templates and projectedTemplates
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
  @Input() templates: { [key: string]: TemplateRef<any> } = {};

  loading = new BehaviorSubject<boolean>(false);

  displayedColumns: string[] = [];
  pagedData: any[] = [];
  total = 0;

  private selected = new Set<any>();
  allSelected = false;

  constructor() {}

  getTemplate(templateName: string): TemplateRef<any> | null {
    return this.templates[templateName] || this.projectedTemplates[templateName] || null;
  }

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

  renderCell(row: any, col: CrmColumn): string {
    try {
      if (col.cell) {
        const result = col.cell(row);
        return result as string;
      }
      return row[col.key] ?? '';
    } catch {
      return '';
    }
  }

  isActionsColumn(col: CrmColumn): boolean {
    return col.key === 'actions';
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
