# Forecasting Module

## Описание
Полнофункциональный модуль прогнозирования продаж с поддержкой 6 алгоритмов, периодического анализа и сравнения факта с прогнозом.

## Основные возможности

### Типы прогнозов
- **REVENUE** - Прогноз выручки
- **DEALS** - Прогноз количества сделок
- **CONVERSIONS** - Прогноз конверсий
- **CUSTOM** - Кастомные метрики

### Методы прогнозирования

#### 1. Linear Trend (Линейный тренд)
Прогнозирует на основе линейной регрессии исторических данных. Подходит для стабильного роста/падения.

#### 2. Weighted Average (Взвешенное среднее)
Использует взвешенное среднее с большим весом для последних периодов. Подходит для учета последних трендов.

#### 3. Pipeline Conversion (Конверсия воронки)
Прогноз на основе исторической конверсии воронки продаж. Учитывает среднюю конверсию и размер сделки.

#### 4. Moving Average (Скользящее среднее)
Использует среднее по последним N периодам. Подходит для сглаживания колебаний.

#### 5. Exponential Smoothing (Экспоненциальное сглаживание)
Применяет экспоненциальное сглаживание для более точного прогноза. Подходит для сезонных данных.

#### 6. Historical Average (Историческое среднее)
Простое среднее по всем историческим периодам. Базовый метод для начальных оценок.

### Периоды прогнозирования
- **DAILY** - Ежедневный прогноз
- **WEEKLY** - Еженедельный прогноз
- **MONTHLY** - Ежемесячный прогноз
- **QUARTERLY** - Квартальный прогноз
- **YEARLY** - Годовой прогноз

### Статусы прогноза
- **DRAFT** - Черновик
- **ACTIVE** - Активный прогноз
- **COMPLETED** - Завершенный
- **ARCHIVED** - Архивный

## API Endpoints

### Управление прогнозами

```bash
# Создать прогноз
POST /api/forecasting
{
  "name": "Q1 2026 Revenue Forecast",
  "description": "Revenue forecast for first quarter",
  "type": "revenue",
  "method": "linear_trend",
  "periodType": "monthly",
  "startDate": "2026-01-01",
  "endDate": "2026-03-31",
  "targetValue": 1000000,
  "ownerId": "user-uuid",
  "team": "Sales Team"
}

# Получить все прогнозы с фильтрацией
GET /api/forecasting?type=revenue&status=active&page=1&limit=20

# Получить прогноз по ID
GET /api/forecasting/:id

# Обновить прогноз
PUT /api/forecasting/:id
{
  "status": "active",
  "targetValue": 1200000
}

# Удалить прогноз
DELETE /api/forecasting/:id
```

### Расчеты и периоды

```bash
# Рассчитать прогноз
POST /api/forecasting/:id/calculate?includeHistorical=true

# Получить периоды прогноза
GET /api/forecasting/:id/periods

# Обновить фактическое значение периода
PUT /api/forecasting/periods/:periodId/actual
{
  "actualValue": 85000,
  "metrics": {
    "dealsCount": 45,
    "leadsCount": 220,
    "conversionRate": 20.45,
    "averageDealSize": 1888.89,
    "winRate": 35.5
  },
  "notes": "Strong performance this month"
}

# Получить сравнение (цель vs прогноз vs факт)
GET /api/forecasting/:id/comparison
```

## Структура данных

### Forecast
- `id` - UUID прогноза
- `name` - Название
- `type` - Тип прогноза (revenue, deals, conversions, custom)
- `method` - Метод расчета
- `periodType` - Тип периода (daily, weekly, monthly, quarterly, yearly)
- `status` - Статус (draft, active, completed, archived)
- `startDate` / `endDate` - Период прогноза
- `targetValue` - Целевое значение
- `actualValue` - Фактическое значение
- `predictedValue` - Прогнозируемое значение
- `confidence` - Уверенность (0-100%)
- `accuracy` - Точность (0-100%)
- `calculationResults` - Результаты расчета
- `owner` - Владелец прогноза
- `team` - Команда
- `tags` - Теги для группировки

### ForecastPeriod
- `id` - UUID периода
- `forecastId` - ID прогноза
- `periodStart` / `periodEnd` - Границы периода
- `periodLabel` - Название периода ("Q1 2026", "January 2026", etc.)
- `targetValue` - Целевое значение периода
- `actualValue` - Фактическое значение
- `predictedValue` - Прогнозируемое значение
- `minValue` - Пессимистичный сценарий
- `maxValue` - Оптимистичный сценарий
- `confidence` - Уверенность прогноза
- `variance` - Отклонение от прогноза
- `metrics` - Дополнительные метрики (dealsCount, leadsCount, conversionRate, etc.)

## Примеры использования

### Создание прогноза выручки на квартал

```typescript
const forecast = await forecastingService.create({
  name: 'Q1 2026 Revenue',
  type: ForecastType.REVENUE,
  method: ForecastMethod.LINEAR_TREND,
  periodType: ForecastPeriodType.MONTHLY,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-03-31'),
  targetValue: 1500000,
  ownerId: 'user-uuid',
});

// Система автоматически создаст 3 периода (январь, февраль, март)
```

### Расчет прогноза

```typescript
// Рассчитать прогноз на основе выбранного метода
const calculatedForecast = await forecastingService.calculate(forecast.id);

console.log('Predicted total:', calculatedForecast.predictedValue);
console.log('Confidence:', calculatedForecast.confidence);
```

### Обновление фактических данных

```typescript
// По окончании месяца вносим фактические данные
const periods = await forecastingService.getPeriods(forecast.id);
const januaryPeriod = periods[0];

await forecastingService.updatePeriodActual(januaryPeriod.id, {
  actualValue: 520000,
  metrics: {
    dealsCount: 48,
    leadsCount: 240,
    conversionRate: 20,
    averageDealSize: 10833,
    winRate: 36,
  },
});

// Система автоматически пересчитает точность прогноза
```

### Получение сравнения

```typescript
const comparison = await forecastingService.getComparison(forecast.id);

comparison.periods.forEach(period => {
  console.log(`${period.periodLabel}:`);
  console.log(`  Target: ${period.target}`);
  console.log(`  Predicted: ${period.predicted}`);
  console.log(`  Actual: ${period.actual}`);
  console.log(`  Variance: ${period.variance}%`);
});
```

## Интеграция с другими модулями

### С модулем Deals
```typescript
// Используйте данные из сделок для прогнозирования
const dealsData = await dealsService.getStatistics(startDate, endDate);
// Передайте в algorithmParams при создании прогноза
```

### С модулем Analytics
```typescript
// Получите исторические данные для улучшения точности
const analyticsData = await analyticsService.getRevenueHistory();
// Используйте в методе calculatePipelineConversion
```

## Преимущества

✅ **6 алгоритмов прогнозирования** - выбирайте оптимальный для вашей ситуации
✅ **Автоматическое создание периодов** - система сама разбивает прогноз на периоды
✅ **Отслеживание точности** - автоматический расчет точности при внесении фактов
✅ **Сценарии прогноза** - пессимистичный, реалистичный, оптимистичный
✅ **Метрики периодов** - храните детальную информацию по каждому периоду
✅ **Уверенность прогноза** - каждый прогноз имеет уровень уверенности
✅ **Сравнение плана с фактом** - удобный endpoint для анализа

## Статус реализации

✅ **Сущности** - Forecast, ForecastPeriod
✅ **Алгоритмы** - 6 методов прогнозирования
✅ **API** - Полный набор endpoints
✅ **Периоды** - Автогенерация и управление
✅ **Расчеты** - Прогнозирование и точность
✅ **Документация** - Детальное описание

## Следующие шаги

- [ ] Интеграция с модулем ML/AI для продвинутых алгоритмов
- [ ] Frontend компоненты для визуализации прогнозов
- [ ] Экспорт прогнозов в Excel/PDF
- [ ] Уведомления при отклонении факта от прогноза
- [ ] Сравнение нескольких прогнозов
- [ ] API для внешних систем BI
