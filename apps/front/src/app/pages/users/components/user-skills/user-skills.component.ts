import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ChipAutocompleteComponent } from '../../../../shared/components/chip-autocomplete/chip-autocomplete.component';

@Component({
  selector: 'app-user-skills',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, ChipAutocompleteComponent],
  templateUrl: './user-skills.component.html',
  styleUrls: ['./user-skills.component.scss']
})
export class UserSkillsComponent {
  @Input() skills: string[] = [];
  @Input() options: { id: string; name: string }[] = [];

  @Output() add = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
}
