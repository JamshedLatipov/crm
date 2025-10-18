import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import { DealsService } from '../pipeline/deals.service';
import { Deal, DealStatus } from '../pipeline/dtos';
import { User } from '../users/users.service';
import { DealFormComponent } from './components/deal-form.component/deal-form.component';
import { DealStatusComponent } from '../shared/components';
import { StatusChangeDialogComponent, StatusChangeData, StatusChangeResult } from './components/status-change-dialog.component';

@Component({
  selector: 'app-deals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatPaginatorModule,
    DealStatusComponent
  ],
  template: `
    <div class="deals-page">
      <!-- Заголовок страницы -->
      <div class="page-header">
        <div class="header-content">
          <h1>Сделки</h1>
          <p class="subtitle">Управление всеми сделками компании</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Создать сделку
          </button>
        </div>
      </div>

      <!-- Фильтры и поиск -->
      <div class="filters-section">
        <mat-card class="filters-card">
          <mat-card-content>
            <div class="filters-grid">
              <!-- Поиск -->
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Поиск сделок</mat-label>
                <input matInput 
                       [(ngModel)]="searchQuery" 
                       (ngModelChange)="onSearchChange()"
                       placeholder="Название, контакт, компания...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <!-- Фильтр по статусу -->
              <mat-form-field appearance="outline">
                <mat-label>Статус</mat-label>
                <mat-select [(value)]="selectedStatus" (selectionChange)="onFilterChange()">
                  <mat-option [value]="null">Все</mat-option>
                  <mat-option value="open">Открыты</mat-option>
                  <mat-option value="won">Выиграны</mat-option>
                  <mat-option value="lost">Проиграны</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Сортировка -->
              <mat-form-field appearance="outline">
                <mat-label>Сортировка</mat-label>
                <mat-select [(value)]="sortBy" (selectionChange)="onSortChange()">
                  <mat-option value="createdAt">По дате создания</mat-option>
                  <mat-option value="expectedCloseDate">По дате закрытия</mat-option>
                  <mat-option value="amount">По сумме</mat-option>
                  <mat-option value="title">По названию</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Направление сортировки -->
              <button mat-icon-button 
                      (click)="toggleSortDirection()"
                      [title]="sortDirection === 'asc' ? 'Сортировка по возрастанию' : 'Сортировка по убыванию'">
                <mat-icon>{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Статистика -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">Всего сделок</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon success">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.won }}</div>
              <div class="stat-label">Выиграно</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon warning">
              <mat-icon>hourglass_empty</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.open }}</div>
              <div class="stat-label">В работе</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon primary">
              <mat-icon>monetization_on</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ (stats.totalValue || 0) | currency:'RUB':'symbol':'1.0-0' }}</div>
              <div class="stat-label">Общая сумма</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Список сделок -->
      <div class="deals-section">
        <!-- Загрузка -->
        @if (isLoading) {
          <div class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Загрузка сделок...</p>
          </div>
        }

        <!-- Пустое состояние -->
        @if (!isLoading && filteredDeals.length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">handshake</mat-icon>
            <h3>{{ searchQuery ? 'Сделки не найдены' : 'Нет сделок' }}</h3>
            <p>{{ searchQuery ? 'Попробуйте изменить параметры поиска' : 'Создайте первую сделку для начала работы' }}</p>
            @if (!searchQuery) {
              <button mat-raised-button color="primary" (click)="openCreateDialog()">
                <mat-icon>add</mat-icon>
                Создать сделку
              </button>
            }
          </div>
        }

        <!-- Таблица сделок -->
        @if (!isLoading && filteredDeals.length > 0) {
          <div class="table-container">
            <table mat-table [dataSource]="paginatedDeals" class="mat-elevation-z1 deals-table">
              
              <!-- Title Column -->
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Название сделки</th>
                <td mat-cell *matCellDef="let deal">
                  <div class="title-cell">
                    <mat-icon class="deal-icon">handshake</mat-icon>
                    <div class="title-meta">
                      <div class="deal-title">
                        <button mat-button class="title-link" (click)="viewDeal(deal)">
                          {{ deal.title }}
                        </button>
                      </div>
                      @if (deal.stage) {
                        <div class="deal-stage">
                          {{ deal.stage.name }}
                        </div>
                      }
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Contact Column -->
              <ng-container matColumnDef="contact">
                <th mat-header-cell *matHeaderCellDef>Контакт</th>
                <td mat-cell *matCellDef="let deal">
                  @if (deal.contact) {
                    <div>
                      <div class="contact-name">{{ deal.contact.name }}</div>
                      @if (deal.company) {
                        <div class="contact-company">{{ deal.company.name }}</div>
                      }
                    </div>
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
              </ng-container>

              <!-- Amount Column -->
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Сумма</th>
                <td mat-cell *matCellDef="let deal">
                  <div class="amount-cell">
                    <div class="amount-value">
                      {{ deal.amount || 0 | currency : deal.currency : 'symbol' : '1.0-0' }}
                    </div>
                    <div class="amount-probability">{{ deal.probability }}% вероятность</div>
                  </div>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Статус</th>
                <td mat-cell *matCellDef="let deal">
                  <div class="status-actions">
                    <app-deal-status 
                      [status]="deal.status"
                      [showIndicators]="true"
                      [isOverdue]="isOverdue(deal)"
                      [isHighValue]="(deal.amount || 0) > 50000"
                      size="small">
                    </app-deal-status>
                    
                    <!-- Быстрые действия для открытых сделок -->
                    @if (deal.status === 'open') {
                      <div class="quick-actions">
                        <button mat-icon-button 
                                matTooltip="Отметить выигранной" 
                                (click)="markAsWon(deal)"
                                class="quick-action win">
                          <mat-icon>check_circle</mat-icon>
                        </button>
                        <button mat-icon-button 
                                matTooltip="Отметить проигранной" 
                                (click)="markAsLost(deal)"
                                class="quick-action lose">
                          <mat-icon>cancel</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </td>
              </ng-container>

              <!-- Expected Close Date Column -->
              <ng-container matColumnDef="expectedCloseDate">
                <th mat-header-cell *matHeaderCellDef>Дата закрытия</th>
                <td mat-cell *matCellDef="let deal">
                  <div class="date-cell" [class.overdue]="isOverdue(deal) && deal.status === 'open'">
                    {{ deal.expectedCloseDate | date : 'dd.MM.yyyy' }}
                    @if (isOverdue(deal) && deal.status === 'open') {
                      <mat-icon class="overdue-icon">warning</mat-icon>
                    }
                  </div>
                </td>
              </ng-container>

              <!-- Assigned To Column -->
              <ng-container matColumnDef="assignedTo">
                <th mat-header-cell *matHeaderCellDef>Ответственный</th>
                <td mat-cell *matCellDef="let deal">
                  @if (deal.assignedTo) {
                    <span>{{ deal.assignedTo }}</span>
                  } @else {
                    <span class="muted">Не назначен</span>
                  }
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let deal" class="actions-cell">
                  <button mat-icon-button matTooltip="Просмотр" (click)="viewDeal(deal)">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Редактировать" (click)="openEditDialog(deal)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  
                  <!-- Меню действий для смены статуса -->
                  <button mat-icon-button [matMenuTriggerFor]="dealMenu" matTooltip="Действия">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #dealMenu="matMenu">
                    @if (deal.status === 'open') {
                      <button mat-menu-item (click)="markAsWon(deal)">
                        <mat-icon>check_circle</mat-icon>
                        <span>Отметить выигранной</span>
                      </button>
                      <button mat-menu-item (click)="markAsLost(deal)">
                        <mat-icon>cancel</mat-icon>
                        <span>Отметить проигранной</span>
                      </button>
                      <mat-divider></mat-divider>
                    }
                    <button mat-menu-item (click)="duplicateDeal(deal)">
                      <mat-icon>content_copy</mat-icon>
                      <span>Дублировать</span>
                    </button>
                    <button mat-menu-item (click)="deleteDeal(deal)" class="delete-action">
                      <mat-icon>delete</mat-icon>
                      <span>Удалить</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
            </table>
          </div>
        }

        <!-- Пагинация -->
        @if (!isLoading && filteredDeals.length > pageSize) {
          <mat-paginator 
            [length]="filteredDeals.length"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50, 100]"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>
        }
      </div>
    </div>
  `,
  styles: [`
    .deals-page {
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
        button {
          min-width: 160px;
        }
      }
    }

    .filters-section {
      margin-bottom: 24px;
      
      .filters-card {
        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 16px;
          align-items: center;
          
          .search-field {
            min-width: 300px;
          }
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
          padding: 12px;
          border-radius: 50%;
          background: var(--primary-color-light);
          
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

    .deals-grid {
      display: grid;
      gap: 24px;
      margin-bottom: 32px;
    }

    /* Стили таблицы (в стиле контактов) */
    .table-container {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      margin-bottom: 32px;
    }

    .deals-table {
      width: 100%;
      background-color: white;
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

    .title-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .deal-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 50%;
      padding: 6px;
      font-size: 18px;
    }

    .title-meta {
      .deal-title {
        font-weight: 600;
        margin-bottom: 2px;
      }
      
      .title-link {
        color: var(--primary-color);
        text-decoration: none;
        padding: 0;
        min-width: auto;
        
        &:hover {
          text-decoration: underline;
          background: transparent;
        }
      }
      
      .deal-stage {
        font-size: 12px;
        color: #6b7280;
      }
    }

    .contact-name {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .contact-company {
      font-size: 12px;
      color: #6b7280;
    }

    .amount-cell {
      .amount-value {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 2px;
      }
      
      .amount-probability {
        font-size: 12px;
        color: #6b7280;
      }
    }

    .date-cell {
      display: flex;
      align-items: center;
      gap: 4px;
      
      &.overdue {
        color: #dc2626;
        font-weight: 500;
      }
      
      .overdue-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #dc2626;
      }
    }

    .status-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .quick-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
        
        .quick-action {
          width: 28px;
          height: 28px;
          
          .mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
          
          &.win {
            color: #16a34a;
            
            &:hover {
              background-color: rgba(22, 163, 74, 0.1);
            }
          }
          
          &.lose {
            color: #dc2626;
            
            &:hover {
              background-color: rgba(220, 38, 38, 0.1);
            }
          }
        }
      }
    }

    .table-row:hover .quick-actions {
      opacity: 1;
    }

    .muted {
      color: #9ca3af;
    }

    .actions-cell {
      text-align: right;
      width: 120px;
      
      .mat-mdc-menu-item {
        &.delete-action {
          color: #dc2626;
          
          .mat-icon {
            color: #dc2626;
          }
        }
      }
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
      
      .deals-table {
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
      .deals-page {
        padding: 16px;
      }
      
      .page-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .filters-grid {
        grid-template-columns: 1fr !important;
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
export class DealsComponent implements OnInit {
  private readonly dealsService = inject(DealsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  deals: Deal[] = [];
  filteredDeals: Deal[] = [];
  paginatedDeals: Deal[] = [];
  
  searchQuery = '';
  selectedStatus: DealStatus | null = null;
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  isLoading = false;
  
  // Колонки таблицы
  displayedColumns = ['title', 'contact', 'amount', 'status', 'expectedCloseDate', 'assignedTo', 'actions'];
  
  // Пагинация
  pageSize = 25;
  currentPage = 0;
  
  // Статистика
  stats: {
    total: number;
    open: number;
    won: number;
    lost: number;
    totalValue: number;
  } = {
    total: 0,
    open: 0,
    won: 0,
    lost: 0,
    totalValue: 0
  };

  ngOnInit() {
    this.loadDeals();
    // If navigated with a contactId (for quick create), open the create dialog
    // and prefill contact when provided via query params.
    this.route.queryParamMap.subscribe((params) => {
      const contactId = params.get('contactId');
      const newFlag = params.get('new');
      if (contactId && newFlag) {
        // Open the create dialog and pass contactId through data
        const dialogRef = this.dialog.open(DealFormComponent, {
          width: '700px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: { mode: 'create', contactId },
          disableClose: false
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadDeals();
            this.snackBar.open('Сделка успешно создана', 'Закрыть', { duration: 3000 });
          }
        });
      }
    });
  }

  loadDeals() {
    this.isLoading = true;
    this.dealsService.listDeals().subscribe({
      next: (deals) => {
        // Нормализуем данные сделок, убеждаемся что amount - число
        this.deals = deals.map(deal => ({
          ...deal,
          amount: typeof deal.amount === 'number' ? deal.amount : parseFloat(deal.amount) || 0
        }));
        this.applyFilters();
        this.calculateStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки сделок:', error);
        this.snackBar.open('Ошибка загрузки сделок', 'Закрыть', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    let filtered = [...this.deals];

    // Поиск
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(deal =>
        deal.title.toLowerCase().includes(query) ||
        (deal.contact?.name?.toLowerCase().includes(query)) ||
        (deal.company?.name?.toLowerCase().includes(query)) ||
        (deal.notes?.toLowerCase().includes(query))
      );
    }

    // Фильтр по статусу
    if (this.selectedStatus) {
      filtered = filtered.filter(deal => deal.status === this.selectedStatus);
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (this.sortBy) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'expectedCloseDate':
          aValue = new Date(a.expectedCloseDate);
          bValue = new Date(b.expectedCloseDate);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredDeals = filtered;
    this.currentPage = 0;
    this.updatePagination();
  }

  updatePagination() {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedDeals = this.filteredDeals.slice(startIndex, endIndex);
  }

  calculateStats() {
    const total = this.deals.length;
    const open = this.deals.filter(d => d.status === 'open').length;
    const won = this.deals.filter(d => d.status === 'won').length;
    const lost = this.deals.filter(d => d.status === 'lost').length;
    const totalValue = this.deals.reduce((sum, deal) => {
      const amount = typeof deal.amount === 'number' ? deal.amount : parseFloat(deal.amount) || 0;
      return sum + amount;
    }, 0);

    this.stats = { total, open, won, lost, totalValue };
  }

  onSearchChange() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  onSortChange() {
    this.applyFilters();
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagination();
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(DealFormComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { mode: 'create' },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDeals();
        this.snackBar.open('Сделка успешно создана', 'Закрыть', { duration: 3000 });
      }
    });
  }

  openEditDialog(deal: Deal) {
    const dialogRef = this.dialog.open(DealFormComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { deal, mode: 'edit' },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDeals();
        this.snackBar.open('Сделка успешно обновлена', 'Закрыть', { duration: 3000 });
      }
    });
  }

  deleteDeal(deal: Deal) {
    if (confirm(`Вы уверены, что хотите удалить сделку "${deal.title}"?`)) {
      this.dealsService.deleteDeal(deal.id).subscribe({
        next: () => {
          this.loadDeals();
          this.snackBar.open('Сделка удалена', 'Закрыть', { duration: 3000 });
        },
        error: (error) => {
          console.error('Ошибка удаления сделки:', error);
          this.snackBar.open('Ошибка удаления сделки', 'Закрыть', { duration: 3000 });
        }
      });
    }
  }

  duplicateDeal(deal: Deal) {
    const dialogRef = this.dialog.open(DealFormComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { 
        deal: { 
          ...deal, 
          title: `${deal.title} (копия)`,
          id: undefined 
        }, 
        mode: 'create' 
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDeals();
        this.snackBar.open('Сделка продублирована', 'Закрыть', { duration: 3000 });
      }
    });
  }

  changeStatus(event: { deal: Deal; status: string }) {
    this.dealsService.updateDeal(event.deal.id, { status: event.status as DealStatus }).subscribe({
      next: (updatedDeal) => {
        // Обновляем локальную копию сделки
        const index = this.deals.findIndex(d => d.id === updatedDeal.id);
        if (index !== -1) {
          this.deals[index] = updatedDeal;
          this.applyFilters();
          this.calculateStats();
        }
        const statusText = event.status === 'won' ? 'выиграна' : 'проиграна';
        this.snackBar.open(`Сделка отмечена как ${statusText}`, 'Закрыть', { duration: 3000 });
      },
      error: (error) => {
        console.error('Ошибка изменения статуса:', error);
        this.snackBar.open('Ошибка при изменении статуса', 'Закрыть', { duration: 3000 });
      }
    });
  }

  markAsWon(deal: Deal) {
    if (deal.status === 'won') return;
    
    const dialogRef = this.dialog.open(StatusChangeDialogComponent, {
      width: '500px',
      data: { deal, newStatus: 'won' } as StatusChangeData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: StatusChangeResult) => {
      if (result?.confirmed) {
        this.changeStatus({ deal, status: 'won' });
        // TODO: Сохранить комментарий result.notes если нужно
      }
    });
  }

  markAsLost(deal: Deal) {
    if (deal.status === 'lost') return;
    
    const dialogRef = this.dialog.open(StatusChangeDialogComponent, {
      width: '500px',
      data: { deal, newStatus: 'lost' } as StatusChangeData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: StatusChangeResult) => {
      if (result?.confirmed) {
        this.changeStatus({ deal, status: 'lost' });
        // TODO: Сохранить комментарий result.notes если нужно
      }
    });
  }

  changeStage(deal: Deal) {
    // TODO: Реализовать изменение этапа
    console.log('Изменение этапа:', deal);
    this.snackBar.open('Функция пока не реализована', 'Закрыть', { duration: 3000 });
  }

  changeAssignee(event: { deal: Deal; assignedTo: string; user: User }) {
    this.dealsService.updateDeal(event.deal.id, { assignedTo: event.assignedTo }).subscribe({
      next: (updatedDeal) => {
        // Обновляем локальную копию сделки
        const index = this.deals.findIndex(d => d.id === updatedDeal.id);
        if (index !== -1) {
          this.deals[index] = updatedDeal;
          this.applyFilters();
        }
        this.snackBar.open(`Ответственный изменен на ${event.user.name}`, 'Закрыть', { duration: 3000 });
      },
      error: (error) => {
        console.error('Ошибка изменения ответственного:', error);
        this.snackBar.open('Ошибка при изменении ответственного', 'Закрыть', { duration: 3000 });
      }
    });
  }

  viewDeal(deal: Deal) {
    this.router.navigate(['/deals/view', deal.id]);
  }

  isOverdue(deal: Deal): boolean {
    if (!deal.expectedCloseDate) return false;
    const expectedDate = new Date(deal.expectedCloseDate);
    const today = new Date();
    return expectedDate < today && deal.status === 'open';
  }
}
