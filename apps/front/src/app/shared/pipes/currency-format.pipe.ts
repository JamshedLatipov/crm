import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../../services/currency.service';

/**
 * Pipe для форматирования суммы с символом валюты из настроек
 * Использование: {{ 100.50 | currencyFormat }}
 * Результат: "100.50 ₽" (или другой символ валюты из настроек)
 */
@Pipe({
  name: 'currencyFormat',
  standalone: true,
  pure: false, // Делаем impure чтобы реагировать на изменения в сервисе
})
export class CurrencyFormatPipe implements PipeTransform {
  constructor(private currencyService: CurrencyService) {}

  transform(value: number | string | null | undefined, showSymbol = true): string {
    if (value === null || value === undefined || value === '') {
      return showSymbol ? `0.00 ${this.currencyService.getSymbol()}` : '0.00';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) {
      return showSymbol ? `0.00 ${this.currencyService.getSymbol()}` : '0.00';
    }

    const formatted = numValue.toFixed(2);
    return showSymbol ? `${formatted} ${this.currencyService.getSymbol()}` : formatted;
  }
}
