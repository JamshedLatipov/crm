import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CompaniesService } from '../../../services/companies.service';
import { CustomFieldsService } from '../../../services/custom-fields.service';
import { ContactsService } from '../../../contacts/contacts.service';
import { Company } from '../../../pipeline/dtos';
import { Contact } from '../../../contacts/contact.interfaces';
import { CustomFieldDefinition } from '../../../models/custom-field.model';
import { DynamicFieldComponent } from '../../../shared/components/dynamic-field/dynamic-field.component';
import { CreateCompanyDialogComponent } from '../../../shared/components/create-company-dialog/create-company-dialog.component';
import { ConfirmActionDialogComponent } from '../../../shared/dialogs/confirm-action-dialog.component';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatMenuModule,
    DynamicFieldComponent,
  ],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss',
})
export class CompanyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly companiesService = inject(CompaniesService);
  private readonly customFieldsService = inject(CustomFieldsService);
  private readonly contactsService = inject(ContactsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  company: Company | null = null;
  isLoading = true;
  error: string | null = null;

  relatedContacts: Contact[] = [];
  contactsLoading = false;

  customFieldDefinitions = signal<CustomFieldDefinition[]>([]);
  customFieldsLoading = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCompany(id);
      this.loadCustomFields();
      this.loadRelatedContacts(id);
    } else {
      this.error = 'ID компании не указан';
      this.isLoading = false;
    }
  }

  loadCompany(id: string) {
    this.isLoading = true;
    this.error = null;

    this.companiesService.getCompany(id).subscribe({
      next: (company) => {
        this.company = company;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading company:', err);
        this.error = 'Не удалось загрузить данные компании';
        this.isLoading = false;
      },
    });
  }

  loadCustomFields() {
    this.customFieldsLoading = true;
    this.customFieldsService.findByEntity('company').subscribe({
      next: (definitions) => {
        this.customFieldDefinitions.set(definitions);
        this.customFieldsLoading = false;
      },
      error: (error) => {
        console.error('Error loading custom fields:', error);
        this.customFieldsLoading = false;
      },
    });
  }

  loadRelatedContacts(companyId: string) {
    this.contactsLoading = true;
    this.contactsService.listContacts({ companyId }, 1, 100).subscribe({
      next: (response) => {
        this.relatedContacts = response.data;
        this.contactsLoading = false;
      },
      error: (error) => {
        console.error('Error loading related contacts:', error);
        this.contactsLoading = false;
      },
    });
  }

  goBack() {
    this.router.navigate(['/companies']);
  }

  editCompany() {
    if (!this.company) return;

    const dialogRef = this.dialog.open(CreateCompanyDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { company: this.company },
    });

    dialogRef.afterClosed().subscribe((result: Company | undefined) => {
      if (result && this.company) {
        this.snackBar.open('Компания успешно обновлена', 'Закрыть', {
          duration: 3000,
        });
        this.loadCompany(String(this.company.id));
      }
    });
  }

  deleteCompany() {
    if (!this.company) return;

    const dialogRef = this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px',
      data: {
        title: 'Удалить компанию',
        message: `Вы уверены, что хотите удалить компанию "${this.company.name}"?`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && this.company) {
        this.companiesService.deleteCompany(this.company.id).subscribe({
          next: () => {
            this.snackBar.open('Компания удалена', 'Закрыть', {
              duration: 3000,
            });
            this.goBack();
          },
          error: (error) => {
            console.error('Error deleting company:', error);
            this.snackBar.open('Ошибка при удалении компании', 'Закрыть', {
              duration: 3000,
            });
          },
        });
      }
    });
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      client: 'Клиент',
      prospect: 'Потенциальный',
      partner: 'Партнер',
      competitor: 'Конкурент',
      vendor: 'Поставщик',
    };
    return labels[type] || type;
  }

  getIndustryLabel(industry: string): string {
    const labels: Record<string, string> = {
      technology: 'Технологии',
      finance: 'Финансы',
      healthcare: 'Здравоохранение',
      education: 'Образование',
      retail: 'Розничная торговля',
      manufacturing: 'Производство',
      real_estate: 'Недвижимость',
      consulting: 'Консалтинг',
      media: 'Медиа',
      government: 'Государственный сектор',
      other: 'Другое',
    };
    return labels[industry] || industry;
  }

  getSizeLabel(size: string): string {
    const labels: Record<string, string> = {
      startup: 'Стартап (1-10)',
      small: 'Малый (11-50)',
      medium: 'Средний (51-250)',
      large: 'Крупный (251-1000)',
      enterprise: 'Корпорация (1000+)',
    };
    return labels[size] || size;
  }

  getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      website: 'Веб-сайт',
      referral: 'Рекомендация',
      social_media: 'Социальные сети',
      cold_call: 'Холодный звонок',
      event: 'Мероприятие',
      partner: 'Партнер',
      other: 'Другое',
    };
    return labels[source] || source;
  }

  viewContact(contact: Contact) {
    this.router.navigate(['/contacts/view', contact.id]);
  }
}
