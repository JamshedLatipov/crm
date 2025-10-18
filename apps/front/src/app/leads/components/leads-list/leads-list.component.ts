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
import { Router } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { LeadService } from '../../services/lead.service';
import { UserService, Manager } from '../../../shared/services/user.service';
import {
  Lead,
  LeadStatus,
  LeadSource,
  LeadPriority,
  LeadFilters,
} from '../../models/lead.model';
import { CreateLeadDialogComponent } from '../create-lead-dialog.component';
import { EditLeadDialogComponent } from '../edit-lead-dialog.component';
// LeadDetailComponent is now routed; don't import here
import { ChangeStatusDialogComponent } from '../change-status-dialog.component';
import { AssignLeadDialogComponent } from '../assign-lead-dialog.component';
import { QuickAssignDialogComponent } from '../quick-assign-dialog.component';
import { ConvertToDealDialogComponent } from '../convert-to-deal-dialog/convert-to-deal-dialog.component';

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
  ],
  templateUrl: './leads-list.component.html',
  styleUrls: ['./leads-list.component.scss'],
})
export class LeadsListComponent implements OnInit {
  private leadService = inject(LeadService);
  private userService = inject(UserService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  // Signals
  leads = signal<Lead[]>([]);
  // Selection for bulk actions
  selectedLeads = signal<Lead[]>([]);
  loading = signal(true);

  // Table configuration
  displayedColumns: string[] = [
    'select',
    'leadName',
    'company',
    'leadScore',
    'status',
    'assignedManager',
    'lastActivity',
    'actions',
  ];

  // Tabs
  // Show open leads by default
  activeTab = 'open';

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

  // Expose LeadStatus to template for comparisons
  readonly LeadStatus = LeadStatus;

  ngOnInit(): void {
    this.loadLeads();
    this.loadManagers();
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

  loadLeads(): void {
    this.loading.set(true);

    const filters: LeadFilters = {
      search: this.searchQuery || undefined,
      status: this.getStatusesForActiveTab(),
      source: this.selectedSources.length ? this.selectedSources : undefined,
      priority: this.selectedPriorities.length
        ? this.selectedPriorities
        : undefined,
    };

    this.leadService
      .getLeads(filters, this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.leads.set(response.leads);
          this.totalResults = response.total;
          this.loading.set(false);
        },
        error: (error: unknown) => {
          console.error('Error loading leads:', error);
          this.loading.set(false);
        },
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
    const finalStatuses = [LeadStatus.CONVERTED, LeadStatus.REJECTED, LeadStatus.LOST];
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
    const finalStatuses = [LeadStatus.CONVERTED, LeadStatus.REJECTED, LeadStatus.LOST];
    return !finalStatuses.includes(lead.status);
  }

  assignLead(lead: Lead): void {
    const dialogRef = this.dialog.open(AssignLeadDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: {
        lead,
        currentAssignee: lead.assignedTo,
      },
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
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
    if (confirm(`Вы уверены, что хотите удалить лид "${lead.name}"?`)) {
      this.leadService.deleteLead(lead.id).subscribe({
        next: () => {
          this.loadLeads();
        },
        error: (error: unknown) => {
          console.error('Error deleting lead:', error);
        },
      });
    }
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

  // Helper methods for labels
  getStatusLabel(status: LeadStatus): string {
    const statusLabels: Record<LeadStatus, string> = {
      [LeadStatus.NEW]: 'Новый',
      [LeadStatus.CONTACTED]: 'Контакт установлен',
      [LeadStatus.QUALIFIED]: 'Квалифицирован',
      [LeadStatus.PROPOSAL_SENT]: 'Предложение отправлено',
      [LeadStatus.NEGOTIATING]: 'Переговоры',
      [LeadStatus.CONVERTED]: 'Конвертирован',
      [LeadStatus.REJECTED]: 'Отклонен',
      [LeadStatus.LOST]: 'Потерян',
    };
    return statusLabels[status] || status;
  }

  getSourceLabel(source: LeadSource): string {
    const sourceLabels: Record<LeadSource, string> = {
      [LeadSource.WEBSITE]: 'Веб-сайт',
      [LeadSource.FACEBOOK]: 'Facebook',
      [LeadSource.GOOGLE_ADS]: 'Google Ads',
      [LeadSource.LINKEDIN]: 'LinkedIn',
      [LeadSource.EMAIL]: 'Email',
      [LeadSource.PHONE]: 'Телефон',
      [LeadSource.REFERRAL]: 'Рекомендация',
      [LeadSource.TRADE_SHOW]: 'Выставка',
      [LeadSource.WEBINAR]: 'Вебинар',
      [LeadSource.CONTENT_MARKETING]: 'Контент-маркетинг',
      [LeadSource.COLD_OUTREACH]: 'Холодный обзвон',
      [LeadSource.PARTNER]: 'Партнер',
      [LeadSource.OTHER]: 'Другое',
    };
    return sourceLabels[source] || source;
  }

  getPriorityLabel(priority: LeadPriority): string {
    const priorityLabels: Record<LeadPriority, string> = {
      [LeadPriority.LOW]: 'Низкий',
      [LeadPriority.MEDIUM]: 'Средний',
      [LeadPriority.HIGH]: 'Высокий',
      [LeadPriority.URGENT]: 'Срочный',
    };
    return priorityLabels[priority] || priority;
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
}
