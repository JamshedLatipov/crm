import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    PageLayoutComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  loading = signal(false);
  
  // Формы для разных категорий настроек
  campaignPricingForm!: FormGroup;
  generalSettingsForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.initForms();
    this.loadSettings();
  }

  initForms() {
    // Форма цен кампаний
    this.campaignPricingForm = this.fb.group({
      smsCost: ['1.50', [Validators.required, Validators.min(0)]],
      emailCost: ['0.05', [Validators.required, Validators.min(0)]],
      whatsappCost: ['0.80', [Validators.required, Validators.min(0)]],
      telegramCost: ['0.00', [Validators.required, Validators.min(0)]],
    });

    // Форма общих настроек
    this.generalSettingsForm = this.fb.group({
      companyName: ['', Validators.required],
      companyEmail: ['', [Validators.required, Validators.email]],
      companyPhone: [''],
      timezone: ['Europe/Moscow'],
    });
  }

  loadSettings() {
    this.loading.set(true);
    // TODO: Загрузить настройки из API
    // Пока просто имитируем загрузку
    setTimeout(() => {
      this.loading.set(false);
    }, 500);
  }

  saveCampaignPricing() {
    if (this.campaignPricingForm.invalid) {
      this.snackBar.open('Пожалуйста, заполните все поля корректно', 'Закрыть', {
        duration: 3000,
      });
      return;
    }

    this.loading.set(true);
    const values = this.campaignPricingForm.value;
    
    // TODO: Сохранить настройки через API
    console.log('Saving campaign pricing:', values);
    
    setTimeout(() => {
      this.loading.set(false);
      this.snackBar.open('Настройки цен сохранены', 'Закрыть', {
        duration: 3000,
      });
    }, 500);
  }

  saveGeneralSettings() {
    if (this.generalSettingsForm.invalid) {
      this.snackBar.open('Пожалуйста, заполните все поля корректно', 'Закрыть', {
        duration: 3000,
      });
      return;
    }

    this.loading.set(true);
    const values = this.generalSettingsForm.value;
    
    // TODO: Сохранить настройки через API
    console.log('Saving general settings:', values);
    
    setTimeout(() => {
      this.loading.set(false);
      this.snackBar.open('Общие настройки сохранены', 'Закрыть', {
        duration: 3000,
      });
    }, 500);
  }

  resetCampaignPricing() {
    this.campaignPricingForm.patchValue({
      smsCost: '1.50',
      emailCost: '0.05',
      whatsappCost: '0.80',
      telegramCost: '0.00',
    });
  }
}
