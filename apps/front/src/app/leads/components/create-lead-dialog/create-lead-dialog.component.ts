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

import { LeadService } from '../../services/lead.service';
import { LeadPriority, CreateLeadRequest } from '../../models/lead.model';

@Component({
  selector: 'app-create-lead-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './create-lead-dialog.component.html',
  styleUrls: ['./create-lead-dialog.component.scss']
})
export class CreateLeadDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly dialogRef = inject(MatDialogRef<CreateLeadDialogComponent>);

  leadForm: FormGroup;
  saving = false;

  constructor() {
    this.leadForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: [''],
      company: [''],
      source: ['', [Validators.required]],
      priority: [LeadPriority.MEDIUM],
      notes: [''],
      tagsInput: [''],
    });
  }

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
      company: formValue.company || undefined,
      source: formValue.source,
      priority: formValue.priority || undefined,
      notes: formValue.notes || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    this.leadService.createLead(createRequest).subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (error: any) => {
        console.error('Error creating lead:', error);
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

}
