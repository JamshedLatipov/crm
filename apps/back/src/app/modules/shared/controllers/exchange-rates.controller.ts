import { Controller, Get } from '@nestjs/common';

/**
 * Контроллер для работы с курсами валют
 * В будущем можно интегрировать с внешними API (CBR, ECB, exchangerate-api.com)
 */
@Controller('exchange-rates')
export class ExchangeRatesController {
  
  /**
   * Получить актуальные курсы валют
   * Возвращает курсы относительно рубля (RUB)
   */
  @Get()
  getRates() {
    // Актуальные курсы валют (можно обновлять через cron job)
    return {
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
      lastUpdate: new Date().toISOString()
    };
  }
}
