import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ContactsService } from '../../contacts.service';
import { Contact, ContactType, ContactSource, ContactActivity, ActivityType, Deal } from '../../contact.interfaces';

@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule,
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './contact-detail.component.html',
  styleUrls: ['./contact-detail.component.scss']
})
export class ContactDetailComponent implements OnInit {
  contact: Contact | null = null;
  loading = true;
  selectedTabIndex = 0;
  placeholderAvatar = 'https://via.placeholder.com/150';
  
  // Activity data
  activities: ContactActivity[] = [];
  activitiesLoading = false;
  // Inline add activity form
  addingActivity = false;
  newActivityTitle = '';
  newActivityDescription = '';
  // Pagination
  activityPage = 1;
  activityPageSize = 20;
  activitiesHasMore = false;
  
  // Deals data
  deals: Deal[] = [];
  dealsLoading = false;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  readonly contactsService = inject(ContactsService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }

    this.loadContact(id);
  }

  private loadContact(id: string): void {
    this.loading = true;
    this.contactsService.getContactById(id).subscribe({
      next: (contact) => { 
        this.contact = contact; 
        this.loading = false;
        this.loadActivity(id);
        this.loadDeals(id);
      },
      error: (error) => { 
        console.error('Error loading contact:', error);
        this.loading = false; 
        this.showError('Ошибка загрузки контакта');
      }
    });
  }

  private loadActivity(contactId: string): void {
    this.activitiesLoading = true;
    const page = this.activityPage;
    const size = this.activityPageSize;
    this.contactsService.getContactActivity(contactId, page, size).subscribe({
      next: (resp) => {
        const activities = resp.items || [];
        const normalized = activities.map((a) => ({
          ...a,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          date: ((a as any).date as string) || ((a as any).createdAt as string) || '',
        }));

        if (page === 1) {
          this.activities = normalized;
        } else {
          this.activities = this.activities.concat(normalized);
        }

        // Use total from server to determine if more pages exist
        const total = typeof resp.total === 'number' ? resp.total : (this.activities.length);
        this.activitiesHasMore = this.activities.length < total;
        this.activitiesLoading = false;
      },
      error: (error) => {
        console.error('Error loading activity:', error);
        if (page === 1) this.activities = [];
        this.activitiesHasMore = false;
        this.activitiesLoading = false;
      }
    });
  }

  loadMoreActivity(): void {
    if (!this.contact) return;
    if (!this.activitiesHasMore) return;
    this.activityPage += 1;
    this.loadActivity(this.contact.id);
  }

  private loadDeals(contactId: string): void {
    this.dealsLoading = true;
    console.log('Loading deals for contact:', contactId);
    this.contactsService.getContactDeals(contactId).subscribe({
      next: (deals) => {
        console.log('Deals loaded:', deals);
        this.deals = deals;
        this.dealsLoading = false;
      },
      error: (error) => {
        console.error('Error loading deals:', error);
        this.deals = [];
        this.dealsLoading = false;
      }
    });
  }

  // Status methods
  getStatusChipClass(): string {
    if (!this.contact) return '';
    
    if (this.contact.isBlacklisted) return 'bg-red-100 text-red-800';
    if (!this.contact.isActive) return 'bg-gray-100 text-gray-800';
    return 'bg-green-100 text-green-800';
  }

  getStatusTooltip(): string {
    if (!this.contact) return '';
    
    if (this.contact.isBlacklisted) return `В черном списке: ${this.contact.blacklistReason || 'Не указана причина'}`;
    if (!this.contact.isActive) return 'Неактивный контакт';
    return 'Активный контакт';
  }

  getStatusIcon(): string {
    if (!this.contact) return 'person';
    
    if (this.contact.isBlacklisted) return 'block';
    if (!this.contact.isActive) return 'pause_circle';
    return 'check_circle';
  }

  getStatusText(): string {
    if (!this.contact) return '';
    
    if (this.contact.isBlacklisted) return 'Заблокирован';
    if (!this.contact.isActive) return 'Неактивен';
    return 'Активен';
  }

  getSourceIcon(): string {
    if (!this.contact?.source) return 'help_outline';
    
    const icons: Record<ContactSource, string> = {
      [ContactSource.WEBSITE]: 'language',
      [ContactSource.PHONE]: 'phone',
      [ContactSource.EMAIL]: 'email',
      [ContactSource.REFERRAL]: 'person_add',
      [ContactSource.SOCIAL_MEDIA]: 'share',
      [ContactSource.ADVERTISING]: 'campaign',
      [ContactSource.IMPORT]: 'upload',
      [ContactSource.OTHER]: 'help_outline'
    };
    
    return icons[this.contact.source] || 'help_outline';
  }

  // Address methods
  hasAddressInfo(): boolean {
    if (!this.contact?.address) return false;
    
    return !!(
      this.contact.address.country ||
      this.contact.address.city ||
      this.contact.address.street ||
      this.contact.address.region
    );
  }

  getFullAddress(): string {
    if (!this.contact?.address) return '';
    
    const parts = [
      this.contact.address.street,
      this.contact.address.building,
      this.contact.address.apartment,
      this.contact.address.city,
      this.contact.address.region,
      this.contact.address.country,
      this.contact.address.postalCode
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  // Utility methods
  formatDate(dateString: string): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActivityIcon(type: ActivityType): string {
    return this.contactsService.getActivityIcon(type);
  }

  trackActivityById(index: number, activity: ContactActivity): string {
    return activity.id;
  }

  openAddActivityDialog(): void {
    // show inline add form instead of dialog
    if (!this.contact) return;
    this.addingActivity = true;
  }

  cancelAddActivity(): void {
    this.addingActivity = false;
    this.newActivityTitle = '';
    this.newActivityDescription = '';
  }

  saveNewActivity(): void {
    if (!this.contact) return;
    const payload = {
      type: ActivityType.SYSTEM,
      title: this.newActivityTitle || 'Взаимодействие',
      description: this.newActivityDescription || ''
    } as any;

    this.contactsService.addContactActivity(this.contact.id, payload).subscribe({
      next: (activity) => {
        // normalize createdAt -> date
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalized = { ...(activity as any), date: (activity as any).createdAt || (activity as any).date } as ContactActivity;
        this.activities.unshift(normalized);
        this.addingActivity = false;
        this.newActivityTitle = '';
        this.newActivityDescription = '';
        this.showSuccess('Активность добавлена');
      },
      error: (err) => {
        console.error('Error adding activity:', err);
        this.showError('Ошибка добавления активности');
      }
    });
  }

  // Actions
  updateLastContact(): void {
    if (!this.contact) return;
    
    this.contactsService.updateLastContactDate(this.contact.id).subscribe({
      next: (updatedContact) => {
        this.contact = updatedContact;
        // Добавляем запись в активность
        this.contactsService.addContactActivity(this.contact.id, {
          type: ActivityType.SYSTEM,
          title: 'Отмечен контакт',
          description: 'Дата последнего контакта обновлена'
        }).subscribe({
          next: (activity) => {
            // normalize createdAt -> date
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const normalized = { ...(activity as any), date: (activity as any).createdAt || (activity as any).date } as ContactActivity;
            this.activities.unshift(normalized); // Добавляем в начало списка
          },
          error: (error) => console.error('Error adding activity:', error)
        });
        this.showSuccess('Дата последнего контакта обновлена');
      },
      error: () => this.showError('Ошибка обновления даты контакта')
    });
  }

  toggleBlacklist(): void {
    if (!this.contact) return;
    
    if (this.contact.isBlacklisted) {
      this.contactsService.unblacklistContact(this.contact.id).subscribe({
        next: (updatedContact) => {
          this.contact = updatedContact;
          this.showSuccess('Контакт убран из черного списка');
        },
        error: () => this.showError('Ошибка снятия блокировки')
      });
    } else {
      const reason = prompt('Укажите причину добавления в черный список:');
      if (reason) {
        this.contactsService.blacklistContact(this.contact.id, reason).subscribe({
          next: (updatedContact) => {
            this.contact = updatedContact;
            this.showSuccess('Контакт добавлен в черный список');
          },
          error: () => this.showError('Ошибка добавления в черный список')
        });
      }
    }
  }

  deleteContact(): void {
    if (!this.contact) return;
    
    const confirmed = confirm(`Вы уверены, что хотите удалить контакт "${this.contactsService.formatContactName(this.contact)}"?`);
    if (confirmed) {
      this.contactsService.deleteContact(this.contact.id).subscribe({
        next: () => {
          this.showSuccess('Контакт удален');
          this.goBack();
        },
        error: () => this.showError('Ошибка удаления контакта')
      });
    }
  }

  onEdit(): void {
    if (!this.contact) return;
    
    import('../edit-contact-dialog.component').then((m) => {
      const dialogRef = this.dialog.open(m.EditContactDialogComponent, {
        width: '700px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: { contact: this.contact }
      });

      dialogRef.afterClosed().subscribe((updatedContact) => {
        if (updatedContact) {
          this.contact = updatedContact;
          this.showSuccess('Контакт успешно обновлен');
        }
      });
    });
  }

  goBack(): void { 
    this.router.navigate(['/contacts']); 
  }

  // Notification helpers
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Закрыть', { duration: 3000, panelClass: 'success-snackbar' });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Закрыть', { duration: 5000, panelClass: 'error-snackbar' });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Закрыть', { duration: 3000 });
  }

  // Deals methods
  getDealStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'new': 'Новая',
      'in_progress': 'В работе',
      'negotiation': 'Переговоры',
      'won': 'Выиграна',
      'lost': 'Проиграна',
      'postponed': 'Отложена'
    };
    return statusLabels[status] || status;
  }

  openDeal(dealId: string): void {
    // navigate to the deal detail route
    this.router.navigate(['/deals/view', dealId]);
  }

  createDeal(): void {
    if (!this.contact) return;
    
    // Открываем диалог создания сделки или перенаправляем на страницу создания
    // Navigate to the deals list and pass contactId so the Deals page
    // can open the create dialog prefilled for this contact.
    this.router.navigate(['/deals'], { 
      queryParams: { contactId: this.contact.id, new: '1' } 
    });
  }

  editDeal(deal: Deal): void {
    this.router.navigate(['/deals', deal.id, 'edit']);
  }

  deleteDeal(dealId: string): void {
    const confirmed = confirm('Вы уверены, что хотите удалить эту сделку?');
    if (confirmed) {
      // Здесь должен быть вызов API для удаления сделки
      // После удаления - перезагрузить список сделок
      this.loadDeals(this.contact!.id);
    }
  }
}
