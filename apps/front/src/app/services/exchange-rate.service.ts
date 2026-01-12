import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

/**
 * Сервис для получения и кэширования курсов валют
 */
@Injectable({
  providedIn: 'root',
})
export class ExchangeRateService {
  // Кэш курсов валют относительно базовой валюты
  private rates = signal<Record<string, number>>({});
  private baseCurrency = 'RUB'; // Базовая валюта для конвертации
  private lastUpdate: Date | null = null;
  private cacheLifetime = 1000 * 60 * 60; // 1 час

  // Актуальные курсы валют (примерные, обновляются раз в день)
  private defaultRates: Record<string, number> = {
    // Относительно рубля (RUB = 1)
    RUB: 1,
    USD: 92.5,      // 1 USD = 92.5 RUB
    EUR: 100.2,     // 1 EUR = 100.2 RUB
    GBP: 117.3,     // 1 GBP = 117.3 RUB
    TJS: 8.5,       // 1 TJS = 8.5 RUB
    KZT: 0.19,      // 1 KZT = 0.19 RUB
    KGS: 1.05,      // 1 KGS = 1.05 RUB
    UZS: 0.0073,    // 1 UZS = 0.0073 RUB
    UAH: 2.3,       // 1 UAH = 2.3 RUB
    CNY: 12.8,      // 1 CNY = 12.8 RUB
    JPY: 0.62,      // 1 JPY = 0.62 RUB
    CHF: 106.5,     // 1 CHF = 106.5 RUB
  };

  constructor(private http: HttpClient) {
    this.initializeRates();
  }

  /**
   * Инициализация курсов валют
   */
  private initializeRates() {
    this.rates.set(this.defaultRates);
    this.lastUpdate = new Date();
  }

  /**
   * Получить курсы валют (обновляет если устарели)
   */
  getRates(): Observable<Record<string, number>> {
    const now = new Date();
    const needsUpdate = !this.lastUpdate || 
      (now.getTime() - this.lastUpdate.getTime() > this.cacheLifetime);

    if (needsUpdate) {
      return this.updateRates();
    }

    return of(this.rates());
  }

  /**
   * Обновить курсы валют с сервера
   * TODO: Интегрировать с реальным API курсов валют (например, cbr.ru или exchangerate-api.com)
   */
  private updateRates(): Observable<Record<string, number>> {
    // В будущем здесь можно добавить запрос к API
    // Например: return this.http.get<Record<string, number>>('/api/exchange-rates')
    
    // Пока используем дефолтные значения
    this.rates.set(this.defaultRates);
    this.lastUpdate = new Date();
    return of(this.rates());
  }

  /**
   * Конвертировать сумму из одной валюты в другую
   * @param amount Сумма
   * @param fromCurrency Исходная валюта
   * @param toCurrency Целевая валюта (по умолчанию базовая)
   * @returns Сконвертированная сумма
   */
  convert(amount: number, fromCurrency: string, toCurrency: string = this.baseCurrency): number {
    if (!amount || amount === 0) {
      return 0;
    }

    // Если валюты одинаковые, возвращаем как есть
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = this.rates();
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    // Конвертация через базовую валюту
    // Сначала конвертируем в базовую валюту, потом в целевую
    const inBaseCurrency = amount * fromRate;
    const result = inBaseCurrency / toRate;

    return result;
  }

  /**
   * Конвертировать все суммы в массиве в базовую валюту
   * @param items Массив объектов с полями amount и currency
   * @returns Массив с конвертированными суммами
   */
  convertToBaseCurrency<T extends { amount: number; currency: string }>(
    items: T[]
  ): Array<T & { convertedAmount: number }> {
    return items.map(item => ({
      ...item,
      convertedAmount: this.convert(item.amount, item.currency, this.baseCurrency)
    }));
  }

  /**
   * Получить базовую валюту
   */
  getBaseCurrency(): string {
    return this.baseCurrency;
  }

  /**
   * Установить базовую валюту
   */
  setBaseCurrency(currency: string) {
    this.baseCurrency = currency;
  }

  /**
   * Получить курс валюты относительно базовой
   */
  getRate(currency: string): number {
    return this.rates()[currency] || 1;
  }

  /**
   * Вручную обновить курс валюты
   */
  updateRate(currency: string, rate: number) {
    const currentRates = this.rates();
    this.rates.set({
      ...currentRates,
      [currency]: rate
    });
  }

  /**
   * Форматировать конвертированную сумму с пояснением
   * @param amount Сумма
   * @param fromCurrency Исходная валюта
   * @param toCurrency Целевая валюта
   */
  formatConversion(amount: number, fromCurrency: string, toCurrency: string = this.baseCurrency): string {
    const converted = this.convert(amount, fromCurrency, toCurrency);
    const rate = this.getRate(fromCurrency);
    
    if (fromCurrency === toCurrency) {
      return `${amount.toFixed(2)} ${fromCurrency}`;
    }
    
    return `${amount.toFixed(2)} ${fromCurrency} ≈ ${converted.toFixed(2)} ${toCurrency} (курс: ${rate.toFixed(4)})`;
  }
}
