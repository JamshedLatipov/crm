import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Setting, SettingCategory } from '../../models/setting.models';

export interface SettingDialogData {
  setting?: Setting;
  category?: SettingCategory;
}

@Component({
  selector: 'app-setting-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ isEditMode() ? 'Редактировать настройку' : 'Новая настройка' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="setting-form">
        <mat-form-field appearance="outline">
          <mat-label>Ключ</mat-label>
          <input
            matInput
            formControlName="key"
            placeholder="SMS_API_KEY"
            [readonly]="isEditMode()"
          />
          <mat-hint>Уникальное имя настройки (например: SMS_API_KEY)</mat-hint>
          <mat-error *ngIf="form.get('key')?.hasError('required')">
            Обязательное поле
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Значение</mat-label>
          <input
            matInput
            formControlName="value"
            [type]="showValue() ? 'text' : 'password'"
            placeholder="Введите значение"
          />
          <button
            mat-icon-button
            matSuffix
            type="button"
            (click)="toggleValueVisibility()"
            *ngIf="form.get('isSecret')?.value"
          >
            <mat-icon>{{ showValue() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Категория</mat-label>
          <mat-select formControlName="category">
            <mat-option [value]="SettingCategory.SMS">SMS</mat-option>
            <mat-option [value]="SettingCategory.EMAIL">Email</mat-option>
            <mat-option [value]="SettingCategory.WHATSAPP">WhatsApp</mat-option>
            <mat-option [value]="SettingCategory.TELEGRAM">Telegram</mat-option>
            <mat-option [value]="SettingCategory.WEBHOOK">Webhook</mat-option>
            <mat-option [value]="SettingCategory.CAMPAIGN">Кампании</mat-option>
            <mat-option [value]="SettingCategory.NOTIFICATION">Уведомления</mat-option>
            <mat-option [value]="SettingCategory.FEATURE">Функции</mat-option>
            <mat-option [value]="SettingCategory.GENERAL">Общие</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('category')?.hasError('required')">
            Выберите категорию
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Описание</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="3"
            placeholder="Описание настройки"
          ></textarea>
        </mat-form-field>

        <div class="checkboxes">
          <mat-checkbox formControlName="isSecret">Секретное значение</mat-checkbox>
          <mat-checkbox formControlName="isEncrypted">Шифровать</mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Отмена</button>
      <button
        mat-raised-button
        color="primary"
        (click)="save()"
        [disabled]="form.invalid"
      >
        {{ isEditMode() ? 'Сохранить' : 'Создать' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .setting-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 500px;
        padding: 16px 0;
      }

      .checkboxes {
        display: flex;
        gap: 24px;
      }

      mat-dialog-content {
        overflow: visible;
      }
    `,
  ],
})
export class SettingDialogComponent implements OnInit {
  form!: FormGroup;
  isEditMode = signal(false);
  showValue = signal(false);
  SettingCategory = SettingCategory;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SettingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SettingDialogData
  ) {}

  ngOnInit() {
    this.isEditMode.set(!!this.data.setting);

    this.form = this.fb.group({
      key: [
        { value: this.data.setting?.key || '', disabled: this.isEditMode() },
        Validators.required,
      ],
      value: [this.data.setting?.value || '', Validators.required],
      category: [
        this.data.setting?.category || this.data.category || SettingCategory.GENERAL,
        Validators.required,
      ],
      description: [this.data.setting?.description || ''],
      isSecret: [this.data.setting?.isSecret || false],
      isEncrypted: [this.data.setting?.isEncrypted || false],
    });
  }

  toggleValueVisibility() {
    this.showValue.set(!this.showValue());
  }

  save() {
    if (this.form.valid) {
      const formValue = this.form.getRawValue(); // getRawValue to include disabled fields
      this.dialogRef.close(formValue);
    }
  }
}
