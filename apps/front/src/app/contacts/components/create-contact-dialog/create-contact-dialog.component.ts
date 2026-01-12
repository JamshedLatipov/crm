import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { ContactsService } from '../../contacts.service';
import { CompanySelectorComponent } from '../../../shared/components/company-selector/company-selector.component';
import { CreateContactDto } from '../../contact.interfaces';
import { CompaniesService } from '../../../services/companies.service';
import { Company } from '../../../pipeline/dtos';
import { CustomFieldsService } from '../../../services/custom-fields.service';
import { CustomFieldDefinition } from '../../../models/custom-field.model';
import { DynamicFieldComponent } from '../../../shared/components/dynamic-field/dynamic-field.component';

@Component({
  selector: 'app-create-contact-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatOptionModule, MatAutocompleteModule, CompanySelectorComponent, MatDividerModule, MatTooltipModule, DynamicFieldComponent],
  templateUrl: './create-contact-dialog.component.html',
  styleUrls: ['./create-contact-dialog.component.scss'],
})
export class CreateContactDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contactsService = inject(ContactsService);
  private readonly dialogRef = inject(MatDialogRef<CreateContactDialogComponent>);
  private readonly companiesService = inject(CompaniesService);
  private readonly customFieldsService = inject(CustomFieldsService);

  form: FormGroup;
  saving = false;
  companyOptions: Array<{ id: string; name?: string; legalName?: string }> = [];
  showCreateInline = false;
  inlineCompanyText = '';
  
  customFieldDefinitions = signal<CustomFieldDefinition[]>([]);
  customFieldValues: Record<string, any> = {};

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      type: [null],
      firstName: ['', []],
      lastName: ['', []],
      middleName: ['', []],
      email: ['', []],
      phone: ['', []],
      mobilePhone: ['', []],
      workPhone: ['', []],
      website: ['', []],
      address: this.fb.group({
        country: [''],
        region: [''],
        city: [''],
        street: [''],
        building: [''],
        apartment: [''],
        postalCode: [''],
      }),
      socialMedia: this.fb.group({
        telegram: [''],
        whatsapp: [''],
        linkedin: [''],
        facebook: [''],
        instagram: [''],
        vk: [''],
      }),
      companyName: ['', []],
      companyId: [null],
      position: ['', []],
      notes: [''],
      tagsInput: [''],
      source: [null],
      assignedTo: [null],
    });
    this.companyOptions = [];
    this.showCreateInline = false;
    this.inlineCompanyText = '';

    // Wire autocomplete for companyName
    // autocomplete handled by shared CompanyAutocompleteComponent
  }

  ngOnInit(): void {
    this.loadCustomFields();
    this.setupFullNameAutofill();
  }

  setupFullNameAutofill(): void {
    // Слушаем изменения в полях firstName, lastName, middleName
    const firstNameControl = this.form.get('firstName');
    const lastNameControl = this.form.get('lastName');
    const middleNameControl = this.form.get('middleName');
    const nameControl = this.form.get('name');

    if (firstNameControl && lastNameControl && middleNameControl && nameControl) {
      // Подписываемся на изменения всех трех полей
      firstNameControl.valueChanges.subscribe(() => this.updateFullName());
      lastNameControl.valueChanges.subscribe(() => this.updateFullName());
      middleNameControl.valueChanges.subscribe(() => this.updateFullName());
    }
  }

  updateFullName(): void {
    const firstName = this.form.get('firstName')?.value || '';
    const lastName = this.form.get('lastName')?.value || '';
    const middleName = this.form.get('middleName')?.value || '';

    // Формируем полное имя: Фамилия Имя Отчество (русский формат)
    const parts = [lastName, firstName, middleName].filter(part => part && part.trim() !== '');
    const fullName = parts.join(' ');

    // Обновляем поле name только если есть хотя бы одна часть имени
    if (fullName) {
      this.form.get('name')?.setValue(fullName, { emitEvent: false });
    }
  }

  loadCustomFields(): void {
    this.customFieldsService.findByEntity('contact').subscribe({
      next: (fields) => {
        console.log('Custom fields loaded:', fields);
        this.customFieldDefinitions.set(fields);
      },
      error: (err) => {
        console.error('Error loading custom fields:', err);
      },
    });
  }

  onCustomFieldChange(fieldName: string, value: any): void {
    this.customFieldValues[fieldName] = value;
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
  const payload = { name } as import('../../../pipeline/dtos').CreateCompanyDto;
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
      type: this.form.value.type || undefined,
      name: this.form.value.name,
      firstName: this.form.value.firstName || undefined,
      lastName: this.form.value.lastName || undefined,
      middleName: this.form.value.middleName || undefined,
      position: this.form.value.position || undefined,
      companyName: this.form.value.companyName || undefined,
      companyId: this.form.value.companyId || undefined,
      email: this.form.value.email || undefined,
      phone: this.form.value.phone || undefined,
      mobilePhone: this.form.value.mobilePhone || undefined,
      workPhone: this.form.value.workPhone || undefined,
      website: this.form.value.website || undefined,
      address: this.form.value.address && Object.keys(this.form.value.address).length ? this.form.value.address : undefined,
      socialMedia: this.form.value.socialMedia && Object.keys(this.form.value.socialMedia).length ? this.form.value.socialMedia : undefined,
      source: this.form.value.source || undefined,
      assignedTo: this.form.value.assignedTo || undefined,
      notes: this.form.value.notes || undefined,
      tags: (this.form.value.tagsInput || '')
        .toString()
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => !!t),
      customFields: Object.keys(this.customFieldValues).length > 0 ? this.customFieldValues : undefined,
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
