import { Injectable, signal } from '@angular/core';
import { SettingService } from '../messages/services/setting.service';
import { forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Глобальный сервис для работы с валютой
 * Кэширует настройки валюты и предоставляет удобный API
 */
@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  // Signals для реактивного доступа
  currencySymbol = signal<string>('₽');
  currencyCode = signal<string>('RUB');
  
  private loaded = false;

  constructor(private settingService: SettingService) {
    this.loadCurrencySettings();
  }

  /**
   * Загрузить настройки валюты из API
   */
  loadCurrencySettings() {
    if (this.loaded) return;

    forkJoin({
      symbol: this.settingService.findByKey('CURRENCY_SYMBOL'),
      code: this.settingService.findByKey('DEFAULT_CURRENCY'),
    }).subscribe({
      next: (settings) => {
        if (settings.symbol?.value) {
          this.currencySymbol.set(settings.symbol.value);
        }
        if (settings.code?.value) {
          this.currencyCode.set(settings.code.value);
        }
        this.loaded = true;
      },
      error: (error) => {
        console.error('Error loading currency settings:', error);
        // Используем значения по умолчанию
        this.loaded = true;
      },
    });
  }

  /**
   * Принудительно перезагрузить настройки валюты
   */
  reload() {
    this.loaded = false;
    this.loadCurrencySettings();
  }

  /**
   * Форматировать сумму с символом валюты
   * @param amount Сумма
   * @param showSymbol Показывать символ валюты
   * @returns Отформатированная строка
   */
  formatAmount(amount: number | string, showSymbol = true): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formatted = numAmount.toFixed(2);
    
    return showSymbol ? `${formatted} ${this.currencySymbol()}` : formatted;
  }

  /**
   * Получить символ валюты
   */
  getSymbol(): string {
    return this.currencySymbol();
  }

  /**
   * Получить код валюты
   */
  getCode(): string {
    return this.currencyCode();
  }
}
