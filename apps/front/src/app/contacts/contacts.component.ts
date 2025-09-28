import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContactsService } from './contacts.service';
import { 
  Contact, 
  ContactsStats 
} from './contact.interfaces';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>Контакты</h1>
            <p class="subtitle">Управление контактами клиентов</p>
          </div>
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Добавить контакт
          </button>
        </div>
      </div>

      <!-- Список контактов -->
      <div class="contacts-grid" *ngIf="!loading; else loadingTemplate">
        <div *ngIf="contacts.length === 0" class="empty-state">
          <mat-icon class="empty-icon">person_search</mat-icon>
          <h3>Контакты не найдены</h3>
          <p>Попробуйте добавить новые контакты</p>
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Добавить первый контакт
          </button>
        </div>

        <div class="contact-card" *ngFor="let contact of contacts; trackBy: trackByContactId">
          <mat-card>
            <div class="card-header">
              <div class="contact-avatar">
                <mat-icon>{{ contact.type === 'company' ? 'business' : 'person' }}</mat-icon>
              </div>
              
              <div class="contact-info">
                <h3 class="contact-name">{{ contact.name }}</h3>
                <p class="contact-details" *ngIf="contact.position">{{ contact.position }}</p>
                <div class="contact-meta">
                  <span class="source-badge">{{ contact.source }}</span>
                  <span class="created-date">{{ formatDate(contact.createdAt) }}</span>
                </div>
              </div>

              <div class="card-actions">
                <button mat-icon-button (click)="viewContact(contact)">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteContact(contact)" [disabled]="loading">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>

            <div class="contact-contact-info" *ngIf="contact.email || contact.phone">
              <div class="contact-item" *ngIf="contact.email">
                <mat-icon class="contact-icon">email</mat-icon>
                <a [href]="'mailto:' + contact.email">{{ contact.email }}</a>
              </div>
              <div class="contact-item" *ngIf="contact.phone">
                <mat-icon class="contact-icon">phone</mat-icon>
                <a [href]="'tel:' + contact.phone">{{ contact.phone }}</a>
              </div>
            </div>

            <div class="blacklist-warning" *ngIf="contact.isBlacklisted">
              <mat-icon>block</mat-icon>
              <span>В черном списке</span>
              <small *ngIf="contact.blacklistReason">{{ contact.blacklistReason }}</small>
            </div>
          </mat-card>
        </div>
      </div>

      <ng-template #loadingTemplate>
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Загрузка контактов...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .page-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .subtitle {
      color: #6b7280;
      font-size: 16px;
      margin: 0;
    }

    .contacts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 16px;
    }

    .contact-card {
      transition: all 0.3s ease;
    }

    .contact-card:hover {
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .contact-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .contact-avatar mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .contact-info {
      flex: 1;
      min-width: 0;
    }

    .contact-name {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: #1f2937;
    }

    .contact-details {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 8px 0;
    }

    .contact-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
    }

    .source-badge {
      background: #f3f4f6;
      color: #374151;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .created-date {
      color: #9ca3af;
    }

    .card-actions {
      flex-shrink: 0;
      display: flex;
      gap: 4px;
    }

    .contact-contact-info {
      margin-bottom: 16px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .contact-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #6b7280;
    }

    .contact-item a {
      color: #2563eb;
      text-decoration: none;
    }

    .contact-item a:hover {
      text-decoration: underline;
    }

    .blacklist-warning {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #dc2626;
      font-size: 12px;
      margin-top: 12px;
    }

    .blacklist-warning mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .blacklist-warning small {
      display: block;
      margin-top: 4px;
      color: #7f1d1d;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 64px 32px;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #d1d5db;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 20px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 8px 0;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      line-height: 1.6;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: #6b7280;
    }

    .loading-container p {
      margin-top: 16px;
      margin-bottom: 0;
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .contacts-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ContactsComponent implements OnInit {
  contacts: Contact[] = [];
  stats: ContactsStats | null = null;
  loading = true;

  private readonly contactsService = inject(ContactsService);
  private readonly snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    // Загружаем контакты и статистику параллельно
    Promise.all([
      this.contactsService.listContacts().toPromise(),
      this.contactsService.getContactsStats().toPromise()
    ]).then(([contacts, stats]) => {
      this.contacts = contacts || [];
      this.stats = stats || null;
      this.loading = false;
    }).catch(error => {
      console.error('Error loading contacts:', error);
      this.snackBar.open('Ошибка загрузки контактов', 'Закрыть', { duration: 3000 });
      this.loading = false;
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
    this.snackBar.open('Создание контакта - в разработке', 'Закрыть', { duration: 3000 });
  }

  viewContact(contact: Contact): void {
    this.snackBar.open(`Просмотр контакта "${contact.name}" - в разработке`, 'Закрыть', { duration: 3000 });
  }

  deleteContact(contact: Contact): void {
    if (confirm(`Вы уверены, что хотите удалить контакт "${contact.name}"?`)) {
      this.contactsService.deleteContact(contact.id).subscribe({
        next: () => {
          this.snackBar.open('Контакт удален', 'Закрыть', { duration: 3000 });
          this.loadData();
        },
        error: (error) => {
          console.error('Error deleting contact:', error);
          this.snackBar.open('Ошибка удаления контакта', 'Закрыть', { duration: 3000 });
        }
      });
    }
  }
}
