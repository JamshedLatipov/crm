import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LeadService } from '../../services/lead.service';
import { UserService, Manager } from '../../../shared/services/user.service';
import {
  Lead,
  LeadActivity,
  LeadStatus,
  LeadSource,
  LeadPriority,
  ActivityType,
} from '../../models/lead.model';
import { ChangeStatusDialogComponent } from '../change-status-dialog/change-status-dialog.component';
import { AssignLeadDialogComponent } from '../assign-lead-dialog/assign-lead-dialog.component';

@Component({
  selector: 'app-lead-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './lead-detail.component.html',
  styleUrls: ['./lead-detail.component.scss'],
})
export class LeadDetailComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  lead: Lead = {} as Lead;
  activities: LeadActivity[] = [];
  loadingActivities = false;
  managers: Manager[] = [];

  // Status and source mappings
  private statusLabels = {
    [LeadStatus.NEW]: 'Новый',
    [LeadStatus.CONTACTED]: 'Контакт установлен',
    [LeadStatus.QUALIFIED]: 'Квалифицирован',
    [LeadStatus.PROPOSAL_SENT]: 'Предложение отправлено',
    [LeadStatus.NEGOTIATING]: 'Переговоры',
    [LeadStatus.CONVERTED]: 'Конвертирован',
    [LeadStatus.REJECTED]: 'Отклонен',
    [LeadStatus.LOST]: 'Потерян',
  };

  private sourceLabels = {
    [LeadSource.WEBSITE]: 'Сайт',
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

  private priorityLabels = {
    [LeadPriority.LOW]: 'Низкий',
    [LeadPriority.MEDIUM]: 'Средний',
    [LeadPriority.HIGH]: 'Высокий',
    [LeadPriority.URGENT]: 'Срочный',
  };

  ngOnInit(): void {
    // load managers once
    this.loadManagers();

    // listen to route params and load lead by id
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/leads/list']);
        return;
      }
      this.loadLead(id);
    });
  }

  private loadManagers(): void {
    this.userService.getManagers().subscribe({
      next: (managers) => (this.managers = managers),
      error: (err) =>
        console.error('Error loading managers for activity resolution:', err),
    });
  }

  private loadLead(id: string): void {
    this.leadService.getLeadById(id).subscribe({
      next: (lead) => {
        this.lead = lead;
        this.loadActivities();
      },
      error: (err) => {
        console.error('Error loading lead:', err);
        this.router.navigate(['/leads/list']);
      },
    });
  }

  loadActivities(): void {
    if (!this.lead?.id) return;
    this.loadingActivities = true;
    this.leadService.getLeadActivities(this.lead.id).subscribe({
      next: (activities) => {
        this.activities = activities;
        this.loadingActivities = false;
      },
      error: (error: unknown) => {
        console.error('Error loading activities:', error);
        this.loadingActivities = false;
      },
    });
  }

  getStatusLabel(status: LeadStatus): string {
    return this.statusLabels[status] || status;
  }

  getSourceLabel(source: LeadSource): string {
    return this.sourceLabels[source] || source;
  }

  getPriorityLabel(priority: LeadPriority): string {
    return this.priorityLabels[priority] || priority;
  }

  getLocation(): string {
    const parts: string[] = [];
    if (this.lead.city) parts.push(this.lead.city);
    if (this.lead.country) parts.push(this.lead.country);
    return parts.join(', ');
  }

  hasUtmData(): boolean {
    return !!(
      this.lead.utmSource ||
      this.lead.utmMedium ||
      this.lead.utmCampaign ||
      this.lead.utmTerm ||
      this.lead.utmContent ||
      this.lead.referrer
    );
  }

  getActivityIcon(type: string): string {
    const iconMap: Record<string, string> = {
      form_submitted: 'assignment',
      email_opened: 'mark_email_read',
      email_clicked: 'link',
      website_visited: 'language',
      phone_call_made: 'call_made',
      phone_call_received: 'call_received',
      meeting_scheduled: 'event',
      demo_requested: 'play_circle',
      proposal_sent: 'send',
      note_added: 'note_add',
      status_changed: 'swap_horiz',
      assigned: 'person_add',
    };
    return iconMap[type] || 'info';
  }

  getActivityDescription(activity: LeadActivity): string {
    if (activity.type === ActivityType.ASSIGNED) {
      // Try metadata.assignedTo first
      const assignedId =
        (activity.metadata && (activity.metadata['assignedTo'] as string)) ||
        // fallback to parsing id from description like 'Лид назначен менеджеру: 11'
        (typeof activity.description === 'string'
          ? activity.description.split(':').pop()?.trim()
          : undefined);

      if (assignedId) {
        const manager = this.managers.find(
          (m) => m.id?.toString() === assignedId.toString()
        );
        const name = manager?.fullName || assignedId;
        return `Лид назначен менеджеру: ${name}`;
      }
    }

    return activity.description;
  }

  editLead(): void {
    // TODO: Implement edit functionality
    console.log('Edit lead:', this.lead);
  }

  createContactFromLead(): void {
    if (!this.lead?.id) return;
    this.leadService.createContactFromLead(this.lead.id).subscribe({
      next: (contact) => {
        console.log('Created contact from lead:', contact);
        // Link contact id locally
        (this.lead as any).contact = contact.id;
      },
      error: (err) => {
        console.error('Error creating contact from lead:', err);
      }
    });
  }

  contactLead(): void {
    this.leadService.markAsContacted(this.lead.id).subscribe({
      next: () => {
        // Refresh lead data
        console.log('Lead marked as contacted');
      },
      error: (error: unknown) => {
        console.error('Error marking lead as contacted:', error);
      },
    });
  }

  quickChangeStatus(): void {
    const dialogRef = this.dialog.open(ChangeStatusDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {
        lead: this.lead,
        currentStatus: this.lead?.status,
      },
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.lead = result; // Update current lead data
      }
    });
  }

  assignLead(): void {
    const dialogRef = this.dialog.open(AssignLeadDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: {
        lead: this.lead,
        currentAssignee: this.lead?.assignedTo,
      },
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.lead = result; // Update current lead data
      }
    });
  }

  deleteLead(): void {
    if (!this.lead) return;
    if (confirm(`Вы уверены, что хотите удалить лид "${this.lead.name}"?`)) {
      this.leadService.deleteLead(this.lead.id).subscribe({
        next: () => {
          this.router.navigate(['/leads/list']);
        },
        error: (error: unknown) => {
          console.error('Error deleting lead:', error);
        },
      });
    }
  }

  close(): void {
    this.router.navigate(['/leads/list']);
  }
}
