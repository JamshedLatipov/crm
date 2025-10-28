import { Component, Inject } from '@angular/core';
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
import { PromoCompaniesService } from '../../services/promo-companies.service';
import { CreatePromoCompanyRequest } from '../../models/promo-company.model';

@Component({
  selector: 'app-create-promo-company-dialog',
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
  ],
  template: `
    <h2 mat-dialog-title>Создать промо-компанию</h2>
    <mat-dialog-content>
      <form [formGroup]="promoCompanyForm" class="promo-company-form">
        <mat-form-field appearance="outline">
          <mat-label>Название</mat-label>
          <input matInput formControlName="name" required>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Описание</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Тип</mat-label>
          <mat-select formControlName="type">
            <mat-option value="promoter">Промоутер</mat-option>
            <mat-option value="affiliate">Партнер</mat-option>
            <mat-option value="partner">Партнер</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Бюджет</mat-label>
          <input matInput type="number" formControlName="budget">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Дата начала</mat-label>
          <input matInput [matDatepicker]="startPicker" formControlName="startDate">
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Дата окончания</mat-label>
          <input matInput [matDatepicker]="endPicker" formControlName="endDate">
          <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Заметки</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Отмена</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="promoCompanyForm.invalid || isSubmitting">
        {{ isSubmitting ? 'Создание...' : 'Создать' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .promo-company-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
    }
  `]
})
export class CreatePromoCompanyDialogComponent {
  promoCompanyForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private promoCompaniesService: PromoCompaniesService,
    private dialogRef: MatDialogRef<CreatePromoCompanyDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.promoCompanyForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      type: ['promoter'],
      budget: [null],
      startDate: [null],
      endDate: [null],
      notes: ['']
    });
  }

  onSubmit(): void {
    if (this.promoCompanyForm.valid) {
      this.isSubmitting = true;
      const formValue = this.promoCompanyForm.value;

      const request: CreatePromoCompanyRequest = {
        ...formValue,
        startDate: formValue.startDate ? formValue.startDate.toISOString().split('T')[0] : undefined,
        endDate: formValue.endDate ? formValue.endDate.toISOString().split('T')[0] : undefined,
      };

      this.promoCompaniesService.create(request).subscribe({
        next: (promoCompany) => {
          this.snackBar.open('Промо-компания создана успешно', 'Закрыть', { duration: 3000 });
          this.dialogRef.close(promoCompany);
        },
        error: (error) => {
          console.error('Error creating promo company:', error);
          this.snackBar.open('Ошибка создания промо-компании', 'Закрыть', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }
}