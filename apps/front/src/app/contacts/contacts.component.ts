import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ContactsService } from './contacts.service';
import { StatusTabsComponent } from '../shared/components/status-tabs/status-tabs.component';
import { Router } from '@angular/router';
import { Contact, ContactsStats } from './contact.interfaces';
import { PageLayoutComponent } from '../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
  MatMenuModule,
  MatDividerModule,
    FormsModule,
    MatDialogModule,
    StatusTabsComponent,
    PageLayoutComponent,
  ],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss'],
})
export class ContactsComponent implements OnInit {
  contacts: Contact[] = [];
  stats: ContactsStats | null = null;
  loading = true;
  // Compact columns: email and phone merged into name cell to save width
  displayedColumns = ['select', 'name', 'company', 'assignedTo', 'status', 'createdAt', 'tags', 'actions'];

  // Filters
  searchQuery = '';
  // selected value for status tabs: null means all, otherwise a string key
  activeFilter: string | null = 'active';

  // Tabs config for StatusTabsComponent
  contactTabs = [
    { label: 'Все контакты', value: null },
    { label: 'Активные', value: 'active' },
    { label: 'Деактивированные', value: 'inactive' },
  ];

  // selection set of contact ids for bulk actions
  selected: Set<string> = new Set();

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalResults = 0;

  private readonly contactsService = inject(ContactsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    // Загружаем контакты и статистику параллельно
    const listPromise = this.contactsService.listContacts({
      search: this.searchQuery || undefined,
      isActive: this.activeFilter === 'all' ? undefined : (this.activeFilter === 'active'),
      page: this.currentPage,
      pageSize: this.pageSize,
    }).toPromise();

    Promise.all([
      listPromise,
      this.contactsService.getContactsStats().toPromise(),
    ])
      .then(([contacts, stats]) => {
        this.contacts = contacts || [];
        this.stats = stats || null;
        // If server supports total count, it should provide it; otherwise fall back to array length
        // Assume service returns contacts array; if it returns an object later, adjust accordingly
        this.totalResults = (contacts && (contacts as any).total) ? (contacts as any).total : (contacts || []).length;
        this.loading = false;
      })
      .catch((error) => {
        console.error('Error loading contacts:', error);
        this.snackBar.open('Ошибка загрузки контактов', 'Закрыть', {
          duration: 3000,
        });
        this.loading = false;
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
    this.loadData();
  }

  isAllSelected(): boolean {
    return this.contacts.length > 0 && this.selected.size === this.contacts.length;
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.contacts.forEach((c) => this.selected.add(c.id));
    } else {
      this.selected.clear();
    }
  }

  toggleSelect(id: string, checked: boolean): void {
    if (checked) this.selected.add(id);
    else this.selected.delete(id);
  }

  selectedCount(): number {
    return this.selected.size;
  }

  clearSelection(): void {
    this.selected.clear();
  }

  onSearchChange(value: string): void {
    this.searchQuery = value || '';
    this.loadData();
  }

  onActiveFilterChange(value: string | null): void {
    this.activeFilter = value;
    this.loadData();
  }

  deleteSelected(): void {
    const count = this.selected.size;
    if (count === 0) return;
    if (!confirm(`Вы уверены, что хотите удалить ${count} выбранных контактов?`)) return;

    const ids = Array.from(this.selected);
    // delete in parallel and reload when done
    Promise.all(ids.map((id) => this.contactsService.deleteContact(id).toPromise()))
      .then(() => {
        this.snackBar.open('Выбранные контакты удалены', 'Закрыть', { duration: 3000 });
        this.selected.clear();
        this.loadData();
      })
      .catch((error) => {
        console.error('Error deleting selected contacts:', error);
        this.snackBar.open('Ошибка при удалении выбранных контактов', 'Закрыть', { duration: 3000 });
        this.loadData();
      });
  }

  bulkActivateSelected(): void {
    const ids = Array.from(this.selected);
    if (ids.length === 0) return;

  Promise.all(ids.map((id) => this.contactsService.updateContact(id, { isActive: true } as any).toPromise()))
      .then(() => {
        this.snackBar.open(`Активированы ${ids.length} контактов`, 'Закрыть', { duration: 3000 });
        this.clearSelection();
        this.loadData();
      })
      .catch((error) => {
        console.error('Error activating selected contacts:', error);
        this.snackBar.open('Ошибка при активации выбранных контактов', 'Закрыть', { duration: 3000 });
        this.loadData();
      });
  }

  bulkDeactivateSelected(): void {
    const ids = Array.from(this.selected);
    if (ids.length === 0) return;

    if (!confirm(`Вы уверены, что хотите деактивировать ${ids.length} выбранных контактов?`)) return;

  Promise.all(ids.map((id) => this.contactsService.updateContact(id, { isActive: false } as any).toPromise()))
      .then(() => {
        this.snackBar.open(`Деактивированы ${ids.length} контактов`, 'Закрыть', { duration: 3000 });
        this.clearSelection();
        this.loadData();
      })
      .catch((error) => {
        console.error('Error deactivating selected contacts:', error);
        this.snackBar.open('Ошибка при деактивации выбранных контактов', 'Закрыть', { duration: 3000 });
        this.loadData();
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
    import('./components/create-contact-dialog/create-contact-dialog.component').then((m) => {
      const dialogRef = this.dialog.open(m.CreateContactDialogComponent, { width: '520px' });
      interface CreatedContact { id: string }
      dialogRef.afterClosed().subscribe((created: CreatedContact | null) => {
        if (created) {
          this.snackBar.open('Контакт создан', 'Закрыть', { duration: 2000 });
          this.loadData();
          this.router.navigate(['/contacts/view', created.id]);
        }
      });
    });
  }

  viewContact(contact: Contact): void {
    this.snackBar.open(
      `Просмотр контакта "${contact.name}" - в разработке`,
      'Закрыть',
      { duration: 3000 }
    );
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
          this.snackBar.open('Ошибка удаления контакта', 'Закрыть', {
            duration: 3000,
          });
        },
      });
    }
  }

  goToDetail(contact: Contact): void {
    // navigate to contact detail page
    this.router.navigate(['/contacts/view', contact.id]);
  }
}
