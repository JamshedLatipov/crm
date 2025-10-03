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

import { ContactsService } from '../../contacts.service';
import { CompanyAutocompleteComponent } from '../../../shared/components/company-autocomplete/company-autocomplete.component';
import { CreateContactDto } from '../../contact.interfaces';
import { CompaniesService } from '../../../services/companies.service';
import { Company } from '../../../pipeline/dtos';

@Component({
  selector: 'app-create-contact-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatOptionModule, MatAutocompleteModule, CompanyAutocompleteComponent],
   templateUrl: './create-contact-dialog.component.html',
   styleUrls: ['./create-contact-dialog.component.scss']
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
