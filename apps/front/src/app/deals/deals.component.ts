import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmActionDialogComponent } from '../shared/dialogs/confirm-action-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import { DealsService } from '../pipeline/deals.service';
import { Deal, DealStatus as DealStatusEnum } from '../pipeline/dtos';
import { DealStatus as DealStatusType, DealStatusComponent } from '../shared/components/deal-status/deal-status.component';
import { StatusTabsComponent } from '../shared/components/status-tabs/status-tabs.component';
import { DealFormComponent } from './components/deal-form.component/deal-form.component';
import { PageLayoutComponent } from '../shared/page-layout/page-layout.component';
import { StatusChangeDialogComponent, StatusChangeData, StatusChangeResult } from './components/status-change-dialog.component';
import { User } from '../users/users.service';
import { Subscription } from 'rxjs';

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
    DealStatusComponent,
    StatusTabsComponent,
    PageLayoutComponent,
    MatPaginatorModule
    ,
    MatDialogModule,
    ConfirmActionDialogComponent
  ],
  templateUrl: './deals.component.html',
  styleUrls: ['./deals.component.scss']
})
export class DealsComponent implements OnInit, OnDestroy {
  private readonly dealsService = inject(DealsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly subs = new Subscription();

  deals: Deal[] = [];
  filteredDeals: Deal[] = [];
  paginatedDeals: Deal[] = [];
  
  searchQuery = '';
  selectedStatus: string | null = null;
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  isLoading = false;
  
  // Колонки таблицы
  displayedColumns = ['title', 'contact', 'amount', 'status', 'expectedCloseDate', 'assignedTo', 'actions'];
  
  // Пагинация
  pageSize = 25;
  currentPage = 0;
  totalResults?: number;
  
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
    this.subs.add(
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

          this.subs.add(
            dialogRef.afterClosed().subscribe(result => {
              if (result) {
                this.loadDeals();
                this.snackBar.open('Сделка успешно создана', 'Закрыть', { duration: 3000 });
              }
            })
          );
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadDeals() {
    this.isLoading = true;
    // Pass 1-based page index to backend if supported
    const backendPage = this.currentPage + 1;
    this.dealsService.listDeals(backendPage, this.pageSize, {
      q: this.searchQuery || undefined,
      status: this.selectedStatus || undefined,
      sortBy: this.sortBy,
      sortDir: this.sortDirection
    }).subscribe({
      next: (res) => {
        // Accept both array or paged response { items, total }
        const data: Deal[] = Array.isArray(res) ? res : (res as any).items || [];
        const totalFromBackend: number | undefined = Array.isArray(res) ? undefined : (res as any).total;

        // Нормализуем данные сделок, убеждаемся что amount - число
        this.deals = data.map(deal => ({
          ...deal,
          amount: typeof deal.amount === 'number' ? deal.amount : parseFloat(deal.amount as any) || 0
        }));

        // Update totalResults (if backend provided total)
        this.totalResults = typeof totalFromBackend === 'number' ? totalFromBackend : undefined;

        // When backend provided paged response, show server page directly; otherwise, client-side filtering will be applied
        if (typeof this.totalResults === 'number') {
          this.filteredDeals = [...this.deals];
          this.updatePagination();
        } else {
          this.applyFilters();
        }

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
    // Build a working copy of available deals (typically current page when backend paging is used)
    let filtered = Array.isArray(this.deals) ? [...this.deals] : [];

    const query = (this.searchQuery || '').toString().trim().toLowerCase();

    // Safe search: guard against missing fields
    if (query) {
      filtered = filtered.filter(deal => {
        const title = (deal.title || '').toString().toLowerCase();
        const contactName = (deal.contact?.name || '').toString().toLowerCase();
        const companyName = (deal.company?.name || '').toString().toLowerCase();
        const notes = (deal.notes || '').toString().toLowerCase();
        return title.includes(query) || contactName.includes(query) || companyName.includes(query) || notes.includes(query);
      });
    }

    // Filter by status if provided
    if (this.selectedStatus) {
      filtered = filtered.filter(deal => deal?.status === this.selectedStatus);
    }

    // Sorting: keep original behavior but guard field access
    filtered.sort((a, b) => {
      let aValue: string | number | Date | undefined;
      let bValue: string | number | Date | undefined;

      switch (this.sortBy) {
        case 'amount':
          aValue = typeof a.amount === 'number' ? a.amount : parseFloat(a.amount as any) || 0;
          bValue = typeof b.amount === 'number' ? b.amount : parseFloat(b.amount as any) || 0;
          break;
        case 'expectedCloseDate':
          aValue = a.expectedCloseDate ? new Date(a.expectedCloseDate) : new Date(0);
          bValue = b.expectedCloseDate ? new Date(b.expectedCloseDate) : new Date(0);
          break;
        case 'title':
          aValue = (a.title || '').toString().toLowerCase();
          bValue = (b.title || '').toString().toLowerCase();
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt ? new Date(a.createdAt) : new Date(0);
          bValue = b.createdAt ? new Date(b.createdAt) : new Date(0);
          break;
      }

      // Compare gracefully
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return this.sortDirection === 'asc' ? -1 : 1;
      if (bValue == null) return this.sortDirection === 'asc' ? 1 : -1;

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Even when server-side paging is used (totalResults present), allow client-side filtering/sorting
    // on the page of items we have fetched. This makes search/tabs work immediately without
    // requiring backend filtering to be implemented.
    this.filteredDeals = filtered;
    // Reset to first page of client-side view
    this.currentPage = 0;
    this.updatePagination();
  }

  updatePagination() {
    // If server-side paging is active, `filteredDeals` already contains the page items returned by backend
    if (typeof this.totalResults === 'number') {
      this.paginatedDeals = [...this.filteredDeals];
      return;
    }

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
    // When user types, request server-side filtered results (or client-side if backend returns full array)
    this.currentPage = 0;
    this.loadDeals();
  }

  onFilterChange() {
    this.currentPage = 0;
    this.loadDeals();
  }

  onSortChange() {
    this.currentPage = 0;
    this.loadDeals();
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    // Re-fetch page from backend (server-side paging)
    this.loadDeals();
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
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px',
      data: {
        title: 'Удалить сделку',
        message: `Вы уверены, что хотите удалить сделку "${deal.title}"?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
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
    });
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
    const statusStr = event.status as string;
    const dtoStatus = statusStr === 'open' ? DealStatusEnum.OPEN : statusStr === 'won' ? DealStatusEnum.WON : DealStatusEnum.LOST;
    this.dealsService.updateDeal(event.deal.id, { status: dtoStatus }).subscribe({
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
    this.dealsService.assignDeal(event.deal.id, event.assignedTo).subscribe({
      next: (updatedDeal) => {
        // Обновляем локальную копию сделки
        const index = this.deals.findIndex(d => d.id === updatedDeal.id);
        if (index !== -1) {
          // Создаем новый объект сделки с обновленными данными
          // Это триггернет ngOnChanges в дочернем компоненте
          this.deals[index] = { ...updatedDeal };
          this.applyFilters();
        }
        this.snackBar.open(
          `Ответственный изменен на ${event.user?.name || event.assignedTo}`, 
          'Закрыть', 
          { duration: 3000 }
        );
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

  // Сортировка по клику на заголовки таблицы
  onHeaderSort(column: 'title' | 'amount' | 'expectedCloseDate') {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'desc';
    }
    this.currentPage = 0;
    this.loadDeals();
  }

  onStatusTabChange(status: string | null) {
    this.selectedStatus = status;
    this.applyFilters();
  }
}