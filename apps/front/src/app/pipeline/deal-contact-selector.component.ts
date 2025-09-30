import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { ContactsService } from '../contacts/contacts.service';
import { DealsService } from './deals.service';
import { Contact } from '../contacts/contact.interfaces';
import { Deal, Contact as DealContact } from './dtos';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';

export interface DealContactSelectorData {
  deal: Deal;
}

@Component({
  selector: 'app-deal-contact-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatChipsModule
  ],
  template: `
    <div class="deal-contact-selector">
      <div mat-dialog-title class="dialog-header">
        <h2>Привязать контакт к сделке</h2>
        <p class="deal-info">Сделка: <strong>{{ data.deal.title }}</strong></p>
      </div>

      <div mat-dialog-content class="dialog-content">
          <!-- Текущий контакт (если есть) -->
        <div *ngIf="data.deal.contact" class="current-contact">
          <h3>Текущий контакт:</h3>
          <div class="contact-card current">
            <div class="contact-info">
              <div class="contact-name">{{ data.deal.contact.name }}</div>
              <div class="contact-details" *ngIf="getDealContactDisplayInfo(data.deal.contact)">
                {{ getDealContactDisplayInfo(data.deal.contact) }}
              </div>
              <div class="contact-details" *ngIf="data.deal.contact.email">
                <mat-icon>email</mat-icon>
                {{ data.deal.contact.email }}
              </div>
              <div class="contact-details" *ngIf="data.deal.contact.phone">
                <mat-icon>phone</mat-icon>
                {{ data.deal.contact.phone }}
              </div>
            </div>
            <button mat-stroked-button color="warn" (click)="unlinkContact()" [disabled]="isLoading">
              <mat-icon>link_off</mat-icon>
              Отвязать
            </button>
          </div>
        </div>        <!-- Поиск контактов -->
        <div class="search-section">
          <h3>{{ data.deal.contact ? 'Заменить контакт:' : 'Выберите контакт:' }}</h3>
          
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Поиск контактов</mat-label>
            <input matInput 
                   [(ngModel)]="searchQuery" 
                   (input)="onSearchInput()"
                   placeholder="Введите имя, email или телефон">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>

        <!-- Результаты поиска -->
        <div class="search-results">
          <div *ngIf="isSearching" class="loading-indicator">
            <mat-spinner diameter="30"></mat-spinner>
            <span>Поиск контактов...</span>
          </div>

          <div *ngIf="!isSearching && searchResults.length === 0 && searchQuery.trim()" class="no-results">
            <mat-icon>search_off</mat-icon>
            <p>Контакты не найдены</p>
            <p class="hint">Попробуйте изменить запрос или создать новый контакт</p>
          </div>

          <div *ngIf="!isSearching && searchResults.length > 0" class="results-list">
            <h4>Найденные контакты ({{ searchResults.length }}):</h4>
            <div class="contact-list">
              <div *ngFor="let contact of searchResults" 
                   class="contact-card selectable"
                   [class.selected]="selectedContact?.id === contact.id"
                   (click)="selectContact(contact)"
                   (keyup.enter)="selectContact(contact)"
                   (keyup.space)="selectContact(contact)"
                   tabindex="0"
                   role="button"
                   [attr.aria-label]="'Выбрать контакт ' + contact.name">
                <div class="contact-info">
                  <div class="contact-name">{{ contact.name }}</div>
                  <div class="contact-details" *ngIf="getContactDisplayInfo(contact)">
                    {{ getContactDisplayInfo(contact) }}
                  </div>
                  <div class="contact-details" *ngIf="contact.email">
                    <mat-icon>email</mat-icon>
                    {{ contact.email }}
                  </div>
                  <div class="contact-details" *ngIf="contact.phone">
                    <mat-icon>phone</mat-icon>
                    {{ contact.phone }}
                  </div>
                  <div class="contact-tags" *ngIf="contact.tags && contact.tags.length > 0">
                    <mat-chip-set>
                      <mat-chip *ngFor="let tag of contact.tags">{{ tag }}</mat-chip>
                    </mat-chip-set>
                  </div>
                </div>
                <div class="selection-indicator" *ngIf="selectedContact?.id === contact.id">
                  <mat-icon>check_circle</mat-icon>
                </div>
              </div>
            </div>
          </div>

          <!-- Подсказка для пустого поиска -->
          <div *ngIf="!searchQuery.trim() && !isSearching" class="search-hint">
            <mat-icon>info</mat-icon>
            <p>Начните вводить для поиска контактов</p>
          </div>
        </div>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button mat-dialog-close>Отмена</button>
        <button mat-raised-button 
                color="primary" 
                [disabled]="!selectedContact || isLoading"
                (click)="linkContact()">
          <mat-icon *ngIf="!isLoading">link</mat-icon>
          <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
          {{ isLoading ? 'Привязка...' : 'Привязать контакт' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .deal-contact-selector {
      max-width: 600px;
      min-height: 400px;
    }

    .dialog-header {
      h2 {
        margin: 0 0 8px 0;
        color: var(--primary-color);
      }
      
      .deal-info {
        margin: 0;
        color: var(--text-secondary);
        font-size: 14px;
      }
    }

    .dialog-content {
      padding: 20px 0;
      max-height: 60vh;
      overflow-y: auto;
    }

    .current-contact {
      margin-bottom: 24px;
      
      h3 {
        margin: 0 0 12px 0;
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 600;
      }
    }

    .search-section {
      margin-bottom: 20px;
      
      h3 {
        margin: 0 0 16px 0;
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 600;
      }
      
      .search-field {
        width: 100%;
      }
    }

    .contact-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 8px;
      transition: all 0.2s ease;
      
      &.current {
        background-color: var(--primary-color-light);
        border-color: var(--primary-color);
      }
      
      &.selectable {
        cursor: pointer;
        
        &:hover {
          background-color: var(--hover-bg);
          border-color: var(--primary-color);
        }
        
        &:focus {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }
        
        &.selected {
          background-color: var(--primary-color-light);
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px var(--primary-color-light);
        }
      }
    }

    .contact-info {
      flex: 1;
      
      .contact-name {
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary);
      }
      
      .contact-details {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 2px;
        color: var(--text-secondary);
        font-size: 14px;
        
        mat-icon {
          width: 16px;
          height: 16px;
          font-size: 16px;
        }
      }
      
      .contact-tags {
        margin-top: 8px;
        
        mat-chip-set {
          gap: 4px;
        }
        
        mat-chip {
          font-size: 12px;
          height: 24px;
        }
      }
    }

    .selection-indicator {
      color: var(--primary-color);
      
      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px;
      color: var(--text-secondary);
    }

    .no-results {
      text-align: center;
      padding: 32px;
      color: var(--text-secondary);
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      p {
        margin: 8px 0;
      }
      
      .hint {
        font-size: 14px;
        opacity: 0.7;
      }
    }

    .search-hint {
      text-align: center;
      padding: 32px;
      color: var(--text-secondary);
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.3;
      }
      
      p {
        margin: 0;
        opacity: 0.7;
      }
    }

    .results-list {
      h4 {
        margin: 0 0 16px 0;
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }
    }

    .contact-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .dialog-actions {
      padding: 16px 0 0 0;
      gap: 12px;
      
      button {
        min-width: 120px;
        
        mat-spinner {
          margin-right: 8px;
        }
      }
    }

    /* Переменные для темной темы */
    :host-context(.dark) {
      --primary-color: #3b82f6;
      --primary-color-light: rgba(59, 130, 246, 0.1);
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --border-color: #374151;
      --hover-bg: rgba(59, 130, 246, 0.05);
    }

    /* Переменные для светлой темы */
    :host-context(.light), :host {
      --primary-color: #2563eb;
      --primary-color-light: rgba(37, 99, 235, 0.1);
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --border-color: #d1d5db;
      --hover-bg: rgba(37, 99, 235, 0.05);
    }
  `]
})
export class DealContactSelectorComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<DealContactSelectorComponent>);
  private readonly contactsService = inject(ContactsService);
  private readonly dealsService = inject(DealsService);
  private readonly searchSubject = new Subject<string>();
  public readonly data = inject<DealContactSelectorData>(MAT_DIALOG_DATA);

  searchQuery = '';
  searchResults: Contact[] = [];
  selectedContact: Contact | null = null;
  isSearching = false;
  isLoading = false;

  ngOnInit() {
    // Настройка поиска с debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          return of([]);
        }
        this.isSearching = true;
        return this.contactsService.searchContacts(query.trim());
      })
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
      },
      error: () => {
        this.searchResults = [];
        this.isSearching = false;
      }
    });
  }

  onSearchInput() {
    this.selectedContact = null;
    this.searchSubject.next(this.searchQuery);
  }

  selectContact(contact: Contact) {
    this.selectedContact = contact;
  }

  linkContact() {
    if (!this.selectedContact) return;

    this.isLoading = true;
    this.dealsService.linkToContact(this.data.deal.id, this.selectedContact.id).subscribe({
      next: (updatedDeal) => {
        this.isLoading = false;
        this.dialogRef.close(updatedDeal);
      },
      error: () => {
        this.isLoading = false;
        // TODO: Добавить обработку ошибок (snackbar или toast)
      }
    });
  }

  unlinkContact() {
    if (!this.data.deal.contact) return;

    this.isLoading = true;
    this.dealsService.linkToContact(this.data.deal.id, '').subscribe({
      next: (updatedDeal) => {
        this.isLoading = false;
        this.dialogRef.close(updatedDeal);
      },
      error: () => {
        this.isLoading = false;
        // TODO: Добавить обработку ошибок
      }
    });
  }

  getContactDisplayInfo(contact: Contact): string {
    return this.contactsService.getContactDisplayInfo(contact);
  }

  getDealContactDisplayInfo(contact: DealContact): string {
    const parts = [];
    
    if (contact.position) {
      parts.push(contact.position);
    }
    
    if (contact.companyName) {
      parts.push(contact.companyName);
    }
    
    return parts.join(' в ');
  }
}