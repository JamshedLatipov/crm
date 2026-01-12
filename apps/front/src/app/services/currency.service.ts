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
    
    if (isNaN(numAmount)) {
      return showSymbol ? `0,00 ${this.currencySymbol()}` : '0,00';
    }
    
    const currencyCode = this.currencyCode();
    const decimalPlaces = this.getDecimalPlaces(currencyCode);
    const locale = this.getLocale(currencyCode);
    
    try {
      const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
        useGrouping: true,
      }).format(numAmount);
      
      return showSymbol ? `${formatted} ${this.currencySymbol()}` : formatted;
    } catch (e) {
      // Fallback
      const fixed = numAmount.toFixed(decimalPlaces);
      return showSymbol ? `${fixed} ${this.currencySymbol()}` : fixed;
    }
  }

  /**
   * Получает количество десятичных знаков для валюты
   */
  private getDecimalPlaces(currencyCode: string): number {
    const twoDecimals = ['RUB', 'USD', 'EUR', 'GBP', 'TJS', 'CHF', 'UAH', 'KZT', 'KGS', 'UZS'];
    const noDecimals = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'PYG'];
    const threeDecimals = ['BHD', 'IQD', 'JOD', 'KWD', 'OMR', 'TND'];
    
    if (noDecimals.includes(currencyCode)) {
      return 0;
    } else if (threeDecimals.includes(currencyCode)) {
      return 3;
    }
    return 2;
  }

  /**
   * Получает локаль для форматирования чисел
   */
  private getLocale(currencyCode: string): string {
    const ruLocale = ['RUB', 'UAH', 'KZT', 'KGS', 'UZS', 'TJS'];
    return ruLocale.includes(currencyCode) ? 'ru-RU' : 'en-US';
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
