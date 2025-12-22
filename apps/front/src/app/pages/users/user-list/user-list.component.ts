import { Component, signal, inject, OnInit, ChangeDetectionStrategy, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ConfirmActionDialogComponent } from '../../../shared/dialogs/confirm-action-dialog.component';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { UserManagementService, User, UserFilters } from '../../../services/user-management.service';
import { PasswordResetSnackbarComponent } from '../../../shared/components/password-reset-snackbar/password-reset-snackbar.component';
import { StatusTabsComponent } from '../../../shared/components/status-tabs/status-tabs.component';
import { roleDisplay, getWorkloadColor } from '../../../shared/utils';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatMenuModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatDialogModule,
  ConfirmActionDialogComponent,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule
    ,
    StatusTabsComponent,
    PageLayoutComponent
  ],
  // Note: ConfirmActionDialogComponent used programmatically via MatDialog
  templateUrl: './user-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  
  // Component state
  public readonly selectedUsers = signal<User[]>([]);
  public readonly filters = signal<UserFilters>({});
  public readonly searchControl = new FormControl('');
  public readonly statusControl = new FormControl('');
  public readonly selectedStatus = signal<string>('');
  public readonly currentPage = signal<number>(0);
  public readonly pageSize = signal<number>(25);
  
  protected readonly userService = inject(UserManagementService);
  // Computed properties
  public readonly filteredUsers = signal<User[]>([]);
  public readonly paginatedUsers = signal<User[]>([]);
  
  // Table configuration
  public readonly displayedColumns = [
    'select', 'user', 'username', 'department', 
    'roles', 'skills', 'workload', 'status', 'actions'
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Создаем эффект для отслеживания изменений пользователей
    effect(() => {
      // Реагируем на изменения в сервисе
      const filteredUsers = this.userService.filteredUsers();
      
      // Обновляем локальные данные
      this.filteredUsers.set(filteredUsers);
      this.updatePagination();
    });

    // Подписываемся на изменения поискового запроса
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(value => {
        this.onSearchChange(value || '');
      });

    // Подписываемся на изменения фильтра статуса
    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(value => {
        this.onStatusFilterChange(value || '');
        // Keep the selectedStatus signal in sync when control changes
        this.selectedStatus.set(value || '');
      });
  }

  // Tabs for status filtering
  userTabs = [
    { label: 'Все', value: '' },
    { label: 'Активные', value: 'active' },
    { label: 'Доступные', value: 'available' },
    { label: 'Неактивные', value: 'inactive' },
  ];

  ngOnInit(): void {
    // Сначала загружаем пользователей
    this.loadUsersAndSetupFilters();
  }

  private loadUsersAndSetupFilters(): void {
    this.userService.loadUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // После загрузки сразу обновляем фильтрованный список
          this.updateFilteredUsers();
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.snackBar.open('Ошибка загрузки пользователей', 'Закрыть', {
            duration: 5000
          });
        }
      });
  }

  // Search and filtering
  onSearchChange(searchValue: string): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, search: searchValue });
    this.userService.setFilters(this.filters());
    this.updateFilteredUsers();
  }

  onFiltersChange(): void {
    this.userService.setFilters(this.filters());
    this.updateFilteredUsers();
  }

  onStatusFilterChange(statusValue: string): void {
    // Keep the FormControl value in sync with tab clicks but don't re-emit the valueChanges
    // subscription (it already calls this method) to avoid recursion.
    this.statusControl.setValue(statusValue, { emitEvent: false });

    const currentFilters = this.filters();
    const status = statusValue;
    
    if (status === 'active') {
      this.filters.set({ ...currentFilters, isActive: true });
    } else if (status === 'inactive') {
      this.filters.set({ ...currentFilters, isActive: false });
    } else if (status === 'available') {
      this.filters.set({ ...currentFilters, isActive: true, isAvailable: true });
    } else {
      const { isActive, isAvailable, ...otherFilters } = currentFilters;
      this.filters.set(otherFilters);
    }
    
    this.userService.setFilters(this.filters());
    this.updateFilteredUsers();
    // reflect in signal for template bindings
    this.selectedStatus.set(statusValue || '');
  }

  clearFilters(): void {
    this.filters.set({});
    this.searchControl.setValue('');
    this.statusControl.setValue('');
    this.userService.clearFilters();
    this.updateFilteredUsers();
  }

  hasActiveFilters(): boolean {
    const filters = this.filters();
    return Object.keys(filters).length > 0 || (this.searchControl.value || '').length > 0;
  }

  private updateFilteredUsers(): void {
    this.filteredUsers.set(this.userService.filteredUsers());
    this.updatePagination();
  }

  // Pagination
  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updatePagination();
  }

  private updatePagination(): void {
    const startIndex = this.currentPage() * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    this.paginatedUsers.set(
      this.filteredUsers().slice(startIndex, endIndex)
    );
  }

  // Selection management
  toggleUserSelection(user: User): void {
    const selected = this.selectedUsers();
    const index = selected.findIndex(u => u.id === user.id);
    
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(user);
    }
    
    this.selectedUsers.set([...selected]);
  }

  toggleAllSelection(): void {
    if (this.isAllSelected()) {
      this.selectedUsers.set([]);
    } else {
      this.selectedUsers.set([...this.paginatedUsers()]);
    }
  }

  isUserSelected(user: User): boolean {
    return this.selectedUsers().some(u => u.id === user.id);
  }

  isAllSelected(): boolean {
    const paginatedCount = this.paginatedUsers().length;
    const selectedCount = this.selectedUsers().filter(user => 
      this.paginatedUsers().some(pu => pu.id === user.id)
    ).length;
    return paginatedCount > 0 && selectedCount === paginatedCount;
  }

  isPartiallySelected(): boolean {
    const selectedCount = this.selectedUsers().filter(user => 
      this.paginatedUsers().some(pu => pu.id === user.id)
    ).length;
    return selectedCount > 0 && !this.isAllSelected();
  }

  // Navigation
  createUser(): void {
    this.router.navigate(['/users/create']);
  }

  viewUser(user: User): void {
    this.router.navigate(['/users', user.id]);
  }

  editUser(user: User): void {
    this.router.navigate(['/users', user.id, 'edit']);
  }

  // User actions
  toggleUserStatus(user: User): void {
    this.userService.toggleUserStatus(user.id).subscribe({
      next: () => {
        this.snackBar.open(
          `Пользователь ${user.isActive ? 'деактивирован' : 'активирован'}`,
          'Закрыть',
          { duration: 3000 }
        );
      },
      error: () => {
        this.snackBar.open('Ошибка при изменении статуса пользователя', 'Закрыть', {
          duration: 5000
        });
      }
    });
  }

  resetPassword(user: User): void {
    this.userService.resetPassword(user.id).subscribe({
      next: (result) => {
        this.snackBar.openFromComponent(PasswordResetSnackbarComponent, {
          data: { password: result.temporaryPassword },
          duration: 10000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: () => {
        this.snackBar.open('Ошибка при сбросе пароля', 'Закрыть', {
          duration: 5000
        });
      }
    });
  }

  deleteUser(user: User): void {
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px',
      data: {
        title: 'Удалить пользователя',
        message: `Вы уверены, что хотите удалить пользователя ${user.firstName} ${user.lastName}?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((res) => {
      if (res?.confirmed) {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.snackBar.open('Пользователь удален', 'Закрыть', { duration: 3000 });
          },
          error: () => {
            this.snackBar.open('Ошибка при удалении пользователя', 'Закрыть', {
              duration: 5000
            });
          }
        });
      }
    });
  }

  // Bulk actions
  bulkActivate(): void {
    const userIds = this.selectedUsers().map(u => u.id);
    this.userService.bulkUpdateUsers(userIds, { isActive: true }).subscribe({
      next: () => {
        this.snackBar.open(`Активированы ${userIds.length} пользователей`, 'Закрыть', {
          duration: 3000
        });
        this.selectedUsers.set([]);
      }
    });
  }

  bulkDeactivate(): void {
    const userIds = this.selectedUsers().map(u => u.id);
    this.userService.bulkUpdateUsers(userIds, { isActive: false }).subscribe({
      next: () => {
        this.snackBar.open(`Деактивированы ${userIds.length} пользователей`, 'Закрыть', {
          duration: 3000
        });
        this.selectedUsers.set([]);
      }
    });
  }

  bulkDelete(): void {
    const userIds = this.selectedUsers().map(u => u.id);
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px',
      data: {
        title: 'Удалить пользователей',
        message: `Вы уверены, что хотите удалить ${userIds.length} пользователей?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((res) => {
      if (res?.confirmed) {
        this.userService.bulkDeleteUsers(userIds).subscribe({
          next: () => {
            this.snackBar.open(`Удалены ${userIds.length} пользователей`, 'Закрыть', {
              duration: 3000
            });
            this.selectedUsers.set([]);
          }
        });
      }
    });
  }

  // Utility methods
  getRoleDisplayName(role: string): string {
    return roleDisplay(role);
  }

  getSkillsTooltip(skills: string[]): string {
    return skills.slice(2).join(', ');
  }

  getRolesTooltip(roles: string[]): string {
    return roles.slice(2).map(role => this.getRoleDisplayName(role)).join(', ');
  }

  getDefaultAvatar(user: User): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&background=random&color=fff`;
  }

  getWorkloadColor(percentage: number): string {
    return getWorkloadColor(percentage);
  }
}
