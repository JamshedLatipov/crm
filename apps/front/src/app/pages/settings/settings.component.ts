import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { SettingService } from '../../messages/services/setting.service';
import { CurrencyService } from '../../services/currency.service';
import { CurrencySymbolPipe } from '../../shared/pipes/currency-symbol.pipe';
import { forkJoin } from 'rxjs';

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
    MatTooltipModule,
    ReactiveFormsModule,
    PageLayoutComponent,
    CurrencySymbolPipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  loading = signal(false);
  
  // Формы для разных категорий настроек
  campaignPricingForm!: FormGroup;
  generalSettingsForm!: FormGroup;
  currencySettingsForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private settingService: SettingService,
    public currencyService: CurrencyService
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

    // Форма настроек валюты
    this.currencySettingsForm = this.fb.group({
      defaultCurrency: [this.currencyService.currencyCode(), Validators.required],
      currencySymbol: [this.currencyService.currencySymbol(), Validators.required],
    });
  }

  loadSettings() {
    this.loading.set(true);
    
    forkJoin({
      smsCost: this.settingService.findByKey('SMS_COST_PER_MESSAGE'),
      emailCost: this.settingService.findByKey('EMAIL_COST_PER_MESSAGE'),
      whatsappCost: this.settingService.findByKey('WHATSAPP_COST_PER_MESSAGE'),
      telegramCost: this.settingService.findByKey('TELEGRAM_COST_PER_MESSAGE'),
      defaultCurrency: this.settingService.findByKey('DEFAULT_CURRENCY'),
      currencySymbol: this.settingService.findByKey('CURRENCY_SYMBOL'),
    }).subscribe({
      next: (settings) => {
        // Заполняем форму цен кампаний
        this.campaignPricingForm.patchValue({
          smsCost: settings.smsCost?.value || '1.50',
          emailCost: settings.emailCost?.value || '0.05',
          whatsappCost: settings.whatsappCost?.value || '0.80',
          telegramCost: settings.telegramCost?.value || '0.00',
        });

        // Заполняем форму валюты
        this.currencySettingsForm.patchValue({
          defaultCurrency: settings.defaultCurrency?.value || 'RUB',
            currencySymbol: settings.currencySymbol?.value || this.currencyService.currencySymbol(),
        });

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.snackBar.open('Ошибка загрузки настроек', 'Закрыть', {
          duration: 3000,
        });
        this.loading.set(false);
      },
    });
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
    
    const updates = [
      { key: 'SMS_COST_PER_MESSAGE', value: values.smsCost },
      { key: 'EMAIL_COST_PER_MESSAGE', value: values.emailCost },
      { key: 'WHATSAPP_COST_PER_MESSAGE', value: values.whatsappCost },
      { key: 'TELEGRAM_COST_PER_MESSAGE', value: values.telegramCost },
    ];

    this.settingService.bulkUpdate(updates).subscribe({
      next: () => {
        this.snackBar.open('Настройки цен сохранены', 'Закрыть', {
          duration: 3000,
        });
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error saving campaign pricing:', error);
        this.snackBar.open(
          error.error?.message || 'Ошибка сохранения настроек',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
    });
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
    this.loadSettings();
  }

  saveCurrencySettings() {
    if (this.currencySettingsForm.invalid) {
      this.snackBar.open('Пожалуйста, заполните все поля корректно', 'Закрыть', {
        duration: 3000,
      });
      return;
    }

    this.loading.set(true);
    const values = this.currencySettingsForm.value;
    
    const updates = [
      { key: 'DEFAULT_CURRENCY', value: values.defaultCurrency },
      { key: 'CURRENCY_SYMBOL', value: values.currencySymbol },
    ];

    this.settingService.bulkUpdate(updates).subscribe({
      next: () => {
        this.snackBar.open('Настройки валюты сохранены', 'Закрыть', {
          duration: 3000,
        });
        // Перезагрузить настройки валюты в CurrencyService
        this.currencyService.reload();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error saving currency settings:', error);
        this.snackBar.open(
          error.error?.message || 'Ошибка сохранения настроек',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
    });
  }

  resetCurrencySettings() {
    this.loadSettings();
  }

  initializeDefaults() {
    if (!confirm('Инициализировать настройки из .env файла? Существующие настройки НЕ будут перезаписаны.')) {
      return;
    }

    this.loading.set(true);
    this.settingService.initializeDefaults().subscribe({
      next: () => {
        this.snackBar.open('Настройки инициализированы', 'Закрыть', {
          duration: 3000,
        });
        this.loadSettings();
      },
      error: (error) => {
        console.error('Error initializing defaults:', error);
        this.snackBar.open(
          error.error?.message || 'Ошибка инициализации настроек',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
    });
  }
}
