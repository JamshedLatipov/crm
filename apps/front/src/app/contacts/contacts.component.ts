import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ContactsService } from './contacts.service';
import { Router } from '@angular/router';
import { Contact, ContactsStats } from './contact.interfaces';

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
    MatDialogModule,
  ],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss'],
})
export class ContactsComponent implements OnInit {
  contacts: Contact[] = [];
  stats: ContactsStats | null = null;
  loading = true;
  displayedColumns = ['select', 'name', 'email', 'phone', 'company', 'actions'];

  // selection set of contact ids for bulk actions
  selected: Set<string> = new Set();

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
    Promise.all([
      this.contactsService.listContacts().toPromise(),
      this.contactsService.getContactsStats().toPromise(),
    ])
      .then(([contacts, stats]) => {
        this.contacts = contacts || [];
        this.stats = stats || null;
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
