import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { PromoCompaniesService } from '../../services/promo-companies.service';
import { PromoCompany } from '../../models/promo-company.model';
import { CreatePromoCompanyDialogComponent } from '../create-promo-company-dialog/create-promo-company-dialog.component';
import { EditPromoCompanyDialogComponent } from '../edit-promo-company-dialog/edit-promo-company-dialog.component';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-promo-companies-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatDividerModule,
    PageLayoutComponent,
  ],
  template: `
    <app-page-layout
      title="Промо-компании"
      subtitle="Управление промоутерскими кампаниями и партнерами"
    >
      <div page-actions>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          Создать промо-компанию
        </button>
      </div>

      <!-- Статистика -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <mat-icon>campaign</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">Всего кампаний</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon success">
              <mat-icon>play_circle</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.active }}</div>
              <div class="stat-label">Активных</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon warning">
              <mat-icon>pause_circle</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.paused }}</div>
              <div class="stat-label">Приостановленных</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon primary">
              <mat-icon>group</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalLeads }}</div>
              <div class="stat-label">Всего лидов</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Фильтры -->
      <div class="filters-section">
        <div class="filters-card">
          <div class="filters-grid">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Поиск</mat-label>
              <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()" placeholder="По названию кампании" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>
        </div>
      </div>

      <!-- Таблица -->
      <div class="table-container">
        <!-- Загрузка -->
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Загрузка промо-компаний...</p>
        </div>

        <!-- Пустое состояние -->
        <div *ngIf="!isLoading && filteredPromoCompanies.length === 0" class="empty-state">
          <mat-icon class="empty-icon">campaign</mat-icon>
          <h3>{{ searchQuery ? 'Кампании не найдены' : 'Нет промо-компаний' }}</h3>
          <p>{{ searchQuery ? 'Попробуйте изменить параметры поиска' : 'Создайте первую промо-компанию для начала работы' }}</p>
          <ng-container *ngIf="!searchQuery">
            <button mat-raised-button color="primary" (click)="openCreateDialog()">
              <mat-icon>add</mat-icon>
              Создать промо-компанию
            </button>
          </ng-container>
        </div>

        <!-- Таблица -->
        <div *ngIf="!isLoading && filteredPromoCompanies.length > 0">
          <table mat-table [dataSource]="paginatedPromoCompanies" class="promo-companies-table">

            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>
                <button class="th-sort" (click)="onHeaderSort('name')">
                  Название кампании
                  <mat-icon class="sort-icon">{{ sortBy === 'name' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}</mat-icon>
                </button>
              </th>
              <td mat-cell *matCellDef="let promoCompany">
                <div class="name-cell">
                  <div class="campaign-icon">{{ promoCompany.name ? (promoCompany.name.charAt(0) | uppercase) : '?' }}</div>
                  <div class="name-meta">
                    <div class="campaign-name">{{ promoCompany.name || 'Без названия' }}</div>
                    <div *ngIf="promoCompany.description" class="campaign-description">{{ promoCompany.description }}</div>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Type Column -->
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Тип</th>
              <td mat-cell *matCellDef="let promoCompany">
                <span class="type-badge" [ngClass]="'type-' + promoCompany.type">{{ getTypeLabel(promoCompany.type) }}</span>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Статус</th>
              <td mat-cell *matCellDef="let promoCompany">
                <span class="status-badge" [ngClass]="'status-' + promoCompany.status">{{ getStatusLabel(promoCompany.status) }}</span>
              </td>
            </ng-container>

            <!-- Leads Count Column -->
            <ng-container matColumnDef="leadsCount">
              <th mat-header-cell *matHeaderCellDef>
                <button class="th-sort" (click)="onHeaderSort('leadsCount')">
                  Лиды
                  <mat-icon class="sort-icon">{{ sortBy === 'leadsCount' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}</mat-icon>
                </button>
              </th>
              <td mat-cell *matCellDef="let promoCompany">
                <div class="leads-count">{{ promoCompany.leadsReached || 0 }}</div>
              </td>
            </ng-container>

            <!-- Budget Column -->
            <ng-container matColumnDef="budget">
              <th mat-header-cell *matHeaderCellDef>
                <button class="th-sort" (click)="onHeaderSort('budget')">
                  Бюджет
                  <mat-icon class="sort-icon">{{ sortBy === 'budget' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}</mat-icon>
                </button>
              </th>
              <td mat-cell *matCellDef="let promoCompany">
                <div class="budget-cell">{{ promoCompany.budget ? (promoCompany.budget | currency:'RUB':'symbol':'1.0-0') : '-' }}</div>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let promoCompany" class="actions-cell">
                <button mat-icon-button matTooltip="Просмотр" (click)="viewPromoCompany(promoCompany)"><mat-icon>visibility</mat-icon></button>
                <button mat-icon-button matTooltip="Редактировать" (click)="editPromoCompany(promoCompany)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button [matMenuTriggerFor]="promoMenu" matTooltip="Действия"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #promoMenu="matMenu">
                  <button mat-menu-item (click)="duplicatePromoCompany(promoCompany)"><mat-icon>content_copy</mat-icon><span>Дублировать</span></button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="deletePromoCompany(promoCompany)" class="delete-action"><mat-icon>delete</mat-icon><span>Удалить</span></button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
          </table>
          <div class="table-footer">
            <div class="footer-info">
              <!-- optional summary or controls could go here -->
            </div>
            <mat-paginator [length]="totalResults" [pageSize]="pageSize" [pageIndex]="currentPage" [pageSizeOptions]="[10,25,50,100]" (page)="onPageChange($event)" showFirstLastButtons></mat-paginator>
          </div>
        </div>
      </div>
    </app-page-layout>
  `,
  styles: [`
    .promo-companies-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;

      .header-content {
        h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: 16px;
        }
      }

      .header-actions {
        display: flex;
        gap: 12px;

        button[mat-raised-button][color="primary"] {
          background: var(--primary-color);
          color: #fff;
          border-radius: 10px;
          padding: 10px 16px;
          font-weight: 600;
          box-shadow: 0 6px 20px rgba(47,120,255,0.12);
        }

        button[mat-icon-button] {
          min-width: 40px;
        }
      }
    }

    .stats-section {
      margin-bottom: 32px;

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: var(--card-bg);
        border-radius: 12px;
        border: 1px solid var(--border-color);

        .stat-icon {
          width: 48px;
          height: 48px;
          padding: 0;
          border-radius: 50%;
          background: var(--primary-color-light);
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: center;

          &.success {
            background: rgba(46, 125, 50, 0.1);
            color: #2e7d32;
          }

          &.warning {
            background: rgba(237, 108, 2, 0.1);
            color: #ed6c02;
          }

          &.primary {
            background: var(--primary-color-light);
            color: var(--primary-color);
          }

          mat-icon {
            width: 24px;
            height: 24px;
            font-size: 24px;
          }
        }

        .stat-content {
          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 14px;
            color: var(--text-secondary);
          }
        }
      }
    }

    .filters-section {
      margin-bottom: 24px;

      .filters-card {
        .filters-grid {
          display: flex;
          justify-content: flex-end;
          align-items: center;

          mat-form-field.search-field {
            width: 300px;
          }

          mat-form-field .mat-mdc-form-field-flex {
            border-radius: 10px;
            background: #ffffff;
            border: 1px solid #e6e9ee;
            padding-left: 12px;
            padding-right: 8px;
            align-items: center;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
          }

          mat-form-field .mat-mdc-text-field-input {
            padding: 12px 8px;
          }

          mat-form-field .mat-mdc-form-field-suffix {
            margin-right: 8px;
          }
        }
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 32px;

      p {
        margin-top: 16px;
        color: var(--text-secondary);
      }
    }

    .empty-state {
      text-align: center;
      padding: 64px 32px;

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--text-disabled);
        margin-bottom: 24px;
      }

      h3 {
        margin: 0 0 12px 0;
        color: var(--text-primary);
      }

      p {
        margin: 0 0 24px 0;
        color: var(--text-secondary);
      }
    }

    .table-container {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      margin-bottom: 32px;
      display: flex;
      flex-direction: column;
    }

    .promo-companies-table {
      width: 100%;
      background-color: white;
    }

    .table-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-top: 1px solid #e6e9ee;
      background: var(--card-bg);
    }

    .table-footer .mat-paginator {
      margin-left: auto;
    }

    .mat-mdc-header-row {
      background-color: #f8f9fa;
      border-bottom: 1px solid #e1e4e8;
    }

    .mat-mdc-header-cell {
      font-size: 12px;
      font-weight: 600;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 16px 12px;
      border-bottom: none;
    }

    .th-sort {
      background: none;
      border: none;
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

    .mat-mdc-cell {
      padding: 16px 12px;
      border-bottom: 1px solid #f1f3f4;
      font-size: 14px;
      color: #1a1a1a;
    }

    .table-row {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .table-row:hover {
      background-color: #f8f9fa;
    }

    .name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .campaign-icon {
      background: var(--primary-color, #667eea);
      color: white;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .name-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      .campaign-name {
        font-weight: 600;
        font-size: 14px;
        color: var(--text-primary);
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      .campaign-description {
        font-size: 12px;
        color: #6b7280;
      }
    }

    .type-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      text-transform: capitalize;
    }

    .type-badge.type-promoter {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .type-badge.type-affiliate {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }

    .type-badge.type-partner {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      text-transform: capitalize;
    }

    .status-badge.status-draft {
      background-color: #f5f5f5;
      color: #616161;
    }

    .status-badge.status-active {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-badge.status-paused {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .status-badge.status-completed {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .status-badge.status-cancelled {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .leads-count {
      font-weight: 600;
      color: var(--text-primary);
      text-align: center;
    }

    .budget-cell {
      font-weight: 600;
      color: var(--text-primary);
    }

    .actions-cell {
      text-align: right;
      width: 120px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;

      .mat-mdc-menu-item {
        &.delete-action {
          color: #dc2626;

          .mat-icon {
            color: #dc2626;
          }
        }
      }
    }

    .mat-mdc-menu-item {
      &.delete-action {
        color: #dc2626;

        .mat-icon {
          color: #dc2626;
        }
      }
    }

    .promo-companies-table .mat-icon-button {
      color: #6b7280;
    }

    .promo-companies-table .mat-icon-button:hover {
      color: #374151;
      background-color: rgba(37,99,235,0.06);
    }

    /* Переменные для темной темы */
    :host-context(.dark) {
      --primary-color: #3b82f6;
      --primary-color-light: rgba(59, 130, 246, 0.1);
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --text-disabled: #6b7280;
      --card-bg: #1f2937;
      --border-color: #374151;

      .table-container {
        background-color: #1f2937;
      }

      .promo-companies-table {
        background-color: #1f2937;
      }

      .mat-mdc-header-row {
        background-color: #374151;
        border-bottom-color: #4b5563;
      }

      .mat-mdc-header-cell {
        color: #d1d5db;
      }

      .mat-mdc-cell {
        color: #f9fafb;
        border-bottom-color: #374151;
      }

      .table-row:hover {
        background-color: #374151;
      }
    }

    /* Переменные для светлой темы */
    :host-context(.light), :host {
      --primary-color: #2563eb;
      --primary-color-light: rgba(37, 99, 235, 0.1);
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --text-disabled: #9ca3af;
      --card-bg: #ffffff;
      --border-color: #e5e7eb;
    }

    @media (max-width: 768px) {
      .promo-companies-page {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `]
})
export class PromoCompaniesListComponent implements OnInit {
  private readonly promoCompaniesService = inject(PromoCompaniesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  promoCompanies: PromoCompany[] = [];
  filteredPromoCompanies: PromoCompany[] = [];
  paginatedPromoCompanies: PromoCompany[] = [];

  searchQuery = '';
  sortBy = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  isLoading = false;

  displayedColumns = ['name', 'type', 'status', 'leadsCount', 'budget', 'actions'];

  // Пагинация
  pageSize = 25;
  currentPage = 0;
  totalResults = 0;

  // Статистика
  stats = {
    total: 0,
    active: 0,
    paused: 0,
    totalLeads: 0
  };

  ngOnInit(): void {
    this.loadPromoCompanies();
  }

  loadPromoCompanies(): void {
    this.isLoading = true;
    this.promoCompaniesService.getAll().subscribe({
      next: (data) => {
        this.promoCompanies = data;
        this.applyFilters();
        this.calculateStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading promo companies:', error);
        this.snackBar.open('Ошибка загрузки промо-компаний', 'Закрыть', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.promoCompanies];

    // Поиск
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(promo =>
        promo.name?.toLowerCase().includes(query) ||
        promo.description?.toLowerCase().includes(query)
      );
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'leadsCount':
          aValue = a.leadsReached || 0;
          bValue = b.leadsReached || 0;
          break;
        case 'budget':
          aValue = a.budget || 0;
          bValue = b.budget || 0;
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredPromoCompanies = filtered;
    this.totalResults = filtered.length;
    this.updatePagination();
  }

  updatePagination(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPromoCompanies = this.filteredPromoCompanies.slice(startIndex, endIndex);
  }

  calculateStats(): void {
    const total = this.promoCompanies.length;
    const active = this.promoCompanies.filter(p => p.status === 'active').length;
    const paused = this.promoCompanies.filter(p => p.status === 'paused').length;
    const totalLeads = this.promoCompanies.reduce((sum, p) => sum + (p.leadsReached || 0), 0);

    this.stats = { total, active, paused, totalLeads };
  }

  onSearchChange(): void {
    this.currentPage = 0;
    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagination();
  }

  onHeaderSort(column: 'name' | 'leadsCount' | 'budget'): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreatePromoCompanyDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPromoCompanies();
        this.snackBar.open('Промо-компания успешно создана', 'Закрыть', { duration: 3000 });
      }
    });
  }

  viewPromoCompany(promoCompany: PromoCompany): void {
    // TODO: Implement view dialog or navigation
    this.snackBar.open('Просмотр пока не реализован', 'Закрыть', { duration: 3000 });
  }

  editPromoCompany(promoCompany: PromoCompany): void {
    const dialogRef = this.dialog.open(EditPromoCompanyDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: { promoCompany }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPromoCompanies();
        this.snackBar.open('Промо-компания обновлена', 'Закрыть', { duration: 3000 });
      }
    });
  }

  duplicatePromoCompany(promoCompany: PromoCompany): void {
    const dialogRef = this.dialog.open(CreatePromoCompanyDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {
        promoCompany: {
          ...promoCompany,
          name: `${promoCompany.name} (копия)`,
          id: undefined,
          leads: []
        },
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPromoCompanies();
        this.snackBar.open('Промо-компания продублирована', 'Закрыть', { duration: 3000 });
      }
    });
  }

  deletePromoCompany(promoCompany: PromoCompany): void {
    if (confirm(`Вы уверены, что хотите удалить промо-компанию "${promoCompany.name}"?`)) {
      this.promoCompaniesService.delete(promoCompany.id).subscribe({
        next: () => {
          this.snackBar.open('Промо-компания удалена', 'Закрыть', { duration: 3000 });
          this.loadPromoCompanies();
        },
        error: (error) => {
          console.error('Error deleting promo company:', error);
          this.snackBar.open('Ошибка удаления промо-компании', 'Закрыть', { duration: 3000 });
        }
      });
    }
  }

  getTypeLabel(type: string): string {
    const labels = {
      'promoter': 'Промоутер',
      'affiliate': 'Партнер',
      'partner': 'Партнер'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getStatusLabel(status: string): string {
    const labels = {
      'draft': 'Черновик',
      'active': 'Активна',
      'paused': 'Приостановлена',
      'completed': 'Завершена',
      'cancelled': 'Отменена'
    };
    return labels[status as keyof typeof labels] || status;
  }
}