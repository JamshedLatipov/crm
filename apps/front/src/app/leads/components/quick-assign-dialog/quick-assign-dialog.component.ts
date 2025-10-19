import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LeadService } from '../../services/lead.service';
import { Lead } from '../../models/lead.model';
import { Manager, UserService } from '../../../shared/services/user.service';
import { UserAvatarComponent } from '../../../shared/components/user-avatar/user-avatar.component';

interface QuickAssignData {
  // single lead or multiple leads for bulk assign
  lead?: Lead;
  leads?: Lead[];
}

@Component({
  selector: 'app-quick-assign-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    UserAvatarComponent,
  ],
  templateUrl: './quick-assign-dialog.component.html',
  styleUrls: ['./quick-assign-dialog.component.scss'],
})
export class QuickAssignDialogComponent {
  // Map role keys to human-friendly labels
  private readonly ROLE_LABELS: Record<string, string> = {
    operator: 'Оператор',
    account_manager: 'Аккаунт-менеджер',
    team_lead: 'Тимлид',
    sales_manager: 'Менеджер по продажам',
    senior_manager: 'Старший менеджер',
    client: 'Клиент',
  };

  /**
   * Returns a readable label for a role key. Falls back to capitalized key if unknown.
   */
  getRoleLabel(roleKey?: string): string {
    if (!roleKey) return '';
    return this.ROLE_LABELS[roleKey] || this.humanizeRoleKey(roleKey);
  }

  private humanizeRoleKey(key: string): string {
    // Replace underscores with spaces and capitalize words
    return key.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }

  getRolesLabel(roles?: string[] | null): string {
    if (!roles || roles.length === 0) return 'Менеджер';
    return roles.map(r => this.getRoleLabel(r)).join(', ');
  }

  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);
  private readonly dialogRef = inject(MatDialogRef<QuickAssignDialogComponent>);
  readonly data = inject<QuickAssignData>(MAT_DIALOG_DATA);

  // Initialize with first lead's assignee if single, otherwise blank
  selectedManagerId: string = (this.data.lead?.assignedTo) || '';
  loading = false;

  // Real managers data from API
  availableManagers: Manager[] = [];

  constructor() {
    this.loadManagers();
  }

  private loadManagers(): void {
    this.loading = true;
    this.userService.getManagers(true).subscribe({
      next: (managers) => {
        this.availableManagers = managers;
        this.loading = false;
      },
      error: (error: unknown) => {
        console.error('Error loading managers:', error);
        this.loading = false;
      }
    });
  }

  assign(): void {
    this.loading = true;

    if (this.selectedManagerId) {
      // If multiple leads provided, call bulkAssign
      if (this.data.leads && this.data.leads.length > 0) {
        const ids = this.data.leads.map(l => l.id);
        this.leadService.bulkAssign(ids, this.selectedManagerId).subscribe({
          next: (updatedLeads) => this.dialogRef.close(updatedLeads),
          error: (error: unknown) => {
            console.error('Error bulk assigning leads:', error);
            this.loading = false;
          }
        });
      } else if (this.data.lead) {
        // Назначить менеджера for single lead
        this.leadService.assignLead(this.data.lead.id, this.selectedManagerId).subscribe({
          next: (updatedLead) => {
            this.dialogRef.close(updatedLead);
          },
          error: (error: unknown) => {
            console.error('Error assigning lead:', error);
            this.loading = false;
          }
        });
      } else {
        // No lead(s) provided
        this.dialogRef.close();
      }
    } else {
      // Снять назначение (если такая функция есть в API)
      // Пока просто закрываем диалог
      this.dialogRef.close();
    }
  }

  trackByManagerId(index: number, manager: Manager): string {
    return manager.id;
  }

  getSelectedManager(): Manager | null {
    if (!this.selectedManagerId) return null;
    return this.availableManagers.find(m => m.id === this.selectedManagerId) || null;
  }

  /**
   * Возвращает объект менеджера, который сейчас назначен на лид (если он загружен в availableManagers).
   * Если менеджер не найден, возвращает null. Шаблон использует это для показа имени вместо id.
   */
  getAssignedManager(): Manager | null {
    const id = this.data.lead?.assignedTo;
    if (!id) return null;
    return this.availableManagers.find(m => m.id === id) || null;
  }

  close(): void {
    this.dialogRef.close();
  }
}
