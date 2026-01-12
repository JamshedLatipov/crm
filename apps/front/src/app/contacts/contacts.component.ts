import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ConfirmActionDialogComponent } from '../shared/dialogs/confirm-action-dialog.component';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ContactsService } from './contacts.service';
import { StatusTabsComponent } from '../shared/components/status-tabs/status-tabs.component';
import { Router } from '@angular/router';
import { Contact, ContactsStats, ContactsFilterState, UniversalFilter, ContactType, ContactSource } from './contact.interfaces';
import { PageLayoutComponent } from '../shared/page-layout/page-layout.component';
import { CustomFieldsService } from '../services/custom-fields.service';
import { CustomFieldDefinition } from '../models/custom-field.model';
import { UniversalFiltersDialogComponent } from '../shared/dialogs/universal-filters-dialog/universal-filters-dialog.component';
import { UniversalFilterService } from '../shared/services/universal-filter.service';
import { FilterFieldDefinition, BaseFilterState } from '../shared/interfaces/universal-filter.interface';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatBadgeModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    FormsModule,
    MatDialogModule,
    StatusTabsComponent,
    PageLayoutComponent,
  ],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss'],
})
export class ContactsComponent implements OnInit {
  contacts: Contact[] = [];
  stats: ContactsStats | null = null;
  loading = true;
  // Compact columns: email and phone merged into name cell to save width
  displayedColumns = [
    'select',
    'name',
    'company',
    'status',
    'createdAt',
    'tags',
    'actions',
  ];

  // Filters
  activeFilter: string | null = 'active';
  filterState: ContactsFilterState = {
    search: undefined,
    isActive: true,
    filters: [],
  };

  // Custom field definitions
  customFieldDefinitions = signal<CustomFieldDefinition[]>([]);

  // Static field definitions for filters
  private staticFields: FilterFieldDefinition[] = [
    {
      name: 'type',
      label: 'Тип контакта',
      type: 'select',
      selectOptions: [
        { value: ContactType.PERSON, label: 'Физическое лицо' },
        { value: ContactType.COMPANY, label: 'Компания' },
      ],
    },
    {
      name: 'source',
      label: 'Источник',
      type: 'select',
      selectOptions: [
        { value: ContactSource.WEBSITE, label: 'Веб-сайт' },
        { value: ContactSource.PHONE, label: 'Телефон' },
        { value: ContactSource.EMAIL, label: 'Email' },
        { value: ContactSource.REFERRAL, label: 'Рекомендация' },
        { value: ContactSource.SOCIAL_MEDIA, label: 'Социальные сети' },
        { value: ContactSource.ADVERTISING, label: 'Реклама' },
        { value: ContactSource.IMPORT, label: 'Импорт' },
        { value: ContactSource.OTHER, label: 'Другое' },
      ],
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
    },
    {
      name: 'phone',
      label: 'Телефон',
      type: 'phone',
    },
    {
      name: 'companyName',
      label: 'Компания',
      type: 'text',
    },
    {
      name: 'position',
      label: 'Должность',
      type: 'text',
    },
    {
      name: 'assignedTo',
      label: 'Ответственный',
      type: 'text',
    },
    {
      name: 'createdAt',
      label: 'Дата создания',
      type: 'date',
    },
    {
      name: 'isBlacklisted',
      label: 'В черном списке',
      type: 'boolean',
    },
  ];

  // Tabs config for StatusTabsComponent
  contactTabs = [
    { label: 'Все контакты', value: null },
    { label: 'Активные', value: 'active' },
    { label: 'Деактивированные', value: 'inactive' },
  ];

  // selection set of contact ids for bulk actions
  selected: Set<string> = new Set();

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalResults = 0;

  private readonly contactsService = inject(ContactsService);
  private readonly customFieldsService = inject(CustomFieldsService);
  private readonly universalFilterService = inject(UniversalFilterService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    this.loadCustomFieldDefinitions();
    this.loadData();
  }

  loadCustomFieldDefinitions(): void {
    this.customFieldsService.findByEntity('contact').subscribe({
      next: (defs) => this.customFieldDefinitions.set(defs),
      error: (err) => console.error('Failed to load custom field definitions:', err)
    });
  }

  loadData(): void {
    this.loading = true;

    // Если есть дополнительные фильтры, используем advanced search
    if (this.filterState.filters && this.filterState.filters.length > 0) {
      this.contactsService
        .searchContactsWithFilters({
          search: this.filterState.search,
          isActive: this.filterState.isActive,
          filters: this.filterState.filters,
          page: this.currentPage,
          pageSize: this.pageSize,
        })
        .subscribe({
          next: (response) => {
            this.contacts = response.data || [];
            this.totalResults = response.total || 0;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading contacts with filters:', error);
            this.snackBar.open('Ошибка загрузки контактов', 'Закрыть', {
              duration: 3000,
            });
            this.loading = false;
          },
        });
      
      // Загружаем статистику отдельно
      this.contactsService.getContactsStats().subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
        },
      });
      
      return;
    }

    // Стандартная фильтрация без дополнительных фильтров
    const listPromise = this.contactsService
      .listContacts({
        search: this.filterState.search || undefined,
        isActive: this.filterState.isActive ?? undefined,
        page: this.currentPage,
        pageSize: this.pageSize,
      })
      .toPromise();

    Promise.all([
      listPromise,
      this.contactsService.getContactsStats().toPromise(),
    ])
      .then(([response, stats]) => {
        // Handle { data, total } response
        const contactsData = (response as any).data || response || [];
        this.contacts = contactsData;
        this.stats = stats || null;

        this.totalResults = (response as any).total !== undefined
          ? (response as any).total
          : contactsData.length;

        this.loading = false;
      })
      .catch((error) => {
        console.error('Error loading contacts:', error);
        this.snackBar.open('Ошибка загрузки контактов', 'Закрыть', {
          duration: 3000,
        });
        this.loading = false;
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
    this.loadData();
  }

  isAllSelected(): boolean {
    return (
      this.contacts.length > 0 && this.selected.size === this.contacts.length
    );
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.contacts.forEach((c) => this.selected.add(c.id));
    } else {
      this.selected.clear();
    }
  }

  toggleSelect(id: string, checked: boolean): void {
    if (checked) this.selected.add(id);
    else this.selected.delete(id);
  }

  selectedCount(): number {
    return this.selected.size;
  }

  clearSelection(): void {
    this.selected.clear();
  }

  onActiveFilterChange(value: string | null): void {
    this.activeFilter = value;
    if (value === null) {
      this.filterState.isActive = null;
    } else {
      this.filterState.isActive = value === 'active';
    }
    this.loadData();
  }

  deleteSelected(): void {
    const count = this.selected.size;
    if (count === 0) return;
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '520px',
      data: {
        title: 'Удалить контакты',
        message: `Вы уверены, что хотите удалить ${count} выбранных контактов?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      const ids = Array.from(this.selected);
      // delete in parallel and reload when done
      Promise.all(ids.map((id) => this.contactsService.deleteContact(id).toPromise()))
        .then(() => {
          this.snackBar.open('Выбранные контакты удалены', 'Закрыть', { duration: 3000 });
          this.selected.clear();
          this.loadData();
        })
        .catch((error) => {
          console.error('Error deleting selected contacts:', error);
          this.snackBar.open('Ошибка при удалении выбранных контактов', 'Закрыть', { duration: 3000 });
          this.loadData();
        });
    });
  }

  bulkActivateSelected(): void {
    const ids = Array.from(this.selected);
    if (ids.length === 0) return;

    Promise.all(
      ids.map((id) =>
        this.contactsService
          .updateContact(id, { isActive: true } as any)
          .toPromise()
      )
    )
      .then(() => {
        this.snackBar.open(`Активированы ${ids.length} контактов`, 'Закрыть', {
          duration: 3000,
        });
        this.clearSelection();
        this.loadData();
      })
      .catch((error) => {
        console.error('Error activating selected contacts:', error);
        this.snackBar.open(
          'Ошибка при активации выбранных контактов',
          'Закрыть',
          { duration: 3000 }
        );
        this.loadData();
      });
  }

  bulkDeactivateSelected(): void {
    const ids = Array.from(this.selected);
    if (ids.length === 0) return;

    if (
      !confirm(
        `Вы уверены, что хотите деактивировать ${ids.length} выбранных контактов?`
      )
    )
      return;
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '520px',
      data: {
        title: 'Деактивировать контакты',
        message: `Вы уверены, что хотите деактивировать ${ids.length} выбранных контактов?`,
        confirmText: 'Деактивировать',
        cancelText: 'Отмена',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      Promise.all(
        ids.map((id) => this.contactsService.updateContact(id, { isActive: false } as any).toPromise())
      )
        .then(() => {
          this.snackBar.open(`Деактивированы ${ids.length} контактов`, 'Закрыть', { duration: 3000 });
          this.clearSelection();
          this.loadData();
        })
        .catch((error) => {
          console.error('Error deactivating selected contacts:', error);
          this.snackBar.open('Ошибка при деактивации выбранных контактов', 'Закрыть', { duration: 3000 });
          this.loadData();
        });
    });
  }

  trackByContactId(index: number, contact: Contact): string {
    return contact.id;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ru-RU');
  }

  // Действия с контактами
  openCreateDialog(): void {
    import(
      './components/create-contact-dialog/create-contact-dialog.component'
    ).then((m) => {
      const dialogRef = this.dialog.open(m.CreateContactDialogComponent, {
        width: '700px',
        maxWidth: '95vw',
        panelClass: 'modern-dialog',
      });
      interface CreatedContact {
        id: string;
      }
      dialogRef.afterClosed().subscribe((created: CreatedContact | null) => {
        if (created) {
          this.snackBar.open('Контакт создан', 'Закрыть', { duration: 2000 });
          this.loadData();
          this.router.navigate(['/contacts/view', created.id]);
        }
      });
    });
  }

  viewContact(contact: Contact): void {
    this.snackBar.open(
      `Просмотр контакта "${contact.name}" - в разработке`,
      'Закрыть',
      { duration: 3000 }
    );
  }

  deleteContact(contact: Contact): void {
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px',
      data: {
        title: 'Удалить контакт',
        message: `Вы уверены, что хотите удалить контакт "${contact.name}"?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn',
      }
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      this.contactsService.deleteContact(contact.id).subscribe({
        next: () => {
          this.snackBar.open('Контакт удален', 'Закрыть', { duration: 3000 });
          this.loadData();
        },
        error: (error) => {
          console.error('Error deleting contact:', error);
          this.snackBar.open('Ошибка удаления контакта', 'Закрыть', {
            duration: 3000,
          });
        },
      });
    });
  }

  goToDetail(contact: Contact): void {
    // navigate to contact detail page
    this.router.navigate(['/contacts/view', contact.id]);
  }

  // Custom field filter methods
  openFiltersDialog(): void {
    // Преобразуем custom field definitions в FilterFieldDefinition
    const customFields: FilterFieldDefinition[] = this.customFieldDefinitions().map(def => ({
      name: def.name,
      label: def.label,
      type: def.fieldType as FilterFieldDefinition['type'],
      selectOptions: def.selectOptions?.map(opt => {
        // Если opt это объект SelectOption, берем label и value
        if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
          return {
            label: opt.label,
            value: opt.value,
          };
        }
        // Если opt это строка, используем ее как label и value
        return {
          label: String(opt),
          value: String(opt),
        };
      }),
    }));

    const dialogRef = this.dialog.open(UniversalFiltersDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        title: 'Фильтры и поиск контактов',
        staticFields: this.staticFields,
        customFields: customFields,
        initialState: this.filterState as BaseFilterState,
        showSearch: true,
        statusTabs: this.contactTabs, // Array of status tabs
        selectedStatusTab: this.activeFilter, // Current active filter ('active', 'inactive', or null)
      },
    });

    dialogRef.afterClosed().subscribe((result: BaseFilterState & { selectedStatusTab?: string | null } | undefined) => {
      if (result) {
        this.filterState = result as ContactsFilterState;
        
        // Handle status tab change
        if (result.selectedStatusTab !== undefined) {
          this.activeFilter = result.selectedStatusTab as 'active' | 'inactive' | null;
          
          // Update isActive based on selected status tab
          if (result.selectedStatusTab === 'active') {
            this.filterState.isActive = true;
          } else if (result.selectedStatusTab === 'inactive') {
            this.filterState.isActive = false;
          } else {
            this.filterState.isActive = undefined;
          }
        }
        
        this.loadData();
      }
    });
  }

  removeFilter(index: number): void {
    this.filterState.filters.splice(index, 1);
    this.loadData();
  }

  clearAllFilters(): void {
    this.filterState = {
      search: undefined,
      isActive: true,
      filters: [],
    };
    this.activeFilter = 'active';
    this.loadData();
  }

  getFilterLabel(filter: UniversalFilter): string {
    return filter.fieldLabel || filter.fieldName;
  }

  getOperatorLabel(operator: UniversalFilter['operator']): string {
    return this.universalFilterService.getOperatorLabel(operator);
  }

  getTotalActiveFilters(): number {
    return this.universalFilterService.countActiveFilters(this.filterState);
  }
}
