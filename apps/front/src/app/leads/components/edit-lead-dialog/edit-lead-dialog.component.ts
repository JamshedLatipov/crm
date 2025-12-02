import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CompaniesService } from '../../../services/companies.service';
import { CompanyAutocompleteComponent } from '../../../shared/components/company-autocomplete/company-autocomplete.component';
import { UserSelectorComponent } from '../../../shared/components/user-selector/user-selector.component';
import { Company } from '../../../pipeline/dtos';
// rxjs operators not needed (autocomplete provided by shared component)
import { Lead, LeadPriority, UpdateLeadRequest } from '../../models/lead.model';
import { LeadService } from '../../services/lead.service';

@Component({
  selector: 'app-edit-lead-dialog',
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
    MatChipsModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    CompanyAutocompleteComponent,
    UserSelectorComponent,
  ],
  templateUrl: './edit-lead-dialog.component.html',
  styleUrls: ['./edit-lead-dialog.component.scss'],
})
export class EditLeadDialogComponent {
  private fb = inject(FormBuilder);
  private leadService = inject(LeadService);
  private dialogRef = inject(MatDialogRef<EditLeadDialogComponent>);
  private readonly companiesService = inject(CompaniesService);
  
  data = inject(MAT_DIALOG_DATA) as { lead: Lead };

  editForm: FormGroup;
  loading = false;
  // autocomplete handled by shared component

  priorityOptions = [
    { value: LeadPriority.LOW, label: 'Низкий' },
    { value: LeadPriority.MEDIUM, label: 'Средний' },
    { value: LeadPriority.HIGH, label: 'Высокий' },
    { value: LeadPriority.URGENT, label: 'Срочный' },
  ];

  constructor() {
    this.editForm = this.createForm();
    this.populateForm();
    // company autocomplete provided by CompanyAutocompleteComponent
    // ensure companyId control exists
    this.editForm.addControl('companyId', this.fb.control(null));
  }

  get companyControl() {
    return this.editForm.get('company') as import('@angular/forms').FormControl<string | null>;
  }

  get companyIdControl() {
    return this.editForm.get('companyId') as import('@angular/forms').FormControl<string | null>;
  }

  onCompanySelected(company: Company | null) {
    if (!company) return;
    this.editForm.patchValue({ company: company.name || company.legalName });
    this.companyIdControl.setValue(company.id ?? null);
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: [''],
      company: [''],
      position: [''],
      website: [''],
      industry: [''],
      country: [''],
      city: [''],
      priority: [LeadPriority.MEDIUM],
      estimatedValue: [0, [Validators.min(0)]],
      budget: [0, [Validators.min(0)]],
      decisionTimeframe: [''],
      notes: [''],
        // assignedTo — хранит id выбранного пользователя
        assignedTo: [null],
    });
  }

  private populateForm(): void {
    const lead = this.data.lead;
    this.editForm.patchValue({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      position: lead.position || '',
      website: lead.website || '',
      industry: lead.industry || '',
      country: lead.country || '',
      city: lead.city || '',
      priority: lead.priority,
      estimatedValue: lead.estimatedValue || 0,
      budget: lead.budget || 0,
      decisionTimeframe: lead.decisionTimeframe || '',
      notes: lead.notes || '',
      assignedTo: (lead as any).assignedTo ? ((lead as any).assignedTo.id ?? (lead as any).assignedTo) : null,
    });
  }

  onSave(): void {
    if (this.editForm.valid) {
      this.loading = true;
      const formValue = this.editForm.value;
      
      const updateRequest: UpdateLeadRequest = {
        name: formValue.name,
        email: formValue.email || undefined,
        phone: formValue.phone || undefined,
        company: formValue.company || undefined,
        position: formValue.position || undefined,
        website: formValue.website || undefined,
        industry: formValue.industry || undefined,
        country: formValue.country || undefined,
        city: formValue.city || undefined,
        priority: formValue.priority,
        estimatedValue: formValue.estimatedValue || undefined,
        budget: formValue.budget || undefined,
        decisionTimeframe: formValue.decisionTimeframe || undefined,
        notes: formValue.notes || undefined,
        assignedTo: formValue.assignedTo || undefined,
      };

      this.leadService.updateLead(this.data.lead.id, updateRequest).subscribe({
        next: (updatedLead) => {
          this.loading = false;
          this.dialogRef.close(updatedLead);
        },
        error: (error: unknown) => {
          this.loading = false;
          console.error('Error updating lead:', error);
          // TODO: Show error message to user
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
