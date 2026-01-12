import { Component, OnInit, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, debounceTime, distinctUntilChanged, switchMap, startWith, of } from 'rxjs';
import { DealsService } from '../../../pipeline/deals.service';
import { ContactsService } from '../../../contacts/contacts.service';
import { PipelineService } from '../../../pipeline/pipeline.service';
import { Deal, CreateDealDto, UpdateDealDto, Stage, StageType } from '../../../pipeline/dtos';
import { Contact } from '../../../contacts/contact.interfaces';
import { UserSelectorComponent } from '../../../shared/components/user-selector/user-selector.component';
import { CurrencyService } from '../../../services/currency.service';
import { CustomFieldsService } from '../../../services/custom-fields.service';
import { CustomFieldDefinition } from '../../../models/custom-field.model';
import { DynamicFieldComponent } from '../../../shared/components/dynamic-field/dynamic-field.component';

export interface DealFormData {
  deal?: Deal;
  mode: 'create' | 'edit';
  contactId?: string;
}

@Component({
  selector: 'app-deal-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatAutocompleteModule,
    UserSelectorComponent,
    DynamicFieldComponent
  ],
  templateUrl: `./deal-form.component.html`,
  styleUrls: [`./deal-form.component.scss`]
})
export class DealFormComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<DealFormComponent>, { optional: true });
  private readonly data = inject<DealFormData>(MAT_DIALOG_DATA, { optional: true });
  private readonly fb = inject(FormBuilder);
  private readonly dealsService = inject(DealsService);
  private readonly contactsService = inject(ContactsService);
  private readonly pipelineService = inject(PipelineService);
  private readonly currencyService = inject(CurrencyService);
  private readonly customFieldsService = inject(CustomFieldsService);

  @Input() deal?: Deal;
  @Input() mode: 'create' | 'edit' = 'create';
  @Output() dealSaved = new EventEmitter<Deal>();
  @Output() cancelled = new EventEmitter<void>();

  dealForm!: FormGroup;
  stages: Stage[] = [];
  selectedContact: Contact | null = null;
  filteredContacts!: Observable<Contact[]>;
  isLoading = false;
  customFieldDefinitions: CustomFieldDefinition[] = [];
  customFieldValues: Record<string, any> = {};

  get probabilityControl() {
    return this.dealForm.get('probability') as FormControl;
  }

  get isEditMode(): boolean {
    return (this.data?.mode || this.mode) === 'edit';
  }

  get currentDeal(): Deal | undefined {
    return this.data?.deal || this.deal;
  }

  ngOnInit() {
    this.initializeForm();
    this.loadStages();
    this.setupContactSearch();
    this.loadCustomFields();
    
    if (this.currentDeal) {
      this.populateForm();
    }

    // If contactId was provided via dialog data (prefill contact for creation)
    const contactId = (this.data as any)?.contactId as string | undefined;
    if (!this.currentDeal && contactId) {
      this.contactsService.getContactById(contactId).subscribe({
        next: (c) => {
          this.selectedContact = c as Contact;
          this.dealForm.patchValue({ contactSearch: this.selectedContact?.name || '' });
        },
        error: (err) => {
          console.error('Unable to prefill contact for deal form:', err);
        }
      });
    }
  }

  private initializeForm() {
    this.dealForm = this.fb.group({
      title: ['', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      currency: [this.currencyService.currencyCode()],
      probability: [50],
      expectedCloseDate: [new Date(), [Validators.required]],
      stageId: ['', [Validators.required]],
      contactSearch: [''],
      status: ['open'],
      assignedTo: ['', [Validators.required]],
      notes: ['']
    });
  }

  private loadStages() {
    this.pipelineService.listStages(StageType.DEAL_PROGRESSION).subscribe({
      next: (stages) => {
        this.stages = stages;
        if (stages.length > 0 && !this.currentDeal) {
          // Устанавливаем первый этап по умолчанию для новой сделки
          this.dealForm.patchValue({ stageId: stages[0].id });
        }
      },
      error: (error) => {
        console.error('Ошибка загрузки этапов:', error);
      }
    });
  }

  private setupContactSearch() {
    const contactSearchControl = this.dealForm.get('contactSearch');
    if (!contactSearchControl) return;
    
    this.filteredContacts = contactSearchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.trim().length > 0) {
          return this.contactsService.searchContacts(value.trim());
        }
        return of([]);
      })
    );
  }

  private populateForm() {
    if (!this.currentDeal) return;

    const deal = this.currentDeal;
    
    // Извлекаем ID из объекта assignedTo, если он пришел как объект
    const assignedToId = typeof deal.assignedTo === 'object' && deal.assignedTo !== null
      ? (deal.assignedTo as any).id
      : deal.assignedTo;
    
    console.log('DealForm: assignedTo from API:', deal.assignedTo);
    console.log('DealForm: extracted assignedToId:', assignedToId);
    
    this.dealForm.patchValue({
      title: deal.title,
      amount: deal.amount,
      currency: deal.currency,
      probability: deal.probability,
      expectedCloseDate: new Date(deal.expectedCloseDate),
      stageId: deal.stageId,
      status: deal.status,
      assignedTo: assignedToId,
      notes: deal.notes
    });

    // Загружаем значения кастомных полей
    this.customFieldValues = deal.customFields || {};

    if (deal.contact) {
      // Преобразуем DealContact в Contact для совместимости
      this.selectedContact = {
        ...deal.contact,
        createdAt: deal.contact.createdAt instanceof Date ? 
          deal.contact.createdAt.toISOString() : 
          deal.contact.createdAt,
        updatedAt: deal.contact.updatedAt instanceof Date ? 
          deal.contact.updatedAt.toISOString() : 
          deal.contact.updatedAt,
        lastContactDate: deal.contact.lastContactDate instanceof Date ? 
          deal.contact.lastContactDate.toISOString() : 
          deal.contact.lastContactDate
      } as Contact;
      
      this.dealForm.patchValue({
        contactSearch: deal.contact.name
      });
    }
  }

  onContactSelected(contact: Contact) {
    this.selectedContact = contact;
  }

  displayContact(contact?: Contact): string {
    return contact ? contact.name : '';
  }

  onSubmit() {
    if (this.dealForm.invalid) return;

    this.isLoading = true;
    const formValue = this.dealForm.value;
    
    if (this.isEditMode && this.currentDeal) {
      // Обновление существующей сделки
      const updateDto: UpdateDealDto = {
        title: formValue.title,
        amount: formValue.amount,
        currency: formValue.currency,
        probability: formValue.probability,
        expectedCloseDate: formValue.expectedCloseDate.toISOString(),
        stageId: formValue.stageId,
        status: formValue.status,
        assignedTo: formValue.assignedTo || undefined,
        notes: formValue.notes || undefined,
        contactId: this.selectedContact?.id || undefined,
        customFields: this.customFieldValues
      };

      this.dealsService.updateDeal(this.currentDeal.id, updateDto).subscribe({
        next: (deal) => {
          this.isLoading = false;
          this.dealSaved.emit(deal);
          if (this.dialogRef) {
            this.dialogRef.close(deal);
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Ошибка обновления сделки:', error);
        }
      });
    } else {
      // Создание новой сделки
      const createDto: CreateDealDto = {
        title: formValue.title,
        amount: formValue.amount,
        currency: formValue.currency,
        probability: formValue.probability,
        expectedCloseDate: formValue.expectedCloseDate.toISOString(),
        stageId: formValue.stageId,
        assignedTo: formValue.assignedTo,
        notes: formValue.notes || undefined,
        contactId: this.selectedContact?.id || undefined,
        customFields: this.customFieldValues
      };

      this.dealsService.createDeal(createDto).subscribe({
        next: (deal) => {
          this.isLoading = false;
          this.dealSaved.emit(deal);
          if (this.dialogRef) {
            this.dialogRef.close(deal);
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Ошибка создания сделки:', error);
        }
      });
    }
  }

  loadCustomFields() {
    this.customFieldsService.findByEntity('deal').subscribe({
      next: (fields) => {
        this.customFieldDefinitions = fields;
      },
      error: (err) => {
        console.error('Error loading custom fields:', err);
      },
    });
  }

  onCustomFieldChange(fieldName: string, value: any): void {
    this.customFieldValues[fieldName] = value;
  }

  onCancel() {
    this.cancelled.emit();
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}