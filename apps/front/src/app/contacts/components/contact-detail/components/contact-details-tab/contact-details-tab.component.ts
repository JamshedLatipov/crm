import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Contact } from '../../../../contact.interfaces';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-contact-details-tab',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './contact-details-tab.component.html',
  styleUrls: ['./contact-details-tab.component.scss']
})
export class ContactDetailsTabComponent {
  @Input() contact!: Contact;
  @Input() hasAddressInfo!: () => boolean;
  @Input() getFullAddress!: () => string;
  @Input() formatDate!: (date: string) => string;
  @Input() contactsService: any;
}
