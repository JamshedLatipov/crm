import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PromoCompaniesService } from '../../services/promo-companies.service';
import { PromoCompany } from '../../models/promo-company.model';
import { CurrencyService } from '../../../services/currency.service';

@Component({
  selector: 'app-edit-promo-company-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div mat-dialog-title class="dialog-header">
      <div class="header-content">
        <div class="header-text">
          <h2>Редактировать промо-компанию</h2>
          <p class="header-subtitle">Измените данные промо-компании</p>
        </div>
        <button mat-icon-button (click)="cancel()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="promoCompanyForm" class="promo-company-form">
        <!-- Основная информация -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">campaign</mat-icon>
            <h3>Основная информация</h3>
          </div>

          <div class="form-grid">
            <mat-form-field appearance="outline" class="full-width required-field">
              <mat-label>Название кампании</mat-label>
              <input matInput formControlName="name" placeholder="Введите название промо-кампании">
              <mat-icon matSuffix>campaign</mat-icon>
              <mat-error *ngIf="promoCompanyForm.get('name')?.hasError('required')">Название обязательно</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Описание</mat-label>
              <textarea matInput formControlName="description" rows="3" placeholder="Опишите цели и особенности кампании"></textarea>
              <mat-icon matSuffix>description</mat-icon>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Тип кампании</mat-label>
                <mat-select formControlName="type">
                  <mat-select-trigger>
                    <div class="option-content">
                      <mat-icon>{{ getTypeIcon(promoCompanyForm.get('type')?.value) }}</mat-icon>
                      <span>{{ getTypeLabel(promoCompanyForm.get('type')?.value) }}</span>
                    </div>
                  </mat-select-trigger>
                  <mat-option value="promoter">
                    <div class="option-content">
                      <mat-icon>person</mat-icon>
                      <span>Промоутер</span>
                    </div>
                  </mat-option>
                  <mat-option value="affiliate">
                    <div class="option-content">
                      <mat-icon>handshake</mat-icon>
                      <span>Партнер</span>
                    </div>
                  </mat-option>
                  <mat-option value="partner">
                    <div class="option-content">
                      <mat-icon>business</mat-icon>
                      <span>Партнер</span>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-icon matSuffix>category</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Статус</mat-label>
                <mat-select formControlName="status">
                  <mat-select-trigger>
                    <div class="option-content">
                      <mat-icon>{{ getStatusIcon(promoCompanyForm.get('status')?.value) }}</mat-icon>
                      <span>{{ getStatusLabel(promoCompanyForm.get('status')?.value) }}</span>
                    </div>
                  </mat-select-trigger>
                  <mat-option value="draft">
                    <div class="option-content">
                      <mat-icon>edit</mat-icon>
                      <span>Черновик</span>
                    </div>
                  </mat-option>
                  <mat-option value="active">
                    <div class="option-content">
                      <mat-icon>play_circle</mat-icon>
                      <span>Активна</span>
                    </div>
                  </mat-option>
                  <mat-option value="paused">
                    <div class="option-content">
                      <mat-icon>pause_circle</mat-icon>
                      <span>Приостановлена</span>
                    </div>
                  </mat-option>
                  <mat-option value="completed">
                    <div class="option-content">
                      <mat-icon>check_circle</mat-icon>
                      <span>Завершена</span>
                    </div>
                  </mat-option>
                  <mat-option value="cancelled">
                    <div class="option-content">
                      <mat-icon>cancel</mat-icon>
                      <span>Отменена</span>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-icon matSuffix>flag</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Бюджет ({{ currencySymbol() }})</mat-label>
                <input matInput type="number" formControlName="budget" placeholder="0">
                <mat-icon matSuffix>attach_money</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Потрачено ({{ currencySymbol() }})</mat-label>
                <input matInput type="number" formControlName="spent" placeholder="0">
                <mat-icon matSuffix>money_off</mat-icon>
              </mat-form-field>
            </div>
          </div>
        </div>

        <!-- Временные рамки -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">schedule</mat-icon>
            <h3>Временные рамки</h3>
          </div>

          <div class="form-grid">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Дата начала</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="startDate">
                <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
                <mat-icon matPrefix>event</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Дата окончания</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="endDate">
                <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
                <mat-icon matPrefix>event</mat-icon>
              </mat-form-field>
            </div>
          </div>
        </div>

        <!-- Статистика -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">analytics</mat-icon>
            <h3>Статистика</h3>
          </div>

          <div class="form-grid">
            <div class="stats-info">
              <div class="stat-item">
                <span class="stat-label">Лиды достигнуто:</span>
                <span class="stat-value">{{ data.promoCompany.leadsReached || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Лиды конвертировано:</span>
                <span class="stat-value">{{ data.promoCompany.leadsConverted || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Дополнительная информация -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">note</mat-icon>
            <h3>Дополнительная информация</h3>
          </div>

          <div class="form-grid">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Заметки</mat-label>
              <textarea matInput formControlName="notes" rows="2" placeholder="Дополнительные заметки и комментарии"></textarea>
              <mat-icon matSuffix>note</mat-icon>
            </mat-form-field>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="cancel()" class="cancel-button">Отмена</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="promoCompanyForm.invalid || isSubmitting" class="save-button">
        <mat-spinner diameter="20" *ngIf="isSubmitting" class="button-spinner"></mat-spinner>
        <mat-icon *ngIf="!isSubmitting">save</mat-icon>
        <span>{{ isSubmitting ? 'Сохранение...' : 'Сохранить изменения' }}</span>
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
    .promo-company-form {
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

    .form-grid {
      padding-left: 32px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    /* Statistics */
    .stats-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #e9ecef;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .stat-label {
      font-weight: 500;
      color: #495057;
    }

    .stat-value {
      font-weight: 600;
      color: #4285f4;
    }

    /* Form Field Styling */
    .mat-mdc-form-field {
      .mat-mdc-text-field-wrapper {
        background-color: #fafafa;
        border-radius: 8px;
        transition: background-color 0.2s ease;
      }

      &:hover .mat-mdc-text-field-wrapper {
        background-color: #f5f5f5;
      }

      &.mat-focused .mat-mdc-text-field-wrapper {
        background-color: #fff;
        box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
      }
    }

    /* Required Field Indicator */
    .required-field .mat-mdc-form-field-label::after {
      content: ' *';
      color: #f44336;
    }

    /* Select Options */
    .option-content {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    /* Buttons */
    .cancel-button {
      border-color: #e0e0e0;
      color: #666;
      font-weight: 500;
      padding: 0 24px;
      height: 40px;
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

      .form-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .form-grid {
        padding-left: 0;
      }

      .cancel-button,
      .save-button {
        width: 100%;
        height: 44px;
      }
    }

    @media (max-width: 480px) {
      .header-text h2 {
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
export class EditPromoCompanyDialogComponent {
  promoCompanyForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private promoCompaniesService: PromoCompaniesService,
    private dialogRef: MatDialogRef<EditPromoCompanyDialogComponent>,
    private snackBar: MatSnackBar,
    private currencyService: CurrencyService,
    @Inject(MAT_DIALOG_DATA) public data: { promoCompany: PromoCompany }
  ) {
    this.promoCompanyForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      type: ['promoter'],
      status: ['draft'],
      budget: [null],
      spent: [null],
      startDate: [null],
      endDate: [null],
      notes: ['']
    });

    // Заполняем форму данными промо-компании
    if (data?.promoCompany) {
      this.promoCompanyForm.patchValue({
        name: data.promoCompany.name,
        description: data.promoCompany.description,
        type: data.promoCompany.type,
        status: data.promoCompany.status,
        budget: data.promoCompany.budget,
        spent: data.promoCompany.spent,
        startDate: data.promoCompany.startDate ? new Date(data.promoCompany.startDate) : null,
        endDate: data.promoCompany.endDate ? new Date(data.promoCompany.endDate) : null,
        notes: data.promoCompany.notes
      });
    }
  }

  currencySymbol() {
    return this.currencyService.currencySymbol();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.promoCompanyForm.valid && this.data?.promoCompany) {
      this.isSubmitting = true;
      const formValue = this.promoCompanyForm.value;

      const updateData = {
        ...formValue,
        startDate: formValue.startDate ? formValue.startDate.toISOString().split('T')[0] : null,
        endDate: formValue.endDate ? formValue.endDate.toISOString().split('T')[0] : null,
      };

      this.promoCompaniesService.update(this.data.promoCompany.id, updateData).subscribe({
        next: (promoCompany) => {
          this.snackBar.open('Промо-компания обновлена успешно', 'Закрыть', { duration: 3000 });
          this.dialogRef.close(promoCompany);
        },
        error: (error) => {
          console.error('Error updating promo company:', error);
          this.snackBar.open('Ошибка обновления промо-компании', 'Закрыть', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'promoter': 'person',
      'affiliate': 'handshake',
      'partner': 'business'
    };
    return icons[type] || 'category';
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'promoter': 'Промоутер',
      'affiliate': 'Партнер',
      'partner': 'Партнер'
    };
    return labels[type] || 'Неизвестный тип';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'draft': 'edit',
      'active': 'play_circle',
      'paused': 'pause_circle',
      'completed': 'check_circle',
      'cancelled': 'cancel'
    };
    return icons[status] || 'flag';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Черновик',
      'active': 'Активна',
      'paused': 'Приостановлена',
      'completed': 'Завершена',
      'cancelled': 'Отменена'
    };
    return labels[status] || 'Неизвестный статус';
  }
}