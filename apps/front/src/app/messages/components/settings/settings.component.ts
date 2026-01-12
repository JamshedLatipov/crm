import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';
import { MessageBackButtonComponent } from '../shared/message-back-button/message-back-button.component';
import { SettingService } from '../../services/setting.service';
import { Setting, SettingCategory } from '../../models/setting.models';
import { SettingDialogComponent } from './setting-dialog.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    PageLayoutComponent,
    MessageBackButtonComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  loading = signal(false);
  settings = signal<Setting[]>([]);
  
  // Категории для вкладок
  categories = [
    { value: SettingCategory.SMS, label: 'SMS', icon: 'sms' },
    { value: SettingCategory.EMAIL, label: 'Email', icon: 'email' },
    { value: SettingCategory.WHATSAPP, label: 'WhatsApp', icon: 'chat' },
    { value: SettingCategory.TELEGRAM, label: 'Telegram', icon: 'send' },
    { value: SettingCategory.WEBHOOK, label: 'Webhook', icon: 'webhook' },
    { value: SettingCategory.FEATURE, label: 'Функции', icon: 'toggle_on' },
  ];

  constructor(
    private settingService: SettingService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.settingService.findAll().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loading.set(false);
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка загрузки настроек',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
    });
  }

  getSettingsByCategory(category: SettingCategory): Setting[] {
    return this.settings().filter((s) => s.category === category);
  }

  initializeDefaults() {
    this.loading.set(true);
    this.settingService.initializeDefaults().subscribe({
      next: () => {
        this.snackBar.open('Настройки по умолчанию инициализированы', 'Закрыть', {
          duration: 3000,
        });
        this.loadSettings();
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка инициализации',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(category?: SettingCategory) {
    const dialogRef = this.dialog.open(SettingDialogComponent, {
      width: '600px',
      data: { category },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createSetting(result);
      }
    });
  }

  openEditDialog(setting: Setting) {
    const dialogRef = this.dialog.open(SettingDialogComponent, {
      width: '600px',
      data: { setting },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateSetting(setting.key, result);
      }
    });
  }

  createSetting(data: any) {
    this.loading.set(true);
    this.settingService.create(data).subscribe({
      next: () => {
        this.snackBar.open('Настройка создана', 'Закрыть', { duration: 3000 });
        this.loadSettings();
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка создания настройки',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
    });
  }

  updateSetting(key: string, data: any) {
    this.loading.set(true);
    this.settingService.update(key, data).subscribe({
      next: () => {
        this.snackBar.open('Настройка обновлена', 'Закрыть', { duration: 3000 });
        this.loadSettings();
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || 'Ошибка обновления настройки',
          'Закрыть',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
    });
  }

  deleteSetting(key: string) {
    if (confirm(`Удалить настройку ${key}?`)) {
      this.loading.set(true);
      this.settingService.delete(key).subscribe({
        next: () => {
          this.snackBar.open('Настройка удалена', 'Закрыть', { duration: 3000 });
          this.loadSettings();
        },
        error: (error) => {
          this.snackBar.open(
            error.error?.message || 'Ошибка удаления настройки',
            'Закрыть',
            { duration: 5000 }
          );
          this.loading.set(false);
        },
      });
    }
  }
}
