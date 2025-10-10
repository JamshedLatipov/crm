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
import { ContactsService } from '../contacts.service';
import { Contact, ContactType, ContactSource } from '../contact.interfaces';

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
  template: `
    <h2 mat-dialog-title>
      <mat-icon>edit</mat-icon>
      Редактирование контакта
    </h2>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="contactForm" class="contact-form">
        <!-- Basic Information -->
        <div class="form-section">
          <h3 class="section-title">Основная информация</h3>
          
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Тип контакта</mat-label>
              <mat-select formControlName="type">
                <mat-option value="person">Физическое лицо</mat-option>
                <mat-option value="company">Компания</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Источник</mat-label>
              <mat-select formControlName="source">
                <mat-option *ngFor="let source of contactSources" [value]="source.value">
                  {{ source.label }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-row" *ngIf="contactForm.get('type')?.value === 'person'">
            <mat-form-field appearance="outline">
              <mat-label>Имя</mat-label>
              <input matInput formControlName="firstName">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Отчество</mat-label>
              <input matInput formControlName="middleName">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Фамилия</mat-label>
              <input matInput formControlName="lastName">
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" *ngIf="contactForm.get('type')?.value === 'company'">
            <mat-label>Название компании</mat-label>
            <input matInput formControlName="name" [required]="contactForm.get('type')?.value === 'company'">
          </mat-form-field>
        </div>

        <!-- Contact Information -->
        <div class="form-section">
          <h3 class="section-title">Контактная информация</h3>
          
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email">
              <mat-error *ngIf="contactForm.get('email')?.hasError('email')">
                Введите корректный email
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Телефон</mat-label>
              <input matInput formControlName="phone">
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Мобильный телефон</mat-label>
              <input matInput formControlName="mobilePhone">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Рабочий телефон</mat-label>
              <input matInput formControlName="workPhone">
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Веб-сайт</mat-label>
            <input matInput type="url" formControlName="website">
          </mat-form-field>
        </div>

        <!-- Professional Information -->
        <div class="form-section">
          <h3 class="section-title">Профессиональная информация</h3>
          
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Должность</mat-label>
              <input matInput formControlName="position">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Компания</mat-label>
              <input matInput formControlName="companyName">
            </mat-form-field>
          </div>
        </div>

        <!-- Address Information -->
        <div class="form-section" formGroupName="address">
          <h3 class="section-title">Адрес</h3>
          
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Страна</mat-label>
              <input matInput formControlName="country">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Регион</mat-label>
              <input matInput formControlName="region">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Город</mat-label>
              <input matInput formControlName="city">
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Улица</mat-label>
              <input matInput formControlName="street">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Дом</mat-label>
              <input matInput formControlName="building">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Квартира</mat-label>
              <input matInput formControlName="apartment">
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Почтовый индекс</mat-label>
            <input matInput formControlName="postalCode">
          </mat-form-field>
        </div>

        <!-- Notes -->
        <div class="form-section">
          <h3 class="section-title">Заметки</h3>
          
          <mat-form-field appearance="outline">
            <mat-label>Заметки</mat-label>
            <textarea matInput rows="4" formControlName="notes"></textarea>
          </mat-form-field>
        </div>

        <!-- Status Flags -->
        <div class="form-section">
          <h3 class="section-title">Статус</h3>
          
          <div class="checkbox-group">
            <mat-checkbox formControlName="isActive">Активный контакт</mat-checkbox>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-button type="button" (click)="onCancel()" [disabled]="saving">
        Отмена
      </button>
      <button 
        mat-raised-button 
        color="primary" 
        type="button"
        (click)="onSave()" 
        [disabled]="!contactForm.dirty || contactForm.invalid || saving"
      >
        <mat-spinner diameter="20" *ngIf="saving"></mat-spinner>
        <span *ngIf="!saving">Сохранить</span>
        <span *ngIf="saving">Сохранение...</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      max-width: 600px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .contact-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
      margin: 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .dialog-actions {
      padding: 1rem 1.5rem;
      gap: 0.75rem;
    }

    .dialog-actions button {
      min-width: 100px;
    }

    mat-form-field {
      width: 100%;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      padding: 1.5rem 1.5rem 1rem;
      font-size: 1.25rem;
      font-weight: 600;
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .dialog-content {
        max-width: 90vw;
      }
    }
  `]
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
      const updateData = this.buildUpdatePayload(formValue);

      // If nothing changed, close dialog
      if (!updateData || Object.keys(updateData).length === 0) {
        this.saving = false;
        this.dialogRef.close();
        return;
      }

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

  /** Build a PATCH payload containing only changed (dirty) controls */
  private buildUpdatePayload(formValue: any): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    // Root-level controls
    Object.keys(this.contactForm.controls).forEach((key) => {
      if (key === 'address') return; // handle separately

      const control = this.contactForm.get(key);
      if (!control) return;

      if (control.dirty) {
        const val = formValue[key];
        // Trim strings to avoid accidental whitespace updates
        payload[key] = typeof val === 'string' ? val.trim() : val;
      }
    });

    // Address group: include only changed nested fields
    const addressGroup = this.contactForm.get('address');
    if (addressGroup && addressGroup instanceof FormGroup) {
      const addrValue = formValue.address || {};
      const addrPayload: Record<string, unknown> = {};
      Object.keys((addressGroup as FormGroup).controls).forEach((k) => {
        const c = addressGroup.get(k);
        if (c && c.dirty) {
          const v = addrValue[k];
          addrPayload[k] = typeof v === 'string' ? v.trim() : v;
        }
      });

      if (Object.keys(addrPayload).length > 0) {
        // Remove empty address fields, keep only meaningful values
        const cleaned = this.cleanAddressObject(addrPayload);
        payload['address'] = cleaned;
      }
    }

    return payload;
  }
}