import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LeadService } from '../../services/lead.service';
import { Lead } from '../../models/lead.model';
import { Manager, UserService } from '../../../shared/services/user.service';
import { UserAvatarComponent } from '../../../shared/components/user-avatar/user-avatar.component';

interface AssignLeadData {
  lead: Lead;
  currentAssignee?: string;
}

@Component({
  selector: 'app-assign-lead-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    UserAvatarComponent,
  ],
  templateUrl: './assign-lead-dialog.component.html',
  styleUrls: ['./assign-lead-dialog.component.scss'],
})
export class AssignLeadDialogComponent {
  // Public properties
  readonly data = inject<AssignLeadData>(MAT_DIALOG_DATA);
  assignForm: FormGroup;
  selectedManager: Manager | null = null;
  loading = false;
  availableManagers: Manager[] = [];

  // Private services
  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);
  private readonly dialogRef = inject(MatDialogRef<AssignLeadDialogComponent>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);


  private roleLabels = {
    SALES_MANAGER: 'Менеджер по продажам',
    SENIOR_MANAGER: 'Старший менеджер',
    TEAM_LEAD: 'Руководитель группы',
    ACCOUNT_MANAGER: 'Аккаунт-менеджер',
  };

  constructor() {
    this.assignForm = this.formBuilder.group({
      assignmentType: ['single', Validators.required],
      autoAssignCriteria: [['workload']],
      notes: [''],
      highPriority: [false],
      notifyAssignee: [true],
      scheduleFollowUp: [false],
      selectedTeamMembers: [[]],
    });

    this.loadManagers();
  }

  private loadManagers(): void {
    this.loading = true;
    this.userService.getManagers().subscribe({
      next: (managers) => {
        this.availableManagers = managers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading managers:', error);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  public selectManager(manager: Manager): void {
    if (manager.currentLeadsCount < manager.maxLeadsCapacity)
      this.selectedManager = manager;
  }

  get selectedTeamMembers(): string[] {
    return this.assignForm.get('selectedTeamMembers')?.value || [];
  }

  public getRoleLabel(roles: string[]): string {
    if (!roles || roles.length === 0) return 'Неизвестная роль';
    const role = roles.find(
      (r) => this.roleLabels[r as keyof typeof this.roleLabels]
    );
    return (
      this.roleLabels[role as keyof typeof this.roleLabels] ||
      roles[0] ||
      'Неизвестная роль'
    );
  }

  public getAssignmentPreview(): string {
    const type = this.assignForm.get('assignmentType')?.value;
    switch (type) {
      case 'single':
        return this.selectedManager
          ? `Лид будет назначен менеджеру ${
              this.selectedManager.fullName
            } (${this.getRoleLabel(this.selectedManager.roles)})`
          : '';
      case 'team':
        return this.selectedTeamMembers.length > 0
          ? `Лид будет назначен команде: ${this.selectedTeamMembers
              .map(
                (id: string) =>
                  this.availableManagers.find((m) => m.id === id)?.fullName
              )
              .filter(Boolean)
              .join(', ')}`
          : '';
      case 'auto':
        return 'Система автоматически выберет наиболее подходящего менеджера';
      default:
        return '';
    }
  }

  isAssignmentValid(): boolean {
    const type = this.assignForm.get('assignmentType')?.value;
    if (type === 'single') return !!this.selectedManager;
    if (type === 'team') return this.selectedTeamMembers.length > 0;
    return type === 'auto';
  }

  getCurrentAssigneeName(): string {
    const id = this.data.currentAssignee;
    if (!id) return '';
    const manager = this.availableManagers.find(
      (m) => m.id?.toString() === id?.toString()
    );
    return manager?.fullName || id;
  }

  assignLead(): void {
    if (!this.isAssignmentValid()) return;
    this.loading = true;
    const type = this.assignForm.get('assignmentType')?.value;
    let assigneeId: string = '';

    if (type === 'single') {
      if (this.selectedManager) assigneeId = this.selectedManager.id.toString();
      else {
        this.loading = false;
        return;
      }
    } else if (type === 'team') {
      const firstTeamMember = this.selectedTeamMembers[0];
      if (!firstTeamMember) {
        this.loading = false;
        return;
      }
      assigneeId = firstTeamMember;
    } else {
      const available = this.availableManagers
        .filter((m) => m.currentLeadsCount < m.maxLeadsCapacity)
        .sort((a, b) => a.currentLeadsCount - b.currentLeadsCount)[0];
      if (available) {
        assigneeId = available.id.toString();
      } else if (
        this.availableManagers.length > 0 &&
        this.availableManagers[0]
      ) {
        assigneeId = this.availableManagers[0].id.toString();
      } else {
        this.loading = false;
        return;
      }
    }

    this.leadService.assignLead(this.data.lead.id, assigneeId).subscribe({
      next: (updatedLead) => {
        const notes = this.assignForm.get('notes')?.value;
        if (notes?.trim()) {
          const assignedManager = this.availableManagers.find(
            (m) => m.id.toString() === assigneeId
          );
          const noteContent = `Назначен ответственный: ${
            assignedManager?.fullName || assigneeId
          }.\n\nКомментарий: ${notes.trim()}`;
          this.leadService.addNote(this.data.lead.id, noteContent).subscribe({
            next: () => this.dialogRef.close(updatedLead),
            error: () => this.dialogRef.close(updatedLead),
          });
        } else {
          this.dialogRef.close(updatedLead);
        }
      },
      error: (error) => {
        console.error('Error assigning lead:', error);
        this.loading = false;
      },
    });
  }

  trackByManagerId(index: number, manager: Manager): string {
    return manager.id;
  }

  close(): void {
    this.dialogRef.close();
  }
}
