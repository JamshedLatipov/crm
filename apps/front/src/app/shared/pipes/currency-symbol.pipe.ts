import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../../services/currency.service';

/**
 * Pipe для получения символа валюты из настроек
 * Использование: {{ 'label' | currencySymbol }}
 * Результат: "label ₽" (или другой символ валюты из настроек)
 */
@Pipe({
  name: 'currencySymbol',
  standalone: true,
  pure: false, // Делаем impure чтобы реагировать на изменения в сервисе
})
export class CurrencySymbolPipe implements PipeTransform {
  constructor(private currencyService: CurrencyService) {}

  transform(value?: string): string {
    const symbol = this.currencyService.getSymbol();
    return value ? `${value} ${symbol}` : symbol;
  }
}
