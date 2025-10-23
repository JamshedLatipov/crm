import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Contact } from '../contact.interfaces';
import { ContactsService } from '../contacts.service';

@Component({
  selector: 'app-contact-card',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <mat-card class="contact-card" [class.blacklisted]="contact.isBlacklisted">
      <div class="card-header">
        <div class="contact-avatar">
          <mat-icon>{{ contact.type === 'company' ? 'business' : 'person' }}</mat-icon>
        </div>
        
        <div class="contact-info">
          <h3 class="contact-name">{{ getContactName() }}</h3>
          <p class="contact-details" *ngIf="getContactDetails()">{{ getContactDetails() }}</p>
          <div class="contact-meta">
            <span class="source-badge">{{ getSourceLabel() }}</span>
            <span class="created-date">{{ formatDate(contact.createdAt) }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button mat-icon-button [matMenuTriggerFor]="contactMenu" aria-label="Меню контакта">
            <mat-icon>more_vert</mat-icon>
          </button>
        </div>
      </div>

      <div class="contact-contact-info" *ngIf="hasContactInfo()">
        <div class="contact-item" *ngIf="contact.email">
          <mat-icon class="contact-icon">email</mat-icon>
          <a [href]="'mailto:' + contact.email">{{ contact.email }}</a>
        </div>
        <div class="contact-item" *ngIf="contact.phone">
          <mat-icon class="contact-icon">phone</mat-icon>
          <a [href]="'tel:' + contact.phone">{{ contact.phone }}</a>
        </div>
        <div class="contact-item" *ngIf="contact.website">
          <mat-icon class="contact-icon">language</mat-icon>
          <a [href]="contact.website" target="_blank">{{ contact.website }}</a>
        </div>
      </div>

      <div class="contact-tags" *ngIf="contact.tags && contact.tags.length > 0">
        <mat-chip-set>
          <mat-chip *ngFor="let tag of contact.tags">{{ tag }}</mat-chip>
        </mat-chip-set>
      </div>

      <div class="contact-stats" *ngIf="contact.deals && contact.deals.length > 0">
        <div class="stat-item">
          <mat-icon>monetization_on</mat-icon>
          <span>{{ contact.deals.length }} сделок</span>
        </div>
      </div>

      <div class="blacklist-warning" *ngIf="contact.isBlacklisted">
        <mat-icon>block</mat-icon>
        <span>В черном списке</span>
        <small *ngIf="contact.blacklistReason">{{ contact.blacklistReason }}</small>
      </div>
    </mat-card>

    <!-- Меню действий -->
    <mat-menu #contactMenu="matMenu">
      <button mat-menu-item (click)="onEdit()">
        <mat-icon>edit</mat-icon>
        <span>Редактировать</span>
      </button>
      
      <button mat-menu-item (click)="onView()">
        <mat-icon>visibility</mat-icon>
        <span>Просмотр</span>
      </button>
      
      <button mat-menu-item (click)="onTouch()" *ngIf="!contact.isBlacklisted">
        <mat-icon>touch_app</mat-icon>
        <span>Отметить контакт</span>
      </button>
      
      <mat-divider></mat-divider>
      
      <button mat-menu-item (click)="onBlacklist()" *ngIf="!contact.isBlacklisted" class="warn-action">
        <mat-icon>block</mat-icon>
        <span>В черный список</span>
      </button>
      
      <button mat-menu-item (click)="onUnblacklist()" *ngIf="contact.isBlacklisted">
        <mat-icon>check_circle</mat-icon>
        <span>Убрать из черного списка</span>
      </button>
      
      <button mat-menu-item (click)="onDelete()" class="danger-action">
        <mat-icon>delete</mat-icon>
        <span>Удалить</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .contact-card {
      margin-bottom: 16px;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .contact-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .contact-card.blacklisted {
      border-left: 4px solid #f44336;
      opacity: 0.8;
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
      background: var(--primary-color, #667eea);
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

    .contact-tags {
      margin-bottom: 16px;
    }

    .contact-stats {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #6b7280;
    }

    .stat-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
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

    .warn-action {
      color: #f59e0b !important;
    }

    .danger-action {
      color: #ef4444 !important;
    }
  `]
})
export class ContactCardComponent {
  @Input() contact!: Contact;
  @Output() edit = new EventEmitter<Contact>();
  @Output() view = new EventEmitter<Contact>();
  @Output() delete = new EventEmitter<Contact>();
  @Output() blacklist = new EventEmitter<Contact>();
  @Output() unblacklist = new EventEmitter<Contact>();
  @Output() touch = new EventEmitter<Contact>();

  private readonly contactsService = inject(ContactsService);

  getContactName(): string {
    return this.contactsService.formatContactName(this.contact);
  }

  getContactDetails(): string {
    return this.contactsService.getContactDisplayInfo(this.contact);
  }

  getSourceLabel(): string {
    return this.contactsService.getContactSourceLabel(this.contact.source);
  }

  hasContactInfo(): boolean {
    return !!(this.contact.email || this.contact.phone || this.contact.website);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ru-RU');
  }

  onEdit(): void {
    this.edit.emit(this.contact);
  }

  onView(): void {
    this.view.emit(this.contact);
  }

  onDelete(): void {
    this.delete.emit(this.contact);
  }

  onBlacklist(): void {
    this.blacklist.emit(this.contact);
  }

  onUnblacklist(): void {
    this.unblacklist.emit(this.contact);
  }

  onTouch(): void {
    this.touch.emit(this.contact);
  }
}
