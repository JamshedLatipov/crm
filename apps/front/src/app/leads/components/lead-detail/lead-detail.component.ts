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
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { LeadService } from '../../services/lead.service';
import { UserService, Manager } from '../../../shared/services/user.service';
import {
  Lead,
  LeadActivity,
  LeadSource,
  ActivityType,
  Assignment,
  LeadStatus,
} from '../../models/lead.model';
import { ChangeStatusDialogComponent } from '../change-status-dialog/change-status-dialog.component';
import { AssignUserDialogComponent } from '../../../deals/components/assign-user-dialog.component';
import { EditLeadDialogComponent } from '../edit-lead-dialog/edit-lead-dialog.component';
import { ConvertToDealDialogComponent } from '../convert-to-deal-dialog/convert-to-deal-dialog.component';
import { CommentsComponent } from '../../../shared/components/comments/comments.component';
import { CommentEntityType } from '../../../shared/interfaces/comment.interface';
import { LeadPriorityComponent } from '../lead-priority/lead-priority.component';
import { LeadActionsComponent } from '../lead-actions/lead-actions.component';
import { LeadStatusComponent } from '../lead-status/lead-status.component';
import { TaskListWidgetComponent } from '../../../tasks/components/task-list-widget.component';
import { AssignmentService } from '../../../services/assignment.service';
import { PromoCompaniesService } from '../../../promo-companies/services/promo-companies.service';
import { CreatePromoCompanyDialogComponent } from '../../../promo-companies/components/create-promo-company-dialog/create-promo-company-dialog.component';
import { AssignPromoCompanyDialogComponent } from '../../../promo-companies/components/assign-promo-company-dialog/assign-promo-company-dialog.component';

interface HistoryEntry {
  field: string;
  fieldName: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  changedAt: string;
  changedBy?: string;
  timestamp: string;
  userName?: string;
}

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
    MatSnackBarModule,
    CommentsComponent,
    LeadPriorityComponent,
    LeadActionsComponent,
    LeadStatusComponent,
    TaskListWidgetComponent,
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
  private readonly snackBar = inject(MatSnackBar);
  private readonly promoCompaniesService = inject(PromoCompaniesService);
  private readonly assignmentService = inject(AssignmentService);

  lead: Lead = {} as Lead;
  activities: LeadActivity[] = [];
  history: HistoryEntry[] = [];
  loadingActivities = false;
  loadingLead = false;
  error = '';
  managers: Manager[] = [];
  currentAssignments: Assignment[] = [];
  promoCompanies: any[] = [];
  // Для компонента комментариев
  readonly CommentEntityType = CommentEntityType;

  // Геттер для проверки, конвертирован ли лид
  get isConverted(): boolean {
    return this.lead?.status === LeadStatus.CONVERTED;
  }

  // Status and source mappings
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

  ngOnInit(): void {
    // load managers once
    this.loadManagers();
    this.loadPromoCompanies();

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

  private loadPromoCompanies(): void {
    this.promoCompaniesService.getAll().subscribe({
      next: (companies) => (this.promoCompanies = companies),
      error: (err) => console.error('Error loading promo companies:', err),
    });
  }

  private loadLead(id: string): void {
    console.log('LeadDetail: Loading lead with id:', id, 'type:', typeof id);
    this.leadService.getLeadById(id).subscribe({
      next: (lead) => {
        this.lead = lead;
        console.log(
          'LeadDetail: Lead loaded:',
          lead,
          'lead.id:',
          lead.id,
          'type:',
          typeof lead.id
        );
        this.loadActivities();
        // Use assignment info from returned lead model instead of calling centralized assignment API
        this.setAssignmentsFromLead();
      },
      error: (err) => {
        console.error('Error loading lead:', err);
        this.router.navigate(['/leads/list']);
      },
    });
  }

  // Populate currentAssignments from the lead model's assignedTo field returned by API
  private setAssignmentsFromLead(): void {
    if (!this.lead) {
      this.currentAssignments = [];
      return;
    }

    const assigned = (this.lead as any).assignedTo ?? this.lead.assignedTo;
    if (assigned === null || assigned === undefined || assigned === '') {
      this.currentAssignments = [];
      return;
    }

    const userId = Number(assigned);
    let resolvedName: string | undefined = undefined;
    let resolvedEmail: string | undefined = undefined;

    if (!Number.isNaN(userId)) {
      const manager = this.managers.find(
        (m) => String(m.id) === String(userId)
      );
      if (manager) {
        resolvedName = manager.fullName || manager.username || undefined;
        resolvedEmail = (manager as any).email || undefined;
      }
      this.currentAssignments = [
        {
          userId: userId,
          userName: resolvedName,
          userEmail: resolvedEmail,
          assignedAt: new Date(),
          status: 'active',
        } as any,
      ];
    } else {
      // If assigned is not numeric, keep as string id
      this.currentAssignments = [
        {
          userId: String(assigned) as any,
          userName: undefined,
          userEmail: undefined,
          assignedAt: new Date(),
          status: 'active',
        } as any,
      ];
    }
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

  getSourceLabel(source: LeadSource): string {
    return this.sourceLabels[source] || source;
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
    if (this.isConverted) {
      return; // Конвертированные лиды нельзя редактировать
    }

    const dialogRef = this.dialog.open(EditLeadDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        lead: this.lead,
      },
    });

    dialogRef.afterClosed().subscribe((result: Lead | undefined) => {
      if (result) {
        this.lead = result; // Обновляем данные лида
        // Обновим назначения на странице из данных лида (assignedTo), чтобы показать актуального менеджера
        this.setAssignmentsFromLead();
        console.log('Lead updated:', result);
      }
    });
  }

  createContactFromLead(): void {
    if (!this.lead?.id) return;
    this.leadService.createContactFromLead(this.lead.id).subscribe({
      next: (contact) => {
        console.log('Created contact from lead:', contact);
        // Link contact id locally (temporary field not in interface)
        (this.lead as Lead & { contact?: string }).contact = contact.id;
        // Переходим к карточке созданного контакта
        this.goToContact(contact.id);
      },
      error: (err) => {
        console.error('Error creating contact from lead:', err);
        alert('Ошибка при создании контакта из лида');
      },
    });
  }

  goToContact(contactId?: string): void {
    if (contactId) {
      // Переходим к существующему контакту
      this.router.navigate(['/contacts/view', contactId]);
    } else if (this.lead?.email || this.lead?.phone) {
      // Проверяем, есть ли уже контакт с таким email или телефоном
      // Это можно реализовать через поиск контактов
      // Пока что создаем новый контакт
      this.createContactFromLead();
    } else {
      alert('Недостаточно данных для создания контакта');
    }
  }

  contactLead(): void {
    this.leadService.markAsContacted(this.lead.id).subscribe({
      next: () => {
        // Обновляем дату последнего контакта
        this.lead.lastContactedAt = new Date();
      },
      error: (error: unknown) => {
        console.error('Error marking lead as contacted:', error);
      },
    });
  }

  quickChangeStatus(): void {
    if (this.isConverted) {
      return; // Конвертированные лиды нельзя редактировать
    }

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
    if (this.isConverted) {
      return; // Конвертированные лиды нельзя редактировать
    }
    // Open shared users dialog for changing assignee
    const users = this.managers.map((m) => ({
      id: m.id?.toString(),
      name: m.fullName,
      email: (m as any).email,
      role: m.roles?.[0],
    }));
    const dialogRef = this.dialog.open(AssignUserDialogComponent, {
      width: '560px',
      maxWidth: '90vw',
      data: {
        deal: {
          title: this.lead.name,
          assignedTo: this.getCurrentAssignee(),
        } as any,
        currentUsers: [],
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.userId) {
        this.leadService.assignLead(this.lead.id, result.userId).subscribe({
          next: (updated) => {
            this.lead = updated;
            this.setAssignmentsFromLead();
          },
          error: (err) => console.error('Error assigning lead:', err),
        });
      }
    });
  }

  deleteLead(): void {
    if (!this.lead) return;
    if (this.isConverted) {
      alert('Конвертированные лиды нельзя удалить');
      return;
    }

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

  getCurrentAssignee(): string | undefined {
    const activeAssignment = this.currentAssignments.find(
      (a) => a.status === 'active'
    );
    return activeAssignment ? activeAssignment.userId.toString() : undefined;
  }

  get getAssigneeName(): string {
    const activeAssignment = this.currentAssignments.length
      ? this.currentAssignments[0]
      : undefined;
    if (!activeAssignment) {
      return 'Не назначен';
    }

    const manager = this.managers.find(
      (m) => m.id?.toString() === activeAssignment.userId.toString()
    );
    return (
      manager?.fullName || manager?.username || `ID: ${activeAssignment.userId}`
    );
  }

  getAssigneeInitials(): string {
    const a = this.currentAssignments.length
      ? this.currentAssignments[0]
      : undefined;
    const name = (a as any)?.userName;
    if (!name) return '';
    const parts = String(name).split(' ').filter(Boolean);
    const initials = parts
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return initials;
  }

  getAssigneeEmail(): string | undefined {
    const a = this.currentAssignments.length
      ? this.currentAssignments[0]
      : undefined;
    return (a as any)?.userEmail;
  }

  getAssigneeWorkload(): string | undefined {
    const a = this.currentAssignments.length
      ? this.currentAssignments[0]
      : undefined;
    return (a as any)?.workload;
  }

  getActivityLabel(type: ActivityType): string {
    const labels: Record<ActivityType, string> = {
      [ActivityType.FORM_SUBMITTED]: 'Форма отправлена',
      [ActivityType.EMAIL_OPENED]: 'Email открыт',
      [ActivityType.EMAIL_CLICKED]: 'Ссылка в email нажата',
      [ActivityType.EMAIL_REPLIED]: 'Ответ на email',
      [ActivityType.WEBSITE_VISITED]: 'Посещение сайта',
      [ActivityType.PHONE_CALL_MADE]: 'Исходящий звонок',
      [ActivityType.PHONE_CALL_RECEIVED]: 'Входящий звонок',
      [ActivityType.MEETING_SCHEDULED]: 'Встреча запланирована',
      [ActivityType.MEETING_ATTENDED]: 'Встреча проведена',
      [ActivityType.DEMO_REQUESTED]: 'Запрос демо',
      [ActivityType.DEMO_ATTENDED]: 'Демо проведено',
      [ActivityType.PROPOSAL_SENT]: 'Предложение отправлено',
      [ActivityType.PROPOSAL_VIEWED]: 'Предложение просмотрено',
      [ActivityType.CONTRACT_SENT]: 'Контракт отправлен',
      [ActivityType.CONTRACT_SIGNED]: 'Контракт подписан',
      [ActivityType.PAYMENT_RECEIVED]: 'Оплата получена',
      [ActivityType.SUPPORT_TICKET_CREATED]: 'Тикет создан',
      [ActivityType.SOCIAL_MEDIA_ENGAGEMENT]: 'Активность в соц.сетях',
      [ActivityType.WEBINAR_ATTENDED]: 'Вебинар посещен',
      [ActivityType.DOWNLOAD_COMPLETED]: 'Загрузка завершена',
      [ActivityType.NOTE_ADDED]: 'Заметка добавлена',
      [ActivityType.STATUS_CHANGED]: 'Статус изменен',
      [ActivityType.ASSIGNED]: 'Назначено',
    };
    return labels[type] || type;
  }

  goBack(): void {
    this.router.navigate(['/leads/list']);
  }

  convertToDeal(): void {
    if (!this.lead?.id) return;
    if (this.isConverted) {
      alert('Этот лид уже конвертирован в сделку');
      return;
    }

    const dialogRef = this.dialog.open(ConvertToDealDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        lead: this.lead,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Lead converted to deal:', result);
        // Перенаправляем на страницу созданной сделки
        this.router.navigate(['/deals/view', result.id]);
      }
    });
  }

  createPromo(): void {
    const dialogRef = this.dialog.open(CreatePromoCompanyDialogComponent, {
      width: '600px',
      data: {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Add the current lead to the created promo company
        this.promoCompaniesService
          .addLeads(result.id, { leadIds: [+this.lead.id] })
          .subscribe({
            next: () => {
              console.log('Lead added to promo company:', result);
              this.snackBar.open('Лид добавлен в промо-компанию', 'Закрыть', {
                duration: 3000,
              });
              // Reload lead to show updated promo company
              this.loadLead(this.lead.id);
            },
            error: (error) => {
              console.error('Error adding lead to promo company:', error);
              this.snackBar.open(
                'Ошибка добавления лида в промо-компанию',
                'Закрыть',
                { duration: 3000 }
              );
            },
          });
      }
    });
  }

  getPromoCompanyName(promoCompanyId: number): string {
    const company = this.promoCompanies.find((c) => c.id === promoCompanyId);
    return company?.name || `ID: ${promoCompanyId}`;
  }

  removePromoCompany(): void {
    if (!this.lead.promoCompanyId) return;

    if (confirm('Вы уверены, что хотите отвязать лид от промо-компании?')) {
      this.leadService.removeLeadFromPromoCompany(this.lead.id).subscribe({
        next: () => {
          this.snackBar.open('Лид отвязан от промо-компании', 'Закрыть', {
            duration: 3000,
          });
          this.lead.promoCompanyId = undefined;
        },
        error: (error) => {
          console.error('Error removing lead from promo company:', error);
          this.snackBar.open(
            'Ошибка отвязки лида от промо-компании',
            'Закрыть',
            { duration: 3000 }
          );
        },
      });
    }
  }

  assignPromoCompany(): void {
    const dialogRef = this.dialog.open(AssignPromoCompanyDialogComponent, {
      width: '500px',
      data: { currentPromoCompanyId: this.lead.promoCompanyId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.leadService
          .assignLeadToPromoCompany(this.lead.id, result)
          .subscribe({
            next: () => {
              this.snackBar.open('Промо-компания присвоена лиду', 'Закрыть', {
                duration: 3000,
              });
              this.lead.promoCompanyId = result;
            },
            error: (error) => {
              console.error('Error assigning promo company to lead:', error);
              this.snackBar.open(
                'Ошибка присвоения промо-компании',
                'Закрыть',
                { duration: 3000 }
              );
            },
          });
      }
    });
  }
}
