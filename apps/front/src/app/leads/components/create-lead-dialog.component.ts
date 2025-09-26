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

import { LeadService } from '../services/lead.service';
import { LeadSource, LeadPriority, CreateLeadRequest } from '../models/lead.model';

@Component({
  selector: 'app-create-lead-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>Создать лид</h2>
      <button mat-icon-button (click)="cancel()" class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    
    <mat-dialog-content class="dialog-content">
      <form [formGroup]="leadForm" class="create-lead-form">
        <!-- Basic Information -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">person</mat-icon>
            <h3>Основная информация</h3>
          </div>
          
          <div class="form-field-container">
            <mat-form-field appearance="outline" class="full-width required-field">
              <mat-label>Имя</mat-label>
              <input matInput formControlName="name" >
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="leadForm.get('name')?.hasError('required')">
                Имя обязательно
              </mat-error>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" >
                <mat-icon matSuffix>email</mat-icon>
                <mat-error *ngIf="leadForm.get('email')?.hasError('email')">
                  Некорректный email
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Телефон</mat-label>
                <input matInput formControlName="phone" >
                <mat-icon matSuffix>phone</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Компания</mat-label>
                <input matInput formControlName="company" >
                <mat-icon matSuffix>business</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Должность</mat-label>
                <input matInput formControlName="position" >
                <mat-icon matSuffix>work</mat-icon>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Сайт</mat-label>
              <input matInput formControlName="website" >
              <mat-icon matSuffix>language</mat-icon>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Отрасль</mat-label>
                <input matInput formControlName="industry" >
                <mat-icon matSuffix>category</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Страна</mat-label>
                <input matInput formControlName="country" >
                <mat-icon matSuffix>public</mat-icon>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Город</mat-label>
              <input matInput formControlName="city" >
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
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field required-field">
                <mat-label>Источник</mat-label>
                <mat-select formControlName="source">
                  <mat-option *ngFor="let source of sourceOptions" [value]="source.value">
                    {{ source.label }}
                  </mat-option>
                </mat-select>
                <mat-icon matSuffix>source</mat-icon>
                <mat-error *ngIf="leadForm.get('source')?.hasError('required')">
                  Источник обязателен
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Приоритет</mat-label>
                <mat-select formControlName="priority">
                  <mat-option *ngFor="let priority of priorityOptions" [value]="priority.value">
                    {{ priority.label }}
                  </mat-option>
                </mat-select>
                <mat-icon matSuffix>flag</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Предполагаемая ценность</mat-label>
                <input matInput type="number" formControlName="estimatedValue" >
                <mat-icon matSuffix>attach_money</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Бюджет</mat-label>
                <input matInput type="number" formControlName="budget" >
                <mat-icon matSuffix>account_balance</mat-icon>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Временные рамки решения</mat-label>
              <input matInput formControlName="decisionTimeframe" >
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
              <textarea matInput formControlName="notes" rows="3"></textarea>
              <mat-icon matSuffix>note</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Теги</mat-label>
              <input matInput formControlName="tagsInput" 
                     >
              <mat-icon matSuffix>local_offer</mat-icon>
            </mat-form-field>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="cancel()" class="cancel-button">
        Отмена
      </button>
      <button mat-raised-button color="primary" 
              (click)="save()" 
              [disabled]="leadForm.invalid || saving"
              class="save-button">
        <mat-spinner diameter="20" *ngIf="saving" class="button-spinner"></mat-spinner>
        <mat-icon *ngIf="!saving">add</mat-icon>
        <span>{{ saving ? 'Создание...' : 'Создать лид' }}</span>
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
    .create-lead-form {
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
            border-right: 0px !important;
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
export class CreateLeadDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly dialogRef = inject(MatDialogRef<CreateLeadDialogComponent>);

  leadForm: FormGroup;
  saving = false;

  sourceOptions = [
    { value: LeadSource.WEBSITE, label: 'Сайт' },
    { value: LeadSource.FACEBOOK, label: 'Facebook' },
    { value: LeadSource.GOOGLE_ADS, label: 'Google Ads' },
    { value: LeadSource.LINKEDIN, label: 'LinkedIn' },
    { value: LeadSource.EMAIL, label: 'Email' },
    { value: LeadSource.PHONE, label: 'Телефон' },
    { value: LeadSource.REFERRAL, label: 'Рекомендация' },
    { value: LeadSource.TRADE_SHOW, label: 'Выставка' },
    { value: LeadSource.WEBINAR, label: 'Вебинар' },
    { value: LeadSource.CONTENT_MARKETING, label: 'Контент-маркетинг' },
    { value: LeadSource.COLD_OUTREACH, label: 'Холодный обзвон' },
    { value: LeadSource.PARTNER, label: 'Партнер' },
    { value: LeadSource.OTHER, label: 'Другое' }
  ];

  priorityOptions = [
    { value: LeadPriority.LOW, label: 'Низкий' },
    { value: LeadPriority.MEDIUM, label: 'Средний' },
    { value: LeadPriority.HIGH, label: 'Высокий' },
    { value: LeadPriority.URGENT, label: 'Срочный' }
  ];

  constructor() {
    this.leadForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: [''],
      company: [''],
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
      tagsInput: ['']
    });
  }

  save(): void {
    if (this.leadForm.invalid) {
      return;
    }

    this.saving = true;
    const formValue = this.leadForm.value;
    
    // Parse tags from input
    const tags = formValue.tagsInput 
      ? formValue.tagsInput.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      : [];

    const createRequest: CreateLeadRequest = {
      name: formValue.name,
      email: formValue.email || undefined,
      phone: formValue.phone || undefined,
      company: formValue.company || undefined,
      position: formValue.position || undefined,
      website: formValue.website || undefined,
      industry: formValue.industry || undefined,
      country: formValue.country || undefined,
      city: formValue.city || undefined,
      source: formValue.source,
      priority: formValue.priority || undefined,
      estimatedValue: formValue.estimatedValue || undefined,
      budget: formValue.budget || undefined,
      decisionTimeframe: formValue.decisionTimeframe || undefined,
      notes: formValue.notes || undefined,
      tags: tags.length > 0 ? tags : undefined
    };

    this.leadService.createLead(createRequest).subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        console.error('Error creating lead:', error);
        this.saving = false;
        // TODO: Show error message to user
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
