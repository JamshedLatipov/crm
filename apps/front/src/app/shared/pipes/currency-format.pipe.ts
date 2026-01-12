import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../../services/currency.service';

/**
 * Pipe для форматирования суммы с символом валюты
 * Использование: 
 * - {{ 100.50 | currencyFormat }} - использует валюту из CurrencyService
 * - {{ 100.50 | currencyFormat:'USD' }} - форматирует как USD
 * - {{ 100.50 | currencyFormat:'RUB':false }} - без символа валюты
 * Результат: "100,50 ₽" (для рублей) или "100.50 $" (для долларов)
 */
@Pipe({
  name: 'currencyFormat',
  standalone: true,
  pure: false, // Impure pipe для обновления при изменении данных
})
export class CurrencyFormatPipe implements PipeTransform {
  constructor(private currencyService: CurrencyService) {}

  transform(
    value: number | string | null | undefined, 
    currencyCode?: string,
    showSymbol = true
  ): string {
    // Нормализуем код валюты
    const code = (currencyCode && currencyCode.trim()) ? currencyCode.trim() : this.currencyService.getCode();
    
    if (value === null || value === undefined || value === '') {
      const symbol = this.getCurrencySymbol(code);
      return showSymbol ? `0,00 ${symbol}` : '0,00';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) {
      const symbol = this.getCurrencySymbol(code);
      return showSymbol ? `0,00 ${symbol}` : '0,00';
    }

    const formatted = this.formatCurrency(numValue, code);
    const symbol = this.getCurrencySymbol(code);
    
    return showSymbol ? `${formatted} ${symbol}` : formatted;
  }

  /**
   * Получает символ валюты по коду
   */
  private getCurrencySymbol(currencyCode: string): string {
    const symbols: { [key: string]: string } = {
      'RUB': '₽',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'TJS': 'смн',
      'KZT': '₸',
      'KGS': 'сом',
      'UZS': 'сўм',
    };
    return symbols[currencyCode] || currencyCode;
  }

  /**
   * Форматирует число в зависимости от валюты
   * @param value Числовое значение
   * @param currencyCode Код валюты (RUB, USD, TJS и т.д.)
   * @returns Отформатированная строка
   */
  private formatCurrency(value: number, currencyCode: string): string {
    // Определяем количество десятичных знаков для каждой валюты
    const decimalPlaces = this.getDecimalPlaces(currencyCode);
    
    // Для русских валют используем ручное форматирование с пробелами и запятыми
    const ruLocale = ['RUB', 'UAH', 'KZT', 'KGS', 'UZS', 'TJS'];
    
    if (ruLocale.includes(currencyCode)) {
      return this.manualFormatRu(value, decimalPlaces);
    }
    
    // Для остальных валют используем стандартное форматирование
    try {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
        useGrouping: true,
      }).format(value);
    } catch (e) {
      return this.manualFormatEn(value, decimalPlaces);
    }
  }

  /**
   * Получает количество десятичных знаков для валюты
   */
  private getDecimalPlaces(currencyCode: string): number {
    // Валюты с 2 десятичными знаками (копейки, центы, дирамы и т.д.)
    const twoDecimals = ['RUB', 'USD', 'EUR', 'GBP', 'TJS', 'CHF', 'UAH', 'KZT', 'KGS'];
    
    // Валюты без десятичных знаков
    const noDecimals = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'PYG'];
    
    // Валюты с 3 десятичными знаками
    const threeDecimals = ['BHD', 'IQD', 'JOD', 'KWD', 'OMR', 'TND'];
    
    if (noDecimals.includes(currencyCode)) {
      return 0;
    } else if (threeDecimals.includes(currencyCode)) {
      return 3;
    } else {
      return 2; // По умолчанию 2 десятичных знака
    }
  }

  /**
   * Ручное форматирование для русских валют (пробел + запятая)
   * Формат: 10 000,00
   */
  private manualFormatRu(value: number, decimalPlaces: number): string {
    const fixed = value.toFixed(decimalPlaces);
    const [intPart, decPart] = fixed.split('.');
    
    // Добавляем обычные пробелы как разделители тысяч
    const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    if (decimalPlaces > 0 && decPart) {
      return `${withSeparators},${decPart}`;
    }
    
    return withSeparators;
  }

  /**
   * Ручное форматирование для английских валют (запятая + точка)
   * Формат: 10,000.00
   */
  private manualFormatEn(value: number, decimalPlaces: number): string {
    const fixed = value.toFixed(decimalPlaces);
    const [intPart, decPart] = fixed.split('.');
    
    // Добавляем запятые как разделители тысяч
    const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    if (decimalPlaces > 0 && decPart) {
      return `${withSeparators}.${decPart}`;
    }
    
    return withSeparators;
  }
}
