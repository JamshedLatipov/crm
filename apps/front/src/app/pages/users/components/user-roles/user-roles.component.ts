import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { ChipAutocompleteComponent } from '../../../../shared/components/chip-autocomplete/chip-autocomplete.component';

@Component({
  selector: 'app-user-roles',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatOptionModule, MatCardModule, ChipAutocompleteComponent],
  templateUrl: './user-roles.component.html',
  styleUrls: ['./user-roles.component.scss']
})
export class UserRolesComponent {
  @Input() roles: string[] = [];
  @Input() options: { id: string; name: string }[] = [];
  

   @Output() add = new EventEmitter<string>();
   @Output() remove = new EventEmitter<string>();
}
