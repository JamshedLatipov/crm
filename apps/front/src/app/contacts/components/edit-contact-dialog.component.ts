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
import { CompanySelectorComponent } from '../../shared/components/company-selector/company-selector.component';
import { Contact, ContactType, ContactSource } from '../contact.interfaces';
import { CompaniesService } from '../../services/companies.service';

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
    MatProgressSpinnerModule,
    CompanySelectorComponent
    ,
    // shared selectors
    // Company selector provides autocomplete + create dialog
    // (kept local import to avoid changing barrel exports)
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>edit</mat-icon>
        Редактирование контакта
      </h2>
      <button mat-icon-button (click)="onCancel()" class="close-button"><mat-icon>close</mat-icon></button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="contactForm" class="create-lead-form">
        <!-- Basic Information -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">person</mat-icon>
            <h3>Основная информация</h3>
          </div>
          <div class="form-field-container">
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
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Имя</mat-label>
                <input matInput formControlName="firstName">
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Отчество</mat-label>
                <input matInput formControlName="middleName">
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Фамилия</mat-label>
                <input matInput formControlName="lastName">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" *ngIf="contactForm.get('type')?.value === 'company'" class="full-width">
              <mat-label>Название компании</mat-label>
              <input matInput formControlName="name" [required]="contactForm.get('type')?.value === 'company'">
            </mat-form-field>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">contacts</mat-icon>
            <h3>Контактная информация</h3>
          </div>
          <div class="form-field-container">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email">
                <mat-error *ngIf="contactForm.get('email')?.hasError('email')">Введите корректный email</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Телефон</mat-label>
                <input matInput formControlName="phone">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Мобильный телефон</mat-label>
                <input matInput formControlName="mobilePhone">
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Рабочий телефон</mat-label>
                <input matInput formControlName="workPhone">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Веб-сайт</mat-label>
              <input matInput type="url" formControlName="website">
            </mat-form-field>
          </div>
        </div>

        <!-- Professional Information -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">work</mat-icon>
            <h3>Профессиональная информация</h3>
          </div>
          <div class="form-field-container">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Должность</mat-label>
                <input matInput formControlName="position">
              </mat-form-field>

              <app-company-selector formControlName="companyId" placeholder="Компания"></app-company-selector>
            </div>
          </div>
        </div>

        <!-- Address Information -->
        <div class="form-section" formGroupName="address">
          <div class="section-header">
            <mat-icon class="section-icon">location_city</mat-icon>
            <h3>Адрес</h3>
          </div>
          <div class="form-field-container">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Страна</mat-label>
                <input matInput formControlName="country">
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Регион</mat-label>
                <input matInput formControlName="region">
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Город</mat-label>
                <input matInput formControlName="city">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Улица</mat-label>
                <input matInput formControlName="street">
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Дом</mat-label>
                <input matInput formControlName="building">
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Квартира</mat-label>
                <input matInput formControlName="apartment">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Почтовый индекс</mat-label>
              <input matInput formControlName="postalCode">
            </mat-form-field>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">note</mat-icon>
            <h3>Заметки</h3>
          </div>
          <div class="form-field-container">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Заметки</mat-label>
              <textarea matInput rows="4" formControlName="notes"></textarea>
            </mat-form-field>
          </div>
        </div>

        <!-- Status Flags -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">flag</mat-icon>
            <h3>Статус</h3>
          </div>
          <div class="form-field-container">
            <div class="checkbox-group">
              <mat-checkbox formControlName="isActive">Активный контакт</mat-checkbox>
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="onCancel()" class="cancel-button" [disabled]="saving">Отмена</button>
      <button mat-raised-button color="primary" (click)="onSave()" class="save-button" [disabled]="!contactForm.dirty || contactForm.invalid || saving">
        <mat-spinner diameter="20" *ngIf="saving" class="button-spinner"></mat-spinner>
        <mat-icon *ngIf="!saving">save</mat-icon>
        <span>{{ saving ? 'Сохранение...' : 'Сохранить' }}</span>
      </button>
    </mat-dialog-actions>
  `,
    styles: [
      `
      /* Dialog Layout */
      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 24px 0 24px;
        border-bottom: 1px solid #e0e0e0;
        margin-bottom: 0;
      }

      .dialog-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        color: #1a1a1a;
      }

      .close-button { color: #666; }

      .dialog-content {
        padding: 24px !important;
        max-height: 70vh;
        overflow-y: auto;
      }

      .dialog-actions {
        padding: 16px 24px 24px 24px !important;
        border-top: 1px solid #e0e0e0;
        gap: 12px;
        justify-content: flex-end;
      }

      .create-lead-form { width: 100%; max-width: 600px; }

      .form-section { margin-bottom: 32px; }

      .section-header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 8px;
        border-bottom: 2px solid #f0f0f0;
      }

      .section-icon { color: #4285f4; margin-right: 12px; font-size: 20px; }

      .section-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a; }

      .form-field-container { padding-left: 24px; }

      .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; align-items: center; }

      .form-field { width: 100%; }
      .full-width { width: 100%; margin-bottom: 16px; }

      .mat-mdc-form-field { .mat-mdc-text-field-wrapper { background-color: #fafafa; border-radius: 8px; transition: background-color 0.2s ease; } }
      .required-field .mat-mdc-form-field-label::after { content: ' *'; color: #f44336; }

      .cancel-button { border-color: #e0e0e0; color: #666; font-weight: 500; padding: 0 24px; height: 40px; }
      .save-button { background-color: #4285f4; color: white; font-weight: 500; padding: 0 24px; height: 40px; box-shadow: 0 2px 4px rgba(66, 133, 244, 0.2); display: flex; align-items: center; gap: 8px; }

      @media (max-width: 768px) {
        .dialog-header { padding: 16px 16px 0 16px; }
        .dialog-content { padding: 16px !important; }
        .dialog-actions { padding: 12px 16px 16px 16px !important; flex-direction: column-reverse; }
        .form-row { grid-template-columns: 1fr; gap: 12px; }
        .form-field-container { padding-left: 0; }
        .cancel-button, .save-button { width: 100%; height: 44px; }
      }

      @media (max-width: 480px) {
        .dialog-header h2 { font-size: 20px; }
        .section-header { margin-bottom: 16px; }
        .form-section { margin-bottom: 24px; }
      }
      `
    ]
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
  private readonly companiesService = inject(CompaniesService);
  private readonly fb = inject(FormBuilder);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { contact: Contact }) {
    this.contactForm = this.createForm();
    this.populateForm();

    // When companyId changes (selected via CompanySelector), fetch company details
    // and populate companyName and address.country if available.
    const companyIdControl = this.contactForm.get('companyId');
    if (companyIdControl) {
      let lastCompanyId: string | null = null;
      companyIdControl.valueChanges.subscribe((id) => {
        if (!id || id === lastCompanyId) return;
        lastCompanyId = id as string;
        this.companiesService.getCompany(id).subscribe({
          next: (company) => {
            if (!company) return;
            // set companyName for display/backward compatibility
            this.contactForm.patchValue({ companyName: company.name || company.legalName || '' });

            // if address.country is empty, set it from company.country
            const addrGroup = this.contactForm.get('address');
            if (company.country && addrGroup && addrGroup.get('country') && !addrGroup.get('country')?.value) {
              addrGroup.patchValue({ country: company.country });
            }
          },
          error: () => {
            // ignore failures silently
          }
        });
      });
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      type: [ContactType.PERSON, Validators.required],
      companyId: [null],
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
        companyId: contact.companyId || contact.company?.id || null,
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

      // If contact has companyId, fetch company to prefill additional details like country
      const cid = contact.companyId || contact.company?.id;
      if (cid) {
        this.companiesService.getCompany(cid).subscribe({
          next: (company) => {
            if (!company) return;
            // patch companyName if missing
            if (!this.contactForm.get('companyName')?.value) {
              this.contactForm.patchValue({ companyName: company.name || company.legalName || '' });
            }

            // patch address country if empty
            const addr = this.contactForm.get('address');
            if (company.country && addr && !addr.get('country')?.value) {
              addr.patchValue({ country: company.country });
            }
          },
          error: () => {}
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