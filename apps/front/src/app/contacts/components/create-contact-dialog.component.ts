import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { ContactsService } from '../contacts.service';
import { CompanyAutocompleteComponent } from '../../shared/components/company-autocomplete/company-autocomplete.component';
import { CreateContactDto } from '../contact.interfaces';
import { CompaniesService } from '../../services/companies.service';
import { Company } from '../../pipeline/dtos';

@Component({
  selector: 'app-create-contact-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatOptionModule, MatAutocompleteModule, CompanyAutocompleteComponent],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>Создать контакт</h2>
      <button mat-icon-button (click)="cancel()" class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form" class="create-lead-form">
        <!-- Basic Information -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">person</mat-icon>
            <h3>Основная информация</h3>
          </div>
          <div class="form-field-container">
            <mat-form-field appearance="outline" class="full-width required-field">
              <mat-label>Имя</mat-label>
              <input matInput formControlName="name" />
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="form.get('name')?.hasError('required')">Имя обязательно</mat-error>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" />
                <mat-icon matSuffix>email</mat-icon>
                <mat-error *ngIf="form.get('email')?.hasError('email')">Некорректный email</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Телефон</mat-label>
                <input matInput formControlName="phone" />
                <mat-icon matSuffix>phone</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-row">
              <app-company-autocomplete [control]="companyNameControl" [idControl]="companyIdControl"></app-company-autocomplete>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Должность</mat-label>
                <input matInput formControlName="position" />
                <mat-icon matSuffix>work</mat-icon>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Заметки</mat-label>
              <textarea matInput formControlName="notes" rows="3" placeholder="Дополнительная информация о контакте..."></textarea>
              <mat-icon matSuffix>note</mat-icon>
            </mat-form-field>
          </div>
        </div>

        <!-- Additional Info (optional) -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">badge</mat-icon>
            <h3>Дополнительно</h3>
          </div>
          <div class="form-field-container">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Теги</mat-label>
              <input matInput formControlName="tagsInput" placeholder="Введите теги через запятую">
              <mat-icon matSuffix>label</mat-icon>
              <mat-hint>Разделяйте теги запятыми</mat-hint>
            </mat-form-field>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="cancel()" class="cancel-button">Отмена</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        <mat-spinner diameter="20" *ngIf="saving" class="button-spinner"></mat-spinner>
        <mat-icon *ngIf="!saving">add</mat-icon>
        <span>{{ saving ? 'Создание...' : 'Создать контакт' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-header { display:flex; align-items:center; justify-content:space-between; }
      .close-button { margin-left: 8px; }
      .dialog-content { padding-top: 8px; }

      .form-section { background: transparent; padding: 12px 0; }
      .section-header { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
      .section-icon { color: rgba(0,0,0,0.54); }
      .form-field-container { display:block; }
      .full-width { width:100%; }
      .form-row { display:flex; gap:12px; }
      .form-field { flex:1; }
      .dialog-actions { display:flex; justify-content:flex-end; gap:12px; padding-top:8px; }
      .button-spinner { margin-right:8px; }
    `
  ],
})
export class CreateContactDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contactsService = inject(ContactsService);
  private readonly dialogRef = inject(MatDialogRef<CreateContactDialogComponent>);
  private readonly companiesService = inject(CompaniesService);

  form: FormGroup;
  saving = false;
  companyOptions: Array<{ id: string; name?: string; legalName?: string }> = [];
  showCreateInline = false;
  inlineCompanyText = '';

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', []],
      phone: ['', []],
      companyName: ['', []],
      companyId: [null],
      position: ['', []],
      notes: [''],
      tagsInput: [''],
    });
    this.companyOptions = [];
    this.showCreateInline = false;
    this.inlineCompanyText = '';

    // Wire autocomplete for companyName
    // autocomplete handled by shared CompanyAutocompleteComponent
  }

  // expose typed form controls for child components
  get companyNameControl() {
    return this.form.get('companyName') as import('@angular/forms').FormControl<string | null>;
  }

  get companyIdControl() {
    return this.form.get('companyId') as import('@angular/forms').FormControl<string | null>;
  }

  onCompanySelected(company: Company | null) {
    if (!company) return;
    this.form.patchValue({ companyName: company.name || company.legalName });
    this.companyIdControl.setValue(company.id ?? null);
    this.showCreateInline = false;
  }

  createCompanyFromInput() {
    const name = this.inlineCompanyText;
    if (!name || !name.trim()) return;
  const payload = { name } as import('../../pipeline/dtos').CreateCompanyDto;
    this.companiesService.createCompany(payload).subscribe({
      next: (created: Company) => {
        this.form.patchValue({ companyName: created.name || created.legalName });
        this.companyIdControl.setValue(created.id ?? null);
        this.companyOptions = [created];
        this.showCreateInline = false;
      },
      error: (err) => console.error('Failed to create company inline', err)
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const dto: CreateContactDto = {
      name: this.form.value.name,
      email: this.form.value.email || undefined,
      phone: this.form.value.phone || undefined,
      companyName: this.form.value.companyName || undefined,
      companyId: this.form.value.companyId || undefined,
      position: this.form.value.position || undefined,
      notes: this.form.value.notes || undefined,
      tags: (this.form.value.tagsInput || '')
        .toString()
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => !!t),
    };

    this.contactsService.createContact(dto).subscribe({
      next: (created) => {
        this.saving = false;
        this.dialogRef.close(created);
      },
      error: (err) => {
        console.error('Error creating contact', err);
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
