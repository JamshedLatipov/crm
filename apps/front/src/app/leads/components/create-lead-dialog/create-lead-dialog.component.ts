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
import { CompanySelectorComponent } from '../../../shared/components/company-selector/company-selector.component';
import { ContactSelectorComponent } from '../../../contacts/components/contact-selector.component';
import { Contact } from '../../../contacts/contact.interfaces';
import { PromoCompaniesService } from '../../../promo-companies/services/promo-companies.service';
import { PromoCompany } from '../../../promo-companies/models/promo-company.model';

@Component({
  selector: 'app-create-lead-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule, MatOptionModule, MatAutocompleteModule, CompanySelectorComponent, ContactSelectorComponent],
  templateUrl: './create-lead-dialog.component.html',
  styleUrls: ['./create-lead-dialog.component.scss']
})
export class CreateLeadDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly promoCompaniesService = inject(PromoCompaniesService);
  private readonly dialogRef = inject(MatDialogRef<CreateLeadDialogComponent>);

  leadForm: FormGroup;
  saving = false;
  promoCompanies: PromoCompany[] = [];

  constructor() {
    this.leadForm = this.fb.group({
      contact: [null, [Validators.required]], // Выбранный контакт
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
      promoCompanyId: [null], // ID промо-компании
      estimatedValue: [''],
      budget: [''],
      decisionTimeframe: [''],
      notes: [''],
      tagsInput: [''],
    });

    // Загружаем список промо-компаний
    this.loadPromoCompanies();

    // company autocomplete is provided by CompanyAutocompleteComponent
    
    // Отслеживаем изменения выбранного контакта
    this.leadForm.get('contact')?.valueChanges.subscribe((contact: Contact | null) => {
      if (contact) {
        this.fillFormFromContact(contact);
      }
    });
  }

  fillFormFromContact(contact: Contact): void {
    // Заполняем форму данными из выбранного контакта
    this.leadForm.patchValue({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
      website: contact.website || '',
      company: contact.companyName || '',
      companyId: contact.companyId || ''
    });
  }

  loadPromoCompanies(): void {
    this.promoCompaniesService.getAll().subscribe({
      next: (companies) => {
        // Фильтруем только активные промо-компании
        this.promoCompanies = companies.filter(company => company.status === 'active');
      },
      error: (error) => {
        console.error('Error loading promo companies:', error);
      }
    });
  }

  save(): void {
    if (this.leadForm.invalid) return;
    this.saving = true;
    const formValue = this.leadForm.value;
    const selectedContact: Contact = formValue.contact;
    
    const tags = formValue.tagsInput
      ? formValue.tagsInput
          .split(',')
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0)
      : [];

    const createRequest: CreateLeadRequest = {
      contactId: selectedContact?.id, // Привязываем к выбранному контакту
      name: formValue.name,
      email: formValue.email || undefined,
      phone: formValue.phone || undefined,
      companyId: formValue.companyId || undefined, // ID компании из селектора
      position: formValue.position || undefined,
      website: formValue.website || undefined,
      industry: formValue.industry || undefined,
      country: formValue.country || undefined,
      city: formValue.city || undefined,
      source: formValue.source,
      priority: formValue.priority || undefined,
      promoCompanyId: formValue.promoCompanyId || undefined, // ID промо-компании
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
