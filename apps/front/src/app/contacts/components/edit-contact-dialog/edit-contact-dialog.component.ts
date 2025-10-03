import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContactsService } from '../../contacts.service';
import { Contact, ContactType, ContactSource } from '../../contact.interfaces';

@Component({
  selector: 'app-edit-contact-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './edit-contact-dialog.component.html',
  styleUrls: ['./edit-contact-dialog.component.scss'],
})
export class EditContactDialogComponent {
  contactForm: FormGroup;
  saving = false;
  
  contactSources = [
    { value: ContactSource.WEBSITE, label: 'Сайт' },
    { value: ContactSource.PHONE, label: 'Телефон' },
    { value: ContactSource.EMAIL, label: 'Email' },
    { value: ContactSource.REFERRAL, label: 'Рекомендация' },
    { value: ContactSource.SOCIAL_MEDIA, label: 'Соцсети' },
    { value: ContactSource.ADVERTISING, label: 'Реклама' },
    { value: ContactSource.IMPORT, label: 'Импорт' },
    { value: ContactSource.OTHER, label: 'Другое' }
  ];

  private readonly dialogRef = inject(MatDialogRef<EditContactDialogComponent>);
  private readonly contactsService = inject(ContactsService);
  private readonly fb = inject(FormBuilder);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { contact: Contact }) {
    this.contactForm = this.createForm();
    this.populateForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      type: [ContactType.PERSON, Validators.required],
      name: [''],
      firstName: [''],
      lastName: [''],
      middleName: [''],
      position: [''],
      companyName: [''],
      email: ['', [Validators.email]],
      phone: [''],
      mobilePhone: [''],
      workPhone: [''],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      source: [ContactSource.OTHER],
      address: this.fb.group({
        country: [''],
        region: [''],
        city: [''],
        street: [''],
        building: [''],
        apartment: [''],
        postalCode: ['']
      }),
      notes: [''],
      isActive: [true]
    });
  }

  private populateForm(): void {
    if (this.data.contact) {
      const contact = this.data.contact;
      
      // Обновляем основную форму
      this.contactForm.patchValue({
        type: contact.type || ContactType.PERSON,
        name: contact.name || '',
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        middleName: contact.middleName || '',
        position: contact.position || '',
        companyName: contact.companyName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobilePhone: contact.mobilePhone || '',
        workPhone: contact.workPhone || '',
        website: contact.website || '',
        source: contact.source || ContactSource.OTHER,
        notes: contact.notes || '',
        isActive: contact.isActive
      });

      // Обновляем адрес
      if (contact.address) {
        this.contactForm.get('address')?.patchValue({
          country: contact.address.country || '',
          region: contact.address.region || '',
          city: contact.address.city || '',
          street: contact.address.street || '',
          building: contact.address.building || '',
          apartment: contact.address.apartment || '',
          postalCode: contact.address.postalCode || ''
        });
      }
    }
  }

  onSave(): void {
    if (this.contactForm.valid && !this.saving) {
      this.saving = true;
      
      const formValue = this.contactForm.value;
      const updateData = {
        ...formValue,
        // Очищаем пустые поля адреса
        address: this.cleanAddressObject(formValue.address)
      };

      this.contactsService.updateContact(this.data.contact.id, updateData).subscribe({
        next: (updatedContact) => {
          this.saving = false;
          this.dialogRef.close(updatedContact);
        },
        error: (error) => {
          console.error('Error updating contact:', error);
          this.saving = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private cleanAddressObject(address: any): any {
    if (!address) return null;
    
    const cleanedAddress = Object.keys(address).reduce((acc, key) => {
      if (address[key] && address[key].trim()) {
        acc[key] = address[key].trim();
      }
      return acc;
    }, {} as any);

    return Object.keys(cleanedAddress).length > 0 ? cleanedAddress : null;
  }
}