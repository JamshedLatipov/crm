import { Injectable } from '@nestjs/common';

/**
 * Сервис для получения курсов валют
 */
@Injectable()
export class ExchangeRateService {
  // Кэш курсов валют
  private rates: Record<string, number> = {
    RUB: 1,
    USD: 92.5,
    EUR: 100.2,
    GBP: 117.3,
    TJS: 8.5,
    KZT: 0.19,
    KGS: 1.05,
    UZS: 0.0073,
    UAH: 2.3,
    CNY: 12.8,
    JPY: 0.62,
    CHF: 106.5,
  };

  private lastUpdate: Date = new Date();

  /**
   * Получить курс валюты к RUB
   * @param currency Код валюты
   * @returns Курс к рублю
   */
  getRate(currency: string): number {
    // Если RUB, возвращаем 1
    if (currency === 'RUB') {
      return 1;
    }

    // Возвращаем курс из кэша
    return this.rates[currency] || 1;
  }

  /**
   * Конвертировать сумму из одной валюты в другую
   * @param amount Сумма
   * @param fromCurrency Исходная валюта
   * @param toCurrency Целевая валюта (по умолчанию RUB)
   * @returns Сконвертированная сумма
   */
  convert(amount: number, fromCurrency: string, toCurrency: string = 'RUB'): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const fromRate = this.getRate(fromCurrency);
    const toRate = this.getRate(toCurrency);

    // Конвертация через RUB
    const inRub = amount * fromRate;
    return inRub / toRate;
  }

  /**
   * Обновить курсы валют
   * TODO: Интегрировать с внешним API (например, cbr.ru)
   */
  async updateRates(): Promise<void> {
    // В будущем здесь можно добавить запрос к внешнему API
    this.lastUpdate = new Date();
  }

  /**
   * Получить время последнего обновления
   */
  getLastUpdate(): Date {
    return this.lastUpdate;
  }

  /**
   * Получить все курсы
   */
  getAllRates(): Record<string, number> {
    return { ...this.rates };
  }
}
