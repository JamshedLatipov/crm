import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PromoCompaniesService } from '../../services/promo-companies.service';
import { PromoCompany } from '../../models/promo-company.model';

@Component({
  selector: 'app-assign-promo-company-dialog',
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
    MatProgressSpinnerModule,
  ],
  template: `
    <div mat-dialog-title class="dialog-header">
      <div class="header-content">
        <div class="header-text">
          <h2>Присвоить промо-компанию</h2>
          <p class="header-subtitle">Выберите промо-компанию для привязки лида</p>
        </div>
        <button mat-icon-button (click)="cancel()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="promoForm" class="promo-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Промо-компания</mat-label>
          <mat-select formControlName="promoCompanyId" [disabled]="promoCompanies.length === 0">
            <mat-option *ngFor="let company of promoCompanies" [value]="company.id">
              <div class="option-content">
                <mat-icon class="option-icon">campaign</mat-icon>
                <div class="option-details">
                  <span class="option-name">{{ company.name }}</span>
                  <span class="option-type">{{ getCompanyTypeLabel(company.type) }}</span>
                </div>
              </div>
            </mat-option>
            <mat-option *ngIf="promoCompanies.length === 0" [value]="null" disabled>Нет доступных промо-компаний</mat-option>
          </mat-select>
          <mat-icon matSuffix>campaign</mat-icon>
        </mat-form-field>
        <div *ngIf="promoCompanies.length === 0" class="empty-list-note">Нет активных промо-компаний для присвоения.</div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="cancel()" class="cancel-button">Отмена</button>
      <button mat-raised-button color="primary" (click)="assign()" [disabled]="promoForm.invalid || isAssigning" class="assign-button">
        <mat-spinner diameter="20" *ngIf="isAssigning" class="button-spinner"></mat-spinner>
        <mat-icon *ngIf="!isAssigning">link</mat-icon>
        <span>{{ isAssigning ? 'Присваивание...' : 'Присвоить' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    /* Dialog Layout */
    .dialog-header {
      padding: 24px 24px 0 24px;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-text h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .header-subtitle {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .close-button {
      color: #666;
      margin-top: -8px;
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
    .promo-form {
      width: 100%;
      max-width: 500px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    /* Select Options */
    .option-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .option-icon {
      color: #7b1fa2;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .option-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .option-name {
      font-weight: 500;
      color: #1a1a1a;
      font-size: 14px;
    }

    .option-type {
      font-size: 12px;
      color: #666;
      text-transform: capitalize;
    }

    /* Buttons */
    .cancel-button {
      border-color: #e0e0e0;
      color: #666;
      font-weight: 500;
      padding: 0 24px;
      height: 40px;
    }

    .assign-button {
      background-color: #7b1fa2;
      color: white;
      font-weight: 500;
      padding: 0 24px;
      height: 40px;
      box-shadow: 0 2px 4px rgba(123, 31, 162, 0.2);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .button-spinner {
      width: 20px !important;
      height: 20px !important;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dialog-header {
        padding: 16px 16px 0 16px;
      }

      .header-content {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
      }

      .close-button {
        align-self: flex-end;
        margin-top: -4px;
      }

      .dialog-content {
        padding: 16px !important;
      }

      .dialog-actions {
        padding: 12px 16px 16px 16px !important;
        flex-direction: column-reverse;
      }

      .cancel-button,
      .assign-button {
        width: 100%;
        height: 44px;
      }
    }
  `]
})
export class AssignPromoCompanyDialogComponent {
  promoForm: FormGroup;
  promoCompanies: PromoCompany[] = [];
  isAssigning = false;

  constructor(
    private fb: FormBuilder,
    private promoCompaniesService: PromoCompaniesService,
    private dialogRef: MatDialogRef<AssignPromoCompanyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.promoForm = this.fb.group({
      promoCompanyId: [null, [Validators.required]]
    });

    this.loadPromoCompanies();
  }

  loadPromoCompanies(): void {
    this.promoCompaniesService.getAll().subscribe({
      next: (companies) => {
        console.log('All promo companies:', companies);
        console.log('Current promo company ID:', this.data?.currentPromoCompanyId);
        // Фильтруем только активные промо-компании и исключаем уже привязанную
        this.promoCompanies = companies.filter(company =>
          company.status === 'active' &&
          company.id !== this.data?.currentPromoCompanyId
        );
        console.log('Filtered promo companies:', this.promoCompanies);
      },
      error: (error) => {
        console.error('Error loading promo companies:', error);
      }
    });
  }

  getCompanyTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'promoter': 'Промоутер',
      'affiliate': 'Партнер',
      'partner': 'Партнер'
    };
    return labels[type] || type;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  assign(): void {
    if (this.promoForm.valid) {
      const promoCompanyId = this.promoForm.value.promoCompanyId;
      this.dialogRef.close(promoCompanyId);
    }
  }
}