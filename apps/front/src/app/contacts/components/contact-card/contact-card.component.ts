import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Contact } from '../../contact.interfaces';
import { ContactsService } from '../../contacts.service';

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
  templateUrl: './contact-card.component.html',
  styleUrls: ['./contact-card.component.scss']
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
