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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { ContactsService } from '../../contacts.service';
import { CompanySelectorComponent } from '../../../shared/components/company-selector/company-selector.component';
import { CreateContactDto } from '../../contact.interfaces';
import { CompaniesService } from '../../../services/companies.service';
import { Company } from '../../../pipeline/dtos';

@Component({
  selector: 'app-create-contact-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatOptionModule, MatAutocompleteModule, CompanySelectorComponent, MatExpansionModule, MatDividerModule, MatTooltipModule],
  templateUrl: './create-contact-dialog.component.html',
  styleUrls: ['./create-contact-dialog.component.scss'],
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
      customFieldsInput: [''],
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
      customFields: (() => {
        const raw = this.form.value.customFieldsInput || '';
        if (!raw) return undefined;
        try {
          // allow either JSON object or key=val pairs separated by commas
          const parsed = JSON.parse(raw);
          if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>;
        } catch (e) {
          // fallback to parse key=val pairs
          const out: Record<string, unknown> = {};
          raw.toString()
            .split(',')
            .map((p: string) => p.trim())
            .filter((p: string) => !!p)
            .forEach((pair: string) => {
              const [k, ...rest] = pair.split('=');
              if (!k) return;
              out[k.trim()] = rest.join('=').trim();
            });
          return Object.keys(out).length ? out : undefined;
        }
        return undefined;
      })(),
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

  // utility used by template to show if a group has any filled value
  hasValues(...controlNames: string[]): boolean {
    try {
      return controlNames.some((name) => {
        const control = this.form.get(name);
        if (!control) return false;
        const val = control.value;
        if (val == null) return false;
        if (typeof val === 'string') return val.trim() !== '';
        if (typeof val === 'object') {
          return Object.values(val).some((v) => v != null && v.toString().trim() !== '');
        }
        return true;
      });
    } catch (e) {
      return false;
    }
  }
}
