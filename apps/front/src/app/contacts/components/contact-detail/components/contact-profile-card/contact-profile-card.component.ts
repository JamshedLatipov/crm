import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Contact } from '../../../../contact.interfaces';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-contact-profile-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './contact-profile-card.component.html',
  styleUrls: ['./contact-profile-card.component.scss']
})
export class ContactProfileCardComponent {
  @Input() contact!: Contact;
  @Input() placeholderAvatar!: string;
}
