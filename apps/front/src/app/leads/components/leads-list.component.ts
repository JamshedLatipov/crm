import { Component, OnInit, signal, inject } from '@angular/core';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { LeadService } from '../services/lead.service';
import { UserService, Manager } from '../../shared/services/user.service';
import { 
  Lead, 
  LeadStatus, 
  LeadSource, 
  LeadPriority, 
  LeadFilters 
} from '../models/lead.model';
import { CreateLeadDialogComponent } from './create-lead-dialog.component';
import { EditLeadDialogComponent } from './edit-lead-dialog.component';
import { LeadDetailComponent } from './lead-detail.component';
import { ChangeStatusDialogComponent } from './change-status-dialog.component';
import { AssignLeadDialogComponent } from './assign-lead-dialog.component';
import { QuickAssignDialogComponent } from './quick-assign-dialog.component';

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
    MatCheckboxModule
  ],
  template: `
    <div class="leads-container">
      <!-- Header -->
      <div class="header">
        <div class="title-section">
          <h1>Leads</h1>
        </div>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            New Lead
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab === 'all'"
            (click)="setActiveTab('all')"
          >
            All Leads
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'open'"
            (click)="setActiveTab('open')"
          >
            Open
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'qualified'"
            (click)="setActiveTab('qualified')"
          >
            Qualified
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'closed'"
            (click)="setActiveTab('closed')"
          >
            Closed
          </button>
        </div>
        <div class="search-section">
          <mat-form-field appearance="outline" class="search-field">
            <input 
              matInput 
              [(ngModel)]="searchQuery" 
              (ngModelChange)="onSearch()"
              placeholder="Search leads">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <div *ngIf="loading()" class="loading-spinner">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading leads...</p>
        </div>

        <table mat-table [dataSource]="leads()" *ngIf="!loading()" class="leads-table">
          <!-- Checkbox Column -->
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox (click)="$event.stopPropagation()"></mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let lead">
              <mat-checkbox (click)="$event.stopPropagation()"></mat-checkbox>
            </td>
          </ng-container>

          <!-- Lead Name Column -->
          <ng-container matColumnDef="leadName">
            <th mat-header-cell *matHeaderCellDef>
              Lead Name 
              <mat-icon class="sort-icon">keyboard_arrow_down</mat-icon>
            </th>
            <td mat-cell *matCellDef="let lead" class="lead-name-cell">
              {{ lead.name }}
            </td>
          </ng-container>

          <!-- Company Column -->
          <ng-container matColumnDef="company">
            <th mat-header-cell *matHeaderCellDef>Company</th>
            <td mat-cell *matCellDef="let lead" class="company-cell">
              {{ lead.company || '-' }}
            </td>
          </ng-container>

          <!-- Lead Score Column -->
          <ng-container matColumnDef="leadScore">
            <th mat-header-cell *matHeaderCellDef>Lead Score</th>
            <td mat-cell *matCellDef="let lead" class="score-cell">
              <div class="score-badge" [ngClass]="getScoreBadgeClass(lead.score)">
                {{ lead.score }}
              </div>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let lead" class="status-cell">
              <div class="status-container">
                <span class="status-badge" [ngClass]="'status-' + lead.status">
                  {{ getStatusLabel(lead.status) }}
                </span>
                <button 
                  mat-icon-button 
                  class="status-change-btn"
                  (click)="changeStatus(lead); $event.stopPropagation()"
                  matTooltip="Изменить статус"
                >
                  <mat-icon>edit</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <!-- Assigned Manager Column -->
          <ng-container matColumnDef="assignedManager">
            <th mat-header-cell *matHeaderCellDef>Assigned Manager</th>
            <td mat-cell *matCellDef="let lead" class="manager-cell">
              <div class="manager-container">
                <span class="manager-name" *ngIf="lead.assignedTo; else unassigned">
                  {{ getManagerName(lead.assignedTo) }}
                </span>
                <ng-template #unassigned>
                  <span class="unassigned-text">Unassigned</span>
                </ng-template>
                <button 
                  mat-icon-button 
                  class="assign-btn"
                  (click)="quickAssign(lead); $event.stopPropagation()"
                  [matTooltip]="lead.assignedTo ? 'Переназначить' : 'Назначить ответственного'"
                >
                  <mat-icon>{{ lead.assignedTo ? 'person_add' : 'person_add_alt_1' }}</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <!-- Last Activity Column -->
          <ng-container matColumnDef="lastActivity">
            <th mat-header-cell *matHeaderCellDef>Last Activity</th>
            <td mat-cell *matCellDef="let lead" class="activity-cell">
              {{ getLastActivity(lead) }}
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let lead" class="actions-cell">
              <button mat-icon-button [matMenuTriggerFor]="actionsMenu" (click)="$event.stopPropagation()">
                <mat-icon>more_horiz</mat-icon>
              </button>
              
              <mat-menu #actionsMenu="matMenu">
                <button mat-menu-item (click)="viewLead(lead); $event.stopPropagation()">
                  <mat-icon>visibility</mat-icon>
                  <span>View</span>
                </button>
                <button mat-menu-item (click)="editLead(lead); $event.stopPropagation()">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="changeStatus(lead); $event.stopPropagation()">
                  <mat-icon>swap_horiz</mat-icon>
                  <span>Change Status</span>
                </button>
                <mat-menu #quickStatusMenu="matMenu">
                  <button mat-menu-item (click)="quickUpdateStatus(lead, 'contacted'); $event.stopPropagation()">
                    <mat-icon>contact_phone</mat-icon>
                    <span>Mark as Contacted</span>
                  </button>
                  <button mat-menu-item (click)="quickUpdateStatus(lead, 'qualified'); $event.stopPropagation()">
                    <mat-icon>verified</mat-icon>
                    <span>Mark as Qualified</span>
                  </button>
                  <button mat-menu-item (click)="quickUpdateStatus(lead, 'converted'); $event.stopPropagation()">
                    <mat-icon>check_circle</mat-icon>
                    <span>Mark as Converted</span>
                  </button>
                  <button mat-menu-item (click)="quickUpdateStatus(lead, 'lost'); $event.stopPropagation()" class="danger-action">
                    <mat-icon>cancel</mat-icon>
                    <span>Mark as Lost</span>
                  </button>
                </mat-menu>
                <button mat-menu-item [matMenuTriggerFor]="quickStatusMenu" (click)="$event.stopPropagation()">
                  <mat-icon>speed</mat-icon>
                  <span>Quick Status</span>
                  <mat-icon class="submenu-arrow">chevron_right</mat-icon>
                </button>
                <button mat-menu-item (click)="assignLead(lead); $event.stopPropagation()">
                  <mat-icon>person_add</mat-icon>
                  <span>Assign</span>
                </button>
                <button mat-menu-item (click)="contactLead(lead); $event.stopPropagation()">
                  <mat-icon>phone</mat-icon>
                  <span>Contact</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteLead(lead); $event.stopPropagation()" class="delete-action">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row" (click)="viewLead(row)"></tr>
        </table>

        <!-- No results message -->
        <div *ngIf="!loading() && leads().length === 0" class="no-results">
          <mat-icon class="no-results-icon">search_off</mat-icon>
          <h3>No leads found</h3>
          <p>Try adjusting your search or create a new lead</p>
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Create Lead
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leads-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      background-color: #f8f9fa;
      min-height: 100vh;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .title-section h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .actions button {
      background-color: #4285f4;
      color: white;
      border-radius: 8px;
      padding: 8px 16px;
      font-weight: 500;
    }

    .tabs-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid #e1e4e8;
    }

    .tab {
      background: none;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      color: #6c757d;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .tab.active {
      color: #4285f4;
      border-bottom-color: #4285f4;
    }

    .tab:hover {
      color: #4285f4;
    }

    .search-section {
      display: flex;
      align-items: center;
    }

    .search-field {
      width: 300px;
    }

    .search-field .mat-mdc-form-field-wrapper {
      background-color: white;
      border-radius: 8px;
    }

    .table-container {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .leads-table {
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
    }

    .table-row:hover {
      background-color: #f8f9fa;
    }

    .sort-icon {
      font-size: 16px;
      margin-left: 4px;
      color: #9aa0a6;
    }

    .lead-name-cell {
      font-weight: 500;
      color: #1a1a1a;
    }

    .company-cell {
      color: #5f6368;
    }

    .score-cell {
      text-align: center;
    }

    .score-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }

    .score-badge.high {
      background-color: #34a853;
    }

    .score-badge.medium-high {
      background-color: #fbbc04;
    }

    .score-badge.medium {
      background-color: #ff9800;
    }

    .score-badge.low {
      background-color: #ea4335;
    }

    .status-cell {
      text-align: center;
    }

    .status-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .status-change-btn {
      width: 24px;
      height: 24px;
      line-height: 24px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .status-container:hover .status-change-btn {
      opacity: 0.7;
    }

    .status-change-btn:hover {
      opacity: 1 !important;
    }

    .status-change-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      text-transform: capitalize;
    }

    .status-badge.status-qualified {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-badge.status-new {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .status-badge.status-contacted {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .status-badge.status-converted {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-badge.status-lost {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .manager-cell,
    .activity-cell {
      color: #5f6368;
      font-size: 13px;
    }

    .manager-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .manager-name {
      flex: 1;
    }

    .unassigned-text {
      color: #9e9e9e;
      font-style: italic;
    }

    .assign-btn {
      width: 24px;
      height: 24px;
      line-height: 24px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .manager-container:hover .assign-btn {
      opacity: 0.7;
    }

    .assign-btn:hover {
      opacity: 1 !important;
    }

    .assign-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .actions-cell {
      text-align: right;
      width: 48px;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: #666;
    }

    .loading-spinner p {
      margin-top: 16px;
      font-size: 14px;
    }

    .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      text-align: center;
      color: #666;
    }

    .no-results-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .no-results h3 {
      margin: 0 0 8px 0;
      font-weight: 500;
      color: #1a1a1a;
    }

    .no-results p {
      margin: 0 0 24px 0;
      font-size: 14px;
      color: #5f6368;
    }

    .delete-action {
      color: #d32f2f;
    }

    .danger-action {
      color: #d32f2f;
    }

    .submenu-arrow {
      margin-left: auto;
      opacity: 0.6;
    }

    @media (max-width: 768px) {
      .leads-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        gap: 16px;
      }

      .tabs-section {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .search-field {
        width: 100%;
      }
    }
  `]
})
export class LeadsListComponent implements OnInit {
  private leadService = inject(LeadService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);

  // Signals
  leads = signal<Lead[]>([]);
  loading = signal(true);

  // Table configuration
  displayedColumns: string[] = ['select', 'leadName', 'company', 'leadScore', 'status', 'assignedManager', 'lastActivity', 'actions'];

  // Tabs
  activeTab = 'all';
  
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

  ngOnInit(): void {
    this.loadLeads();
    this.loadManagers();
  }

  private loadManagers(): void {
    this.userService.getManagers().subscribe({
      next: (managers) => this.managers = managers,
      error: (err) => console.error('Error loading managers for list:', err)
    });
  }

  loadLeads(): void {
    this.loading.set(true);
    
    const filters: LeadFilters = {
      search: this.searchQuery || undefined,
      status: this.getStatusesForActiveTab(),
      source: this.selectedSources.length ? this.selectedSources : undefined,
      priority: this.selectedPriorities.length ? this.selectedPriorities : undefined
    };

    this.leadService.getLeads(filters, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.leads.set(response.leads);
        this.totalResults = response.total;
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error loading leads:', error);
        this.loading.set(false);
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
        return [LeadStatus.QUALIFIED, LeadStatus.PROPOSAL_SENT, LeadStatus.NEGOTIATING];
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
    return this.selectedStatuses.length > 0 || 
           this.selectedSources.length > 0 || 
           this.selectedPriorities.length > 0;
  }

  removeStatusFilter(status: LeadStatus): void {
    this.selectedStatuses = this.selectedStatuses.filter(s => s !== status);
    this.applyFilters();
  }

  removeSourceFilter(source: LeadSource): void {
    this.selectedSources = this.selectedSources.filter(s => s !== source);
    this.applyFilters();
  }

  removePriorityFilter(priority: LeadPriority): void {
    this.selectedPriorities = this.selectedPriorities.filter(p => p !== priority);
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
      maxWidth: '90vw'
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
      }
    });
  }

  viewLead(lead: Lead): void {
    const dialogRef = this.dialog.open(LeadDetailComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: lead
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list if lead was updated
      }
    });
  }

  editLead(lead: Lead): void {
    const dialogRef = this.dialog.open(EditLeadDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { lead }
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
      }
    });
  }

  changeStatus(lead: Lead): void {
    const dialogRef = this.dialog.open(ChangeStatusDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { 
        lead, 
        currentStatus: lead.status 
      }
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
      }
    });
  }

  assignLead(lead: Lead): void {
    const dialogRef = this.dialog.open(AssignLeadDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: { 
        lead, 
        currentAssignee: lead.assignedTo 
      }
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
      }
    });
  }

  quickAssign(lead: Lead): void {
    const dialogRef = this.dialog.open(QuickAssignDialogComponent, {
      width: '400px',
      maxWidth: '90vw',
      data: { lead }
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.loadLeads(); // Refresh the list
      }
    });
  }

  quickUpdateStatus(lead: Lead, status: string): void {
    const statusMap: Record<string, LeadStatus> = {
      'contacted': LeadStatus.CONTACTED,
      'qualified': LeadStatus.QUALIFIED,
      'converted': LeadStatus.CONVERTED,
      'lost': LeadStatus.LOST
    };

    const newStatus = statusMap[status];
    if (newStatus && newStatus !== lead.status) {
      this.leadService.updateLeadStatus(lead.id, newStatus).subscribe({
        next: () => {
          this.loadLeads(); // Refresh the list
        },
        error: (error: unknown) => {
          console.error('Error updating lead status:', error);
        }
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
      }
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
        }
      });
    }
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
      [LeadStatus.LOST]: 'Потерян'
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
      [LeadSource.OTHER]: 'Другое'
    };
    return sourceLabels[source] || source;
  }

  getPriorityLabel(priority: LeadPriority): string {
    const priorityLabels: Record<LeadPriority, string> = {
      [LeadPriority.LOW]: 'Низкий',
      [LeadPriority.MEDIUM]: 'Средний',
      [LeadPriority.HIGH]: 'Высокий',
      [LeadPriority.URGENT]: 'Срочный'
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
    if (lead.lastContactedAt) {
      const now = new Date();
      const lastContact = new Date(lead.lastContactedAt);
      const diffTime = Math.abs(now.getTime() - lastContact.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
      return 'Over a year ago';
    }
    
    // Fallback to creation date
    const now = new Date();
    const created = new Date(lead.createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return 'Over a year ago';
  }

  getManagerName(id?: string): string {
    if (!id) return '';
    const manager = this.managers.find(m => m.id?.toString() === id.toString());
    return manager?.fullName || id;
  }
}
