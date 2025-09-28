import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { LeadService } from '../../services/lead.service';
import { LeadPriority, CreateLeadRequest } from '../../models/lead.model';
import { CompaniesService } from '../../../services/companies.service';
import { CompanyAutocompleteComponent } from '../../../shared/components/company-autocomplete/company-autocomplete.component';
import { Company } from '../../../pipeline/dtos';
// Company type is available via pipeline dtos when needed

@Component({
  selector: 'app-create-lead-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule, MatOptionModule, MatAutocompleteModule, CompanyAutocompleteComponent],
  templateUrl: './create-lead-dialog.component.html',
  styleUrls: ['./create-lead-dialog.component.scss']
})
export class CreateLeadDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly dialogRef = inject(MatDialogRef<CreateLeadDialogComponent>);
  private readonly companiesService = inject(CompaniesService);

  leadForm: FormGroup;
  saving = false;
  // company autocomplete handled by shared component

  constructor() {
    this.leadForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: [''],
      company: [''],
      companyId: [''],
      position: [''],
      website: [''],
      industry: [''],
      country: [''],
      city: [''],
      source: ['', [Validators.required]],
      priority: [LeadPriority.MEDIUM],
      estimatedValue: [''],
      budget: [''],
      decisionTimeframe: [''],
      notes: [''],
      tagsInput: [''],
    });

    // company autocomplete is provided by CompanyAutocompleteComponent
  }

  get companyControl() {
    return this.leadForm.get('company') as import('@angular/forms').FormControl<string | null>;
  }

  get companyIdControl() {
    return this.leadForm.get('companyId') as import('@angular/forms').FormControl<string | null>;
  }

  onCompanySelected(company: Company | null) {
    if (!company) return;
    this.leadForm.patchValue({ company: company.name || company.legalName });
    this.companyControl.setValue(company.id ?? null);
  }

  // inline company creation handled by shared component

  save(): void {
    if (this.leadForm.invalid) return;
    this.saving = true;
    const formValue = this.leadForm.value;
    const tags = formValue.tagsInput
      ? formValue.tagsInput
          .split(',')
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0)
      : [];

    const createRequest: CreateLeadRequest = {
      name: formValue.name,
      email: formValue.email || undefined,
      phone: formValue.phone || undefined,
      company: formValue.company.id || undefined,
      position: formValue.position || undefined,
      website: formValue.website || undefined,
      industry: formValue.industry || undefined,
      country: formValue.country || undefined,
      city: formValue.city || undefined,
      source: formValue.source,
      priority: formValue.priority || undefined,
      estimatedValue: formValue.estimatedValue ? Number(formValue.estimatedValue) : undefined,
      budget: formValue.budget ? Number(formValue.budget) : undefined,
      decisionTimeframe: formValue.decisionTimeframe || undefined,
      notes: formValue.notes || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    this.leadService.createLead(createRequest).subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        console.error('Error creating lead:', error);
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

}
