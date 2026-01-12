import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { CompaniesService } from '../services/companies.service';
import { Company } from '../pipeline/dtos';
import { StatusTabsComponent } from '../shared/components/status-tabs/status-tabs.component';
import { PageLayoutComponent } from '../shared/page-layout/page-layout.component';
import { UniversalFiltersDialogComponent } from '../shared/dialogs/universal-filters-dialog/universal-filters-dialog.component';
import { UniversalFilterService } from '../shared/services/universal-filter.service';
import { CustomFieldsService } from '../services/custom-fields.service';
import { CompaniesFilterState } from './companies-filter-state.interface';
import { ActiveFiltersComponent } from '../shared/components/active-filters/active-filters.component';
import {
  BaseFilterState,
  FilterFieldDefinition,
} from '../shared/interfaces/universal-filter.interface';
import { ConfirmActionDialogComponent } from '../shared/dialogs/confirm-action-dialog.component';
import { CreateCompanyDialogComponent } from '../shared/components/create-company-dialog/create-company-dialog.component';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    StatusTabsComponent,
    PageLayoutComponent,
    MatPaginatorModule,
    MatDialogModule,
    ActiveFiltersComponent,
  ],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent implements OnInit {
  private readonly companiesService = inject(CompaniesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  readonly universalFilterService = inject(UniversalFilterService);
  private readonly customFieldsService = inject(CustomFieldsService);

  companies: Company[] = [];
  filteredCompanies: Company[] = [];
  paginatedCompanies: Company[] = [];

  searchQuery = '';
  isLoading = false;

  // Universal filters
  filterState = signal<CompaniesFilterState>({
    search: '',
    filters: [],
    status: 'all',
  });

  customFieldDefinitions = signal<any[]>([]);
  activeTab: string | null = 'all';

  // Status tabs
  companyTabs = [
    { label: 'Все компании', value: 'all' },
    { label: 'Активные', value: 'active' },
    { label: 'Неактивные', value: 'inactive' },
    { label: 'Черный список', value: 'blacklisted' },
  ];

  // Static fields for filtering (27 fields)
  staticFields: FilterFieldDefinition[] = [
    { name: 'name', label: 'Название', type: 'text' },
    { name: 'legalName', label: 'Юридическое название', type: 'text' },
    { name: 'inn', label: 'ИНН', type: 'text' },
    { name: 'kpp', label: 'КПП', type: 'text' },
    { name: 'description', label: 'Описание', type: 'text' },
    { name: 'website', label: 'Веб-сайт', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'phone', label: 'Телефон', type: 'text' },
    { name: 'address', label: 'Адрес', type: 'text' },
    { name: 'city', label: 'Город', type: 'text' },
    { name: 'region', label: 'Регион', type: 'text' },
    { name: 'country', label: 'Страна', type: 'text' },
    { name: 'postalCode', label: 'Почтовый индекс', type: 'text' },
    {
      name: 'type',
      label: 'Тип',
      type: 'select',
      selectOptions: [
        { label: 'Клиент', value: 'client' },
        { label: 'Потенциальный', value: 'prospect' },
        { label: 'Партнер', value: 'partner' },
        { label: 'Конкурент', value: 'competitor' },
        { label: 'Поставщик', value: 'vendor' },
      ],
    },
    {
      name: 'industry',
      label: 'Отрасль',
      type: 'select',
      selectOptions: [
        { label: 'Технологии', value: 'technology' },
        { label: 'Финансы', value: 'finance' },
        { label: 'Здравоохранение', value: 'healthcare' },
        { label: 'Образование', value: 'education' },
        { label: 'Розничная торговля', value: 'retail' },
        { label: 'Производство', value: 'manufacturing' },
        { label: 'Недвижимость', value: 'real_estate' },
        { label: 'Консалтинг', value: 'consulting' },
        { label: 'Медиа', value: 'media' },
        { label: 'Государственный сектор', value: 'government' },
        { label: 'Другое', value: 'other' },
      ],
    },
    {
      name: 'size',
      label: 'Размер',
      type: 'select',
      selectOptions: [
        { label: 'Стартап', value: 'startup' },
        { label: 'Малый (1-50)', value: 'small' },
        { label: 'Средний (51-250)', value: 'medium' },
        { label: 'Крупный (251-1000)', value: 'large' },
        { label: 'Корпорация (1000+)', value: 'enterprise' },
      ],
    },
    { name: 'employeeCount', label: 'Количество сотрудников', type: 'number' },
    { name: 'revenue', label: 'Доход', type: 'number' },
    { name: 'foundedDate', label: 'Дата основания', type: 'date' },
    { name: 'firstContactDate', label: 'Дата первого контакта', type: 'date' },
    { name: 'lastActivityDate', label: 'Дата последней активности', type: 'date' },
    { name: 'isActive', label: 'Активна', type: 'boolean' },
    { name: 'isBlacklisted', label: 'В черном списке', type: 'boolean' },
    { name: 'blacklistReason', label: 'Причина блокировки', type: 'text' },
    { name: 'notes', label: 'Заметки', type: 'text' },
    { name: 'createdAt', label: 'Дата создания', type: 'date' },
    { name: 'updatedAt', label: 'Дата обновления', type: 'date' },
  ];

  // Table columns
  displayedColumns = [
    'name',
    'type',
    'industry',
    'size',
    'city',
    'phone',
    'actions',
  ];

  // Pagination
  pageSize = 25;
  currentPage = 0;
  totalResults?: number;

  // Stats
  stats: {
    total: number;
    active: number;
    inactive: number;
    blacklisted: number;
  } = {
    total: 0,
    active: 0,
    inactive: 0,
    blacklisted: 0,
  };

  ngOnInit() {
    this.loadCustomFields();
    this.loadCompanies();
  }

  /**
   * Load custom field definitions for companies
   */
  loadCustomFields() {
    this.customFieldsService.findByEntity('company').subscribe({
      next: (fields) => {
        this.customFieldDefinitions.set(fields);
      },
      error: (error) => {
        console.error('Error loading custom fields:', error);
      },
    });
  }

  /**
   * Open universal filters dialog
   */
  openFiltersDialog(): void {
    // Transform custom field definitions to FilterFieldDefinition
    const customFields: FilterFieldDefinition[] = this.customFieldDefinitions().map(def => ({
      name: def.name,
      label: def.label,
      type: def.fieldType as FilterFieldDefinition['type'],
      selectOptions: def.selectOptions?.map((opt: any) => {
        if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
          return { label: opt.label, value: opt.value };
        }
        return { label: String(opt), value: String(opt) };
      }),
    }));

    const dialogRef = this.dialog.open(UniversalFiltersDialogComponent, {
      minWidth: '800px',
      data: {
        title: 'Фильтры компаний',
        staticFields: this.staticFields,
        customFields: customFields,
        initialState: this.filterState(),
        showSearch: true,
        statusTabs: this.companyTabs,
        selectedStatusTab: this.activeTab || 'all',
      },
    });

    dialogRef.afterClosed().subscribe((result: BaseFilterState & { selectedStatusTab?: string } | undefined) => {
      if (result) {
        this.filterState.set({
          search: result.search,
          filters: result.filters || [],
          status: result.selectedStatusTab || 'all',
        });
        
        if (result.selectedStatusTab && result.selectedStatusTab !== this.activeTab) {
          this.setActiveTab(result.selectedStatusTab);
        }
        
        this.currentPage = 0;
        this.loadCompanies();
      }
    });
  }

  /**
   * Set active status tab
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.filterState.update(state => ({ ...state, status: tab }));
  }

  /**
   * Get total count of active filters
   */
  getTotalActiveFilters(): number {
    const filters = this.filterState().filters.length;
    const search = this.filterState().search ? 1 : 0;
    return filters + search;
  }

  loadCompanies() {
    this.isLoading = true;
    const backendPage = this.currentPage + 1;
    
    this.companiesService
      .searchCompaniesAdvanced(this.filterState(), backendPage, this.pageSize)
      .subscribe({
        next: (res) => {
          this.companies = res.data;
          this.totalResults = res.total;
          this.filteredCompanies = [...this.companies];
          this.updatePagination();
          this.calculateStats();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Ошибка загрузки компаний:', error);
          this.snackBar.open('Ошибка загрузки компаний', 'Закрыть', {
            duration: 3000,
          });
          this.isLoading = false;
        },
      });
  }

  updatePagination() {
    if (typeof this.totalResults === 'number') {
      this.paginatedCompanies = [...this.filteredCompanies];
      return;
    }

    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCompanies = this.filteredCompanies.slice(startIndex, endIndex);
  }

  calculateStats() {
    const total = this.companies.length;
    const active = this.companies.filter((c) => c.isActive).length;
    const inactive = this.companies.filter((c) => !c.isActive).length;
    const blacklisted = this.companies.filter((c) => c.isBlacklisted).length;

    this.stats = { total, active, inactive, blacklisted };
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCompanies();
  }

  viewCompany(company: Company) {
    this.router.navigate(['/companies', company.id]);
  }

  editCompany(company: Company) {
    const dialogRef = this.dialog.open(CreateCompanyDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { company },
    });

    dialogRef.afterClosed().subscribe((result: Company | undefined) => {
      if (result) {
        this.snackBar.open('Компания успешно обновлена', 'Закрыть', {
          duration: 3000,
        });
        this.loadCompanies();
      }
    });
  }

  deleteCompany(company: Company) {
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px',
      data: {
        title: 'Удалить компанию',
        message: `Вы уверены, что хотите удалить компанию "${company.name}"?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      this.companiesService.deleteCompany(company.id).subscribe({
        next: () => {
          this.loadCompanies();
          this.snackBar.open('Компания удалена', 'Закрыть', { duration: 3000 });
        },
        error: (error) => {
          console.error('Ошибка удаления компании:', error);
          this.snackBar.open('Ошибка удаления компании', 'Закрыть', {
            duration: 3000,
          });
        },
      });
    });
  }

  createCompany() {
    const dialogRef = this.dialog.open(CreateCompanyDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe((result: Company | undefined) => {
      if (result) {
        this.snackBar.open('Компания успешно создана', 'Закрыть', {
          duration: 3000,
        });
        this.loadCompanies();
      }
    });
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      client: 'Клиент',
      prospect: 'Потенциальный',
      partner: 'Партнер',
      competitor: 'Конкурент',
      vendor: 'Поставщик',
    };
    return labels[type] || type;
  }

  getIndustryLabel(industry: string): string {
    const labels: Record<string, string> = {
      technology: 'Технологии',
      finance: 'Финансы',
      healthcare: 'Здравоохранение',
      education: 'Образование',
      retail: 'Розничная торговля',
      manufacturing: 'Производство',
      real_estate: 'Недвижимость',
      consulting: 'Консалтинг',
      media: 'Медиа',
      government: 'Государственный сектор',
      other: 'Другое',
    };
    return labels[industry] || industry;
  }

  getSizeLabel(size: string): string {
    const labels: Record<string, string> = {
      startup: 'Стартап',
      small: 'Малый',
      medium: 'Средний',
      large: 'Крупный',
      enterprise: 'Корпорация',
    };
    return labels[size] || size;
  }

  removeFilter(index: number): void {
    const state = this.filterState();
    state.filters = state.filters.filter((_, i) => i !== index);
    this.filterState.set({ ...state });
    this.currentPage = 0;
    this.loadCompanies();
  }

  clearAllFilters(): void {
    this.filterState.set({
      search: '',
      filters: [],
    });
    this.currentPage = 0;
    this.loadCompanies();
  }
}
