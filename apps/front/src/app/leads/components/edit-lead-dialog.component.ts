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
import { Lead, LeadPriority, UpdateLeadRequest } from '../models/lead.model';
import { LeadService } from '../services/lead.service';

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
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>Редактировать лид</h2>
      <button mat-icon-button (click)="onCancel()" class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="editForm" class="edit-lead-form">
        <!-- Basic Information -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">person</mat-icon>
            <h3>Основная информация</h3>
          </div>
          
          <div class="form-field-container">
            <mat-form-field appearance="outline" class="full-width required-field">
              <mat-label>Имя</mat-label>
              <input matInput formControlName="name" placeholder="Введите имя контакта">
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="editForm.get('name')?.hasError('required')">
                Имя обязательно
              </mat-error>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" placeholder="example@company.com">
                <mat-icon matSuffix>email</mat-icon>
                <mat-error *ngIf="editForm.get('email')?.hasError('email')">
                  Некорректный email
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Телефон</mat-label>
                <input matInput formControlName="phone" placeholder="+7 (900) 123-45-67">
                <mat-icon matSuffix>phone</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Компания</mat-label>
                <input matInput formControlName="company" placeholder="Название компании">
                <mat-icon matSuffix>business</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Должность</mat-label>
                <input matInput formControlName="position" placeholder="Должность">
                <mat-icon matSuffix>work</mat-icon>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Сайт</mat-label>
              <input matInput formControlName="website" placeholder="https://company.com">
              <mat-icon matSuffix>language</mat-icon>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Отрасль</mat-label>
                <input matInput formControlName="industry" placeholder="IT, Финансы, Торговля">
                <mat-icon matSuffix>category</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Страна</mat-label>
                <input matInput formControlName="country" placeholder="Россия">
                <mat-icon matSuffix>public</mat-icon>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Город</mat-label>
              <input matInput formControlName="city" placeholder="Москва">
              <mat-icon matSuffix>location_on</mat-icon>
            </mat-form-field>
          </div>
        </div>

        <!-- Lead Details -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">trending_up</mat-icon>
            <h3>Детали лида</h3>
          </div>
          
          <div class="form-field-container">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Приоритет</mat-label>
              <mat-select formControlName="priority">
                <mat-option *ngFor="let priority of priorityOptions" [value]="priority.value">
                  {{ priority.label }}
                </mat-option>
              </mat-select>
              <mat-icon matSuffix>flag</mat-icon>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Предполагаемая ценность</mat-label>
                <input matInput type="number" formControlName="estimatedValue" placeholder="0">
                <span matPrefix>₽&nbsp;</span>
                <mat-icon matSuffix>attach_money</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Бюджет</mat-label>
                <input matInput type="number" formControlName="budget" placeholder="0">
                <span matPrefix>₽&nbsp;</span>
                <mat-icon matSuffix>account_balance</mat-icon>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Временные рамки решения</mat-label>
              <input matInput formControlName="decisionTimeframe" placeholder="В течение месяца">
              <mat-icon matSuffix>schedule</mat-icon>
            </mat-form-field>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">notes</mat-icon>
            <h3>Дополнительно</h3>
          </div>
          
          <div class="form-field-container">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Заметки</mat-label>
              <textarea matInput formControlName="notes" rows="3" 
                        placeholder="Дополнительная информация о лиде..."></textarea>
              <mat-icon matSuffix>note</mat-icon>
            </mat-form-field>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="onCancel()" class="cancel-button">
        Отмена
      </button>
      <button mat-raised-button color="primary" 
              (click)="onSave()" 
              [disabled]="editForm.invalid || loading"
              class="save-button">
        <mat-spinner diameter="20" *ngIf="loading" class="button-spinner"></mat-spinner>
        <mat-icon *ngIf="!loading">save</mat-icon>
        <span>{{ loading ? 'Сохранение...' : 'Сохранить' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    /* Dialog Layout */
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 0 24px;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .close-button {
      color: #666;
    }

    .dialog-content {
      padding: 24px !important;
      max-height: 70vh;
      overflow-y: auto;
    }

    .dialog-actions {
      padding: 16px 24px 24px 24px !important;
      border-top: 1px solid #e0e0e0;
      gap: 12px;
      justify-content: flex-end;
    }

    /* Form Layout */
    .edit-lead-form {
      width: 100%;
      max-width: 600px;
    }

    .form-section {
      margin-bottom: 32px;
    }

    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f0f0f0;
    }

    .section-icon {
      color: #4285f4;
      margin-right: 12px;
      font-size: 20px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .form-field-container {
      padding-left: 32px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .form-field {
      width: 100%;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    /* Form Field Styling */
    .mat-mdc-form-field {
      .mat-mdc-text-field-wrapper {
        background-color: #fafafa;
        border-radius: 8px;
        transition: background-color 0.2s ease;
        
        &:hover {
          background-color: #f5f5f5;
        }
        
        .mdc-notched-outline {
          border-color: #e0e0e0;
          border-width: 1px;
          
          .mdc-notched-outline__leading,
          .mdc-notched-outline__notch,
          .mdc-notched-outline__trailing {
            border-color: #e0e0e0;
          }
          
          .mdc-notched-outline__notch {
            border-right: 0px;
          }
        }
        
        &:hover .mdc-notched-outline {
          border-color: #c0c0c0;
        }
        
        &.mdc-text-field--focused .mdc-notched-outline {
          border-color: #4285f4;
          border-width: 2px;
        }
      }
      
      .mat-mdc-form-field-infix {
        padding: 16px 14px;
        min-height: 56px;
      }
      
      .mat-mdc-input-element {
        color: #1a1a1a;
        font-size: 14px;
        
        &::placeholder {
          color: #999;
          opacity: 1;
        }
      }
      
      .mat-mdc-form-field-label {
        color: #666;
        font-weight: 500;
      }
      
      &.mat-focused .mat-mdc-form-field-label {
        color: #4285f4;
      }
      
      .mat-mdc-form-field-icon-suffix {
        color: #666;
      }
      
      .mat-mdc-form-field-icon-prefix {
        color: #666;
        margin-right: 8px;
      }
    }

    /* Required Field Indicator */
    .required-field .mat-mdc-form-field-label::after {
      content: ' *';
      color: #f44336;
    }

    /* Select Dropdown */
    .mat-mdc-select-value {
      color: #1a1a1a;
    }

    .mat-mdc-select-placeholder {
      color: #999;
    }

    /* Textarea */
    .mat-mdc-input-element[rows] {
      resize: vertical;
      min-height: 80px;
    }

    /* Buttons */
    .cancel-button {
      border-color: #e0e0e0;
      color: #666;
      font-weight: 500;
      padding: 0 24px;
      height: 40px;
      
      &:hover {
        background-color: #f5f5f5;
        border-color: #c0c0c0;
      }
    }

    .save-button {
      background-color: #4285f4;
      color: white;
      font-weight: 500;
      padding: 0 24px;
      height: 40px;
      box-shadow: 0 2px 4px rgba(66, 133, 244, 0.2);
      display: flex;
      align-items: center;
      gap: 8px;
      
      &:hover:not(:disabled) {
        background-color: #3367d6;
        box-shadow: 0 4px 8px rgba(66, 133, 244, 0.3);
      }
      
      &:disabled {
        background-color: #e0e0e0;
        color: #999;
        box-shadow: none;
      }
      
      .button-spinner {
        margin-right: 8px;
      }
    }

    /* Scrollbar */
    .dialog-content::-webkit-scrollbar {
      width: 6px;
    }

    .dialog-content::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    .dialog-content::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }

    .dialog-content::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }

    /* Error Messages */
    .mat-mdc-form-field-error {
      color: #f44336;
      font-size: 12px;
      margin-top: 4px;
    }

    /* Fix for notch border - high specificity */
    .mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field .mdc-notched-outline__notch {
      border-right: 0px !important;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .dialog-header {
        padding: 16px 16px 0 16px;
      }
      
      .dialog-content {
        padding: 16px !important;
      }
      
      .dialog-actions {
        padding: 12px 16px 16px 16px !important;
        flex-direction: column-reverse;
      }
      
      .form-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .form-field-container {
        padding-left: 0;
      }
      
      .cancel-button,
      .save-button {
        width: 100%;
        height: 44px;
      }
    }

    @media (max-width: 480px) {
      .dialog-header h2 {
        font-size: 20px;
      }
      
      .section-header {
        margin-bottom: 16px;
      }
      
      .form-section {
        margin-bottom: 24px;
      }
    }
  `]
})
export class EditLeadDialogComponent {
  private fb = inject(FormBuilder);
  private leadService = inject(LeadService);
  private dialogRef = inject(MatDialogRef<EditLeadDialogComponent>);
  
  data = inject(MAT_DIALOG_DATA) as { lead: Lead };

  editForm: FormGroup;
  loading = false;

  priorityOptions = [
    { value: LeadPriority.LOW, label: 'Низкий' },
    { value: LeadPriority.MEDIUM, label: 'Средний' },
    { value: LeadPriority.HIGH, label: 'Высокий' },
    { value: LeadPriority.URGENT, label: 'Срочный' }
  ];

  constructor() {
    this.editForm = this.createForm();
    this.populateForm();
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
      notes: ['']
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
      notes: lead.notes || ''
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
        notes: formValue.notes || undefined
      };

      this.leadService.updateLead(this.data.lead.id, updateRequest).subscribe({
        next: (updatedLead) => {
          this.loading = false;
          this.dialogRef.close(updatedLead);
        },
        error: (error) => {
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
