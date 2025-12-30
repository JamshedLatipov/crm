# Frontend: Forecasting (Прогнозирование)

## Назначение
UI модуль для работы с прогнозами продаж, визуализацией трендов и анализом точности прогнозов.

## Ключевые возможности
- Просмотр списка прогнозов с фильтрацией
- Создание новых прогнозов (TODO)
- Детальный просмотр с графиками (TODO)
- Сравнение цели, прогноза и факта
- Пересчет прогнозов
- Сводная статистика

## Компоненты

### ForecastingDashboardComponent
**Путь:** `forecasting-dashboard/`
**Описание:** Главная страница модуля прогнозирования

**Функционал:**
- Таблица всех прогнозов
- Сводные карточки (количество, средняя уверенность, точность)
- Действия: просмотр, пересчет, удаление
- Цветовая индикация статусов и метрик

**Колонки таблицы:**
- Название и описание
- Тип прогноза
- Метод расчета
- Период
- Цель / Прогноз / Факт
- Уверенность
- Статус
- Действия

### TODO Компоненты
- `ForecastFormComponent` - Форма создания/редактирования прогноза
- `ForecastDetailComponent` - Детальный просмотр с графиками
- `ForecastComparisonComponent` - Сравнение нескольких прогнозов

## Сервисы

### ForecastingService
**Путь:** `services/forecasting.service.ts`

**Методы:**
- `getForecasts(params?)` - Получение списка с фильтрацией
- `getForecast(id)` - Получение по ID
- `createForecast(dto)` - Создание нового прогноза
- `updateForecast(id, dto)` - Обновление прогноза
- `deleteForecast(id)` - Удаление прогноза
- `calculateForecast(id)` - Пересчет прогноза
- `getPeriods(forecastId)` - Получение периодов
- `updatePeriodActual(periodId, value, metrics)` - Обновление фактических данных
- `getComparison(forecastId)` - Получение сравнения

**Утилиты:**
- `formatCurrency(value)` - Форматирование валюты
- `formatPercentage(value)` - Форматирование процентов
- `getConfidenceColor(confidence)` - Цвет для уверенности
- `getVarianceColor(variance)` - Цвет для отклонения

## Модели

### Enums
- `ForecastType` - revenue, deals, conversions, custom
- `ForecastMethod` - 6 методов прогнозирования
- `ForecastPeriodType` - daily, weekly, monthly, quarterly, yearly
- `ForecastStatus` - draft, active, completed, archived

### Интерфейсы
- `Forecast` - Основной прогноз
- `ForecastPeriod` - Период прогноза
- `CreateForecastDto` - DTO для создания
- `UpdateForecastDto` - DTO для обновления
- `ForecastComparison` - Данные сравнения

### Лейблы
- `FORECAST_TYPE_LABELS` - Типы на русском
- `FORECAST_METHOD_LABELS` - Методы на русском
- `FORECAST_PERIOD_TYPE_LABELS` - Периоды на русском
- `FORECAST_STATUS_LABELS` - Статусы на русском

## Роутинг

**Базовый путь:** `/forecasting`

**Маршруты:**
- `/forecasting` - Дашборд (список прогнозов)
- `/forecasting/create` - Создание (TODO)
- `/forecasting/:id` - Детальный просмотр (TODO)

## Интеграция

### Меню
Добавлено в sidebar после "Сделки":
```typescript
{ icon: 'query_stats', label: 'Прогнозирование', route: '/forecasting' }
```

### Роуты приложения
Зарегистрировано в `app.routes.ts` с lazy loading:
```typescript
{
  path: 'forecasting',
  canActivate: [authGuard],
  loadChildren: () => import('./forecasting/forecasting.routes').then(m => m.FORECASTING_ROUTES)
}
```

## UI/UX

### Цветовая схема
**Уверенность (Confidence):**
- ≥80% - success (зеленый)
- 60-79% - primary (синий)
- 40-59% - warn (оранжевый)
- <40% - accent (серый)

**Отклонение (Variance):**
- ≤5% - success (зеленый)
- 6-15% - primary (синий)
- 16-30% - warn (оранжевый)
- >30% - accent (красный)

**Статусы:**
- active - primary (синий)
- completed - accent (зеленый)
- draft - warn (оранжевый)
- archived - (серый)

### Material Components
- MatCard - Карточки
- MatTable - Таблица прогнозов
- MatButton - Кнопки
- MatIcon - Иконки
- MatChip - Статусы и метрики
- MatTooltip - Подсказки
- MatProgressSpinner - Загрузка

## Примеры использования

### Загрузка прогнозов
```typescript
forecasts = signal<Forecast[]>([]);

ngOnInit() {
  this.forecastingService.getForecasts({ status: ForecastStatus.ACTIVE })
    .subscribe(response => {
      this.forecasts.set(response.data);
    });
}
```

### Пересчет прогноза
```typescript
calculateForecast(id: string) {
  this.forecastingService.calculateForecast(id).subscribe({
    next: (forecast) => {
      console.log('Calculated:', forecast);
      this.loadForecasts();
    }
  });
}
```

### Форматирование
```typescript
// В шаблоне
{{ formatCurrency(forecast.targetValue) }}
{{ formatPercentage(forecast.confidence) }}

// В компоненте
formatCurrency(value: number): string {
  return this.forecastingService.formatCurrency(value);
}
```

## Статус реализации

✅ **Готово:**
- Модели и типы
- Сервис с API интеграцией
- Дашборд компонент
- Роутинг с lazy loading
- Интеграция в меню
- Цветовая индикация
- Форматирование данных

⚠️ **TODO (опционально):**
- Форма создания прогноза
- Детальный просмотр с графиками (Chart.js)
- Компонент сравнения прогнозов
- Экспорт в Excel/PDF
- Фильтры и поиск
- Пагинация

## Зависимости

**Angular:**
- @angular/common
- @angular/router
- @angular/material (card, table, button, icon, chips, spinner, tooltip)

**TypeScript:**
- RxJS для реактивности
- HttpClient для API

## Следующие шаги

1. Добавить Chart.js для визуализации графиков
2. Создать форму для создания прогнозов
3. Реализовать детальный просмотр с периодами
4. Добавить фильтры и поиск
5. Экспорт в Excel/PDF

## Интеграция с backend

API endpoint: `http://localhost:3000/api/forecasting`

См. [Backend README](../../../back/src/app/modules/forecasting/README.md) для полного описания API.
