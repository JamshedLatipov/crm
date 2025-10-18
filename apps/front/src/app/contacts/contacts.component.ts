import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatDialogModule,
  ],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss'],
})
export class ContactsComponent implements OnInit {
  contacts: Contact[] = [];
  stats: ContactsStats | null = null;
  loading = true;
  displayedColumns = ['name', 'email', 'phone', 'company', 'actions'];

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
