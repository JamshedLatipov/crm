import { Component, forwardRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs';

import { Contact } from '../contact.interfaces';
import { ContactsService } from '../contacts.service';
import { CreateContactDialogComponent } from './create-contact-dialog.component';

@Component({
  selector: 'app-contact-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContactSelectorComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ placeholder }}</mat-label>
      <input
        matInput
        [formControl]="searchControl"
        [matAutocomplete]="auto"
        [placeholder]="placeholder"
      />
      <mat-icon matSuffix>person_search</mat-icon>
      
      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="displayContact"
        (optionSelected)="onContactSelected($event.option.value)"
      >
        <mat-option 
          *ngFor="let contact of filteredContacts | async" 
          [value]="contact"
        >
          <div class="contact-option">
            <div class="contact-info">
              <span class="contact-name">{{ contact.name }}</span>
              <span class="contact-details" *ngIf="contact.email || contact.phone">
                {{ contact.email }}{{ contact.email && contact.phone ? ' • ' : '' }}{{ contact.phone }}
              </span>
              <span class="contact-company" *ngIf="contact.companyName">
                {{ contact.companyName }}
              </span>
            </div>
          </div>
        </mat-option>
        
        <!-- Опция создания нового контакта -->
        <mat-option 
          *ngIf="searchControl.value && (filteredContacts | async)?.length === 0"
          (click)="createNewContact()"
        >
          <div class="create-contact-option">
            <mat-icon>add_circle</mat-icon>
            <span>Создать контакт "{{ searchControl.value }}"</span>
          </div>
        </mat-option>
      </mat-autocomplete>
    </mat-form-field>
  `,
  styleUrls: ['./contact-selector.component.scss']
})
export class ContactSelectorComponent implements ControlValueAccessor, OnInit {
  private readonly contactsService = inject(ContactsService);
  private readonly dialog = inject(MatDialog);

  searchControl = new FormControl('');
  filteredContacts: Observable<Contact[]> = of([]);
  placeholder = 'Выберите контакт';
  
  selectedContact: Contact | null = null;
  
  // ControlValueAccessor implementation
  private onChange = (value: Contact | null) => {
    // This will be overridden by registerOnChange
    void value;
  };
  private onTouched = () => {
    // This will be overridden by registerOnTouched
  };

  ngOnInit(): void {
    this.filteredContacts = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.trim()) {
          return this.contactsService.searchContacts(value);
        }
        return of([]);
      })
    );
  }

  displayContact(contact: Contact | null): string {
    return contact ? contact.name : '';
  }

  onContactSelected(contact: Contact): void {
    this.selectedContact = contact;
    this.onChange(contact);
    this.onTouched();
  }

  createNewContact(): void {
    const name = this.searchControl.value || '';
    
    const dialogRef = this.dialog.open(CreateContactDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { 
        initialData: { name } 
      }
    });

    dialogRef.afterClosed().subscribe((newContact: Contact | undefined) => {
      if (newContact) {
        this.selectedContact = newContact;
        this.searchControl.setValue(newContact.name);
        this.onChange(newContact);
        this.onTouched();
      }
    });
  }

  // ControlValueAccessor methods
  writeValue(value: Contact | null): void {
    this.selectedContact = value;
    if (value) {
      this.searchControl.setValue(value.name, { emitEvent: false });
    } else {
      this.searchControl.setValue('', { emitEvent: false });
    }
  }

  registerOnChange(fn: (value: Contact | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.searchControl.disable();
    } else {
      this.searchControl.enable();
    }
  }
}