import { Component, OnInit, signal, inject } from '@angular/core';
// dayjs logic moved to shared util
import { dateToHumanReadable } from '../../../shared/utils/date.util';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ConfirmActionDialogComponent } from '../../../shared/dialogs/confirm-action-dialog.component';
import { Router } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StatusTabsComponent } from '../../../shared/components/status-tabs/status-tabs.component';

import { LeadService } from '../../services/lead.service';
import { UserService, Manager } from '../../../shared/services/user.service';
import { AssignmentService } from '../../../services/assignment.service';
import {
  Lead,
  LeadStatus,
  LeadSource,
  LeadPriority,
  LeadFilters,
} from '../../models/lead.model';
import { PromoCompaniesService } from '../../../promo-companies/services/promo-companies.service';
import { PromoCompany } from '../../../promo-companies/models/promo-company.model';
import { CreateLeadDialogComponent } from '../create-lead-dialog.component';
import { EditLeadDialogComponent } from '../edit-lead-dialog.component';
// LeadDetailComponent is now routed; don't import here
import { ChangeStatusDialogComponent } from '../change-status-dialog.component';
import { AssignUserDialogComponent } from '../../../deals/components/assign-user-dialog.component';
import { QuickAssignDialogComponent } from '../quick-assign-dialog.component';
import { ConvertToDealDialogComponent } from '../convert-to-deal-dialog/convert-to-deal-dialog.component';
import {
  leadStatusDisplay,
  leadSourceDisplay,
  leadPriorityDisplay,
} from '../../../shared/utils';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { UniversalFiltersDialogComponent } from '../../../shared/dialogs/universal-filters-dialog/universal-filters-dialog.component';
import { UniversalFilterService } from '../../../shared/services/universal-filter.service';
import { CustomFieldsService } from '../../../services/custom-fields.service';
import {
  BaseFilterState,
  FilterFieldDefinition,
} from '../../../shared/interfaces/universal-filter.interface';

@Component({
  selector: 'app-leads-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatCardModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatCheckboxModule,
    StatusTabsComponent,
    PageLayoutComponent,
  ],
  templateUrl: './leads-list.component.html',
  styleUrls: ['./leads-list.component.scss'],
})
export class LeadsListComponent implements OnInit {
  private leadService = inject(LeadService);
  private userService = inject(UserService);
  private assignmentService = inject(AssignmentService);
  private promoCompaniesService = inject(PromoCompaniesService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private universalFilterService = inject(UniversalFilterService);
  private customFieldsService = inject(CustomFieldsService);

  // Signals
  leads = signal<Lead[]>([]);
  // Selection for bulk actions
  selectedLeads = signal<Lead[]>([]);
  loading = signal(true);

  // Universal filters
  filterState = signal<BaseFilterState>({
    search: '',
    filters: [],
  });
  customFieldDefinitions = signal<FilterFieldDefinition[]>([]);

  // Static field definitions for Leads
  staticFields: FilterFieldDefinition[] = [
    {
      name: 'leadName',
      label: 'Lead Name',
      type: 'text',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'phone',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      selectOptions: Object.values(LeadStatus).map((status) => ({
        label: leadStatusDisplay(status),
        value: status,
      })),
    },
    {
      name: 'source',
      label: 'Source',
      type: 'select',
      selectOptions: Object.values(LeadSource).map((source) => ({
        label: leadSourceDisplay(source),
        value: source,
      })),
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      selectOptions: Object.values(LeadPriority).map((priority) => ({
        label: leadPriorityDisplay(priority),
        value: priority,
      })),
    },
    {
      name: 'leadScore',
      label: 'Lead Score',
      type: 'number',
    },
    {
      name: 'createdAt',
      label: 'Created At',
      type: 'date',
    },
    {
      name: 'lastActivityDate',
      label: 'Last Activity',
      type: 'date',
    },
  ];

  // Promo companies for display
  promoCompanies: PromoCompany[] = [];

  // Table configuration
  displayedColumns: string[] = [
    'select',
    'leadName',
    'company',
    'promoCompany',
    'leadScore',
    'status',
    'assignedManager',
    'lastActivity',
    'actions',
  ];

  // Tabs
  // Show open leads by default
  activeTab: string | null = 'open';

  // Tabs config for the status tabs component
  leadTabs = [
    { label: 'All Leads', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Qualified', value: 'qualified' },
    { label: 'Closed', value: 'closed' },
  ];

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalResults = 0;

  // Filters
  searchQuery = '';
  selectedStatuses: LeadStatus[] = [];
  selectedSources: LeadSource[] = [];
  selectedPriorities: LeadPriority[] = [];

  // Managers cache
  managers: Manager[] = [];

  // Map of entityId -> current assignment (from centralized assignments API)
  currentAssignmentsMap = signal<
    Record<
      string,
      { id: number; name: string; email?: string; assignedAt?: string }
    >
  >({});

  // Expose LeadStatus to template for comparisons
  readonly LeadStatus = LeadStatus;

  ngOnInit(): void {
    this.loadLeads();
    this.loadManagers();
    this.loadPromoCompanies();
    this.loadCustomFieldDefinitions();
  }

  private loadCustomFieldDefinitions(): void {
    this.customFieldsService.findByEntity('lead').subscribe({
      next: (fields) => {
        const definitions: FilterFieldDefinition[] = fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.fieldType as FilterFieldDefinition['type'],
          selectOptions: field.selectOptions
            ? field.selectOptions.map((opt) => {
                if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
                  return {
                    label: (opt as { label: string }).label,
                    value: String((opt as { value: unknown }).value),
                  };
                }
                return { label: String(opt), value: String(opt) };
              })
            : undefined,
        }));
        this.customFieldDefinitions.set(definitions);
      },
      error: (err) => console.error('Error loading custom fields:', err),
    });
  }

  // Selection helpers
  toggleLeadSelection(lead: Lead): void {
    const selected = this.selectedLeads();
    const index = selected.findIndex((l) => l.id === lead.id);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(lead);
    }

    this.selectedLeads.set([...selected]);
  }

  toggleAllSelection(): void {
    if (this.isAllSelected()) {
      this.selectedLeads.set([]);
    } else {
      // Select all currently loaded leads (page)
      this.selectedLeads.set([...this.leads()]);
    }
  }

  isLeadSelected(lead: Lead): boolean {
    return this.selectedLeads().some((l) => l.id === lead.id);
  }

  isAllSelected(): boolean {
    const total = this.leads().length;
    const selectedCount = this.selectedLeads().filter((l) =>
      this.leads().some((p) => p.id === l.id)
    ).length;
    return total > 0 && selectedCount === total;
  }

  isPartiallySelected(): boolean {
    const selectedCount = this.selectedLeads().filter((l) =>
      this.leads().some((p) => p.id === l.id)
    ).length;
    return selectedCount > 0 && !this.isAllSelected();
  }

  private loadManagers(): void {
    this.userService.getManagers().subscribe({
      next: (managers) => (this.managers = managers),
      error: (err) => console.error('Error loading managers for list:', err),
    });
  }

  private loadPromoCompanies(): void {
    this.promoCompaniesService.getAll().subscribe({
      next: (companies) => (this.promoCompanies = companies),
      error: (err) => console.error('Error loading promo companies:', err),
    });
  }

  loadLeads(): void {
    this.loading.set(true);

    const state = this.filterState();
    
    this.leadService
      .advancedSearch({
        search: state.search || undefined,
        filters: state.filters,
        page: this.currentPage,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.leads.set(response.data);
          this.totalResults = response.total;
          // Fetch current assignments for the loaded leads in batch
          const ids = response.data.map((l) => l.id).filter(Boolean);
          if (ids.length) {
            this.assignmentService
              .getCurrentAssignmentsForEntities('lead', ids)
              .subscribe({
                next: (map) => this.currentAssignmentsMap.set(map || {}),
                error: (err) => {
                  console.error(
                    'Error loading assignments for leads list:',
                    err
                  );
                },
              });
          } else {
            this.currentAssignmentsMap.set({});
          }
          this.loading.set(false);
        },
        error: (error: unknown) => {
          console.error('Error loading leads:', error);
          this.loading.set(false);
        },
      });
  }

  openFiltersDialog(): void {
    const dialogRef = this.dialog.open(UniversalFiltersDialogComponent, {
      minWidth: '800px',
      data: {
        title: 'Фильтры лидов',
        staticFields: this.staticFields,
        customFields: this.customFieldDefinitions(),
        initialState: this.filterState(),
        showSearch: true,
        statusTabs: this.leadTabs, // Array of tabs
        selectedStatusTab: this.activeTab || 'all', // Current active tab
      },
    });

    dialogRef.afterClosed().subscribe((result: BaseFilterState & { selectedStatusTab?: string } | undefined) => {
      if (result) {
        this.filterState.set(result);
        
        // Handle status tab change
        if (result.selectedStatusTab && result.selectedStatusTab !== this.activeTab) {
          this.setActiveTab(result.selectedStatusTab);
        }
        
        this.currentPage = 1;
        this.loadLeads();
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadLeads();
  }

  getStatusesForActiveTab(): LeadStatus[] | undefined {
    switch (this.activeTab) {
      case 'open':
        return [LeadStatus.NEW, LeadStatus.CONTACTED];
      case 'qualified':
        return [
          LeadStatus.QUALIFIED,
          LeadStatus.PROPOSAL_SENT,
          LeadStatus.NEGOTIATING,
        ];
      case 'closed':
        return [LeadStatus.CONVERTED, LeadStatus.REJECTED, LeadStatus.LOST];
      default:
        return this.selectedStatuses.length ? this.selectedStatuses : undefined;
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadLeads();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadLeads();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatuses = [];
    this.selectedSources = [];
    this.selectedPriorities = [];
    this.currentPage = 1;
    this.loadLeads();
  }

  hasActiveFilters(): boolean {
    return (
      this.selectedStatuses.length > 0 ||
      this.selectedSources.length > 0 ||
      this.selectedPriorities.length > 0
    );
  }

  removeStatusFilter(status: LeadStatus): void {
    this.selectedStatuses = this.selectedStatuses.filter((s) => s !== status);
    this.applyFilters();
  }

  removeSourceFilter(source: LeadSource): void {
    this.selectedSources = this.selectedSources.filter((s) => s !== source);
    this.applyFilters();
  }

  removePriorityFilter(priority: LeadPriority): void {
    this.selectedPriorities = this.selectedPriorities.filter(
      (p) => p !== priority
    );
    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadLeads();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateLeadDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
      }
    });
  }

  // Bulk quick assign for selected leads
  bulkQuickAssign(): void {
    const selected = this.selectedLeads();
    if (!selected.length) return;

    const dialogRef = this.dialog.open(QuickAssignDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: { leads: selected },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // refresh list after bulk assign
        this.loadLeads();
        // clear selection
        this.selectedLeads.set([]);
      }
    });
  }

  viewLead(lead: Lead): void {
    // navigate to routed lead detail view
    this.router.navigate(['/leads/view', lead.id]);
  }

  editLead(lead: Lead): void {
    const dialogRef = this.dialog.open(EditLeadDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { lead },
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
      }
    });
  }

  changeStatus(lead: Lead): void {
    // Проверяем, находится ли лид в финальном статусе
    const finalStatuses = [
      LeadStatus.CONVERTED,
      LeadStatus.REJECTED,
      LeadStatus.LOST,
    ];
    if (finalStatuses.includes(lead.status)) {
      // Можно показать уведомление, что статус нельзя изменить
      return;
    }

    const dialogRef = this.dialog.open(ChangeStatusDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {
        lead,
        currentStatus: lead.status,
      },
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
      }
    });
  }

  canChangeStatus(lead: Lead): boolean {
    const finalStatuses = [
      LeadStatus.CONVERTED,
      LeadStatus.REJECTED,
      LeadStatus.LOST,
    ];
    return !finalStatuses.includes(lead.status);
  }

  assignLead(lead: Lead): void {
    // Open deals' AssignUserDialogComponent to change assignee (reuses deals modal)
    const dialogRef = this.dialog.open(AssignUserDialogComponent, {
      width: '560px',
      maxWidth: '90vw',
      data: {
        deal: { title: lead.name, assignedTo: lead.assignedTo } as any,
        currentUsers: [],
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.userId) {
        this.leadService.assignLead(lead.id, result.userId).subscribe({
          next: () => this.loadLeads(),
          error: (err) => console.error('Error assigning lead:', err),
        });
      }
    });
  }

  quickAssign(lead: Lead): void {
    const dialogRef = this.dialog.open(QuickAssignDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { lead },
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
      }
    });
  }

  quickUpdateStatus(lead: Lead, status: string): void {
    const statusMap: Record<string, LeadStatus> = {
      contacted: LeadStatus.CONTACTED,
      qualified: LeadStatus.QUALIFIED,
      converted: LeadStatus.CONVERTED,
      lost: LeadStatus.LOST,
    };

    const newStatus = statusMap[status];
    if (newStatus && newStatus !== lead.status) {
      this.leadService.updateLeadStatus(lead.id, newStatus).subscribe({
        next: () => {
          this.loadLeads(); // Refresh the list
        },
        error: (error: unknown) => {
          console.error('Error updating lead status:', error);
        },
      });
    }
  }

  contactLead(lead: Lead): void {
    this.leadService.markAsContacted(lead.id).subscribe({
      next: () => {
        this.loadLeads();
      },
      error: (error: unknown) => {
        console.error('Error marking lead as contacted:', error);
      },
    });
  }

  deleteLead(lead: Lead): void {
    const ref = this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px',
      data: {
        title: 'Удалить лид',
        message: `Вы уверены, что хотите удалить лид "${lead.name}"?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((res) => {
      if (!res?.confirmed) return;
      this.leadService.deleteLead(lead.id).subscribe({
        next: () => {
          this.loadLeads();
        },
        error: (error: unknown) => {
          console.error('Error deleting lead:', error);
        },
      });
    });
  }

  convertToDeal(lead: Lead): void {
    const dialogRef = this.dialog.open(ConvertToDealDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: { lead },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Deal was created successfully
        this.loadLeads(); // Refresh the list to show lead status change
      }
    });
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  }

  getScoreBadgeClass(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 65) return 'medium-high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  getLastActivity(lead: Lead): string {
    const dateToUse = lead.lastContactedAt ?? lead.createdAt;
    return dateToHumanReadable(dateToUse ?? undefined);
  }

  getManagerName(id?: string): string {
    if (!id) return '';
    const manager = this.managers.find(
      (m) => m.id?.toString() === id.toString()
    );
    return manager?.fullName || id;
  }

  // Helper methods for labels
  getStatusLabel(status: LeadStatus): string {
    return leadStatusDisplay(status);
  }

  getSourceLabel(source: LeadSource): string {
    return leadSourceDisplay(source);
  }

  getPriorityLabel(priority: LeadPriority): string {
    return leadPriorityDisplay(priority);
  }

  getPromoCompanyName(promoCompanyId: number): string {
    const company = this.promoCompanies.find((c) => c.id === promoCompanyId);
    return company?.name || `ID: ${promoCompanyId}`;
  }

  // Return the display name for the assigned manager using centralized assignments when available
  getAssignedManagerName(lead: Lead): string {
    const map = this.currentAssignmentsMap();
    const assigned = map && map[lead.id as any];
    if (assigned && assigned.name) return assigned.name;

    // Fallback to legacy assignedTo field
    if (lead.assignedTo) return this.getManagerName(lead.assignedTo);

    return '';
  }

  // Universal filter helper methods
  getOperatorLabel(operator: string): string {
    return this.universalFilterService.getOperatorLabel(operator as any);
  }

  getTotalActiveFilters(): number {
    return this.universalFilterService.countActiveFilters(this.filterState());
  }

  removeFilter(filter: any): void {
    const state = this.filterState();
    state.filters = state.filters.filter((f) => f !== filter);
    this.filterState.set({ ...state });
    this.currentPage = 1;
    this.loadLeads();
  }

  clearAllFilters(): void {
    this.filterState.set({
      search: '',
      filters: [],
    });
    this.currentPage = 1;
    this.loadLeads();
  }
}
