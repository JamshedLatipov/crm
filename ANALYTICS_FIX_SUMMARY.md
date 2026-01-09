# Исправление отчетов аналитики - Резюме

## Дата: 10 января 2026

## Проблема
Пользователь сообщил, что на странице `http://localhost:4200/contact-center/analytics` почти все отчеты показывают неправильные данные.

## Найденная причина
Основная причина - **неправильное определение статуса звонков** в `CallAggregationService`. Звонки, брошенные в очереди (ABANDON), определялись как NO ANSWER, что приводило к:
- Неправильному подсчету брошенных звонков
- Искаженной статистике по агентам
- Некорректным метрикам SLA
- Неправильным данным по очередям

## Внесенные изменения

### 1. call-aggregation.service.ts
Добавлена правильная логика определения статуса:
- Проверяем, был ли звонок отвечен (ANSWERED)
- Проверяем, был ли брошен в очереди (ABANDON) по наличию abandonTime
- Используем CDR disposition как fallback для остальных случаев

### 2. abandoned-calls.service.ts
Упрощено условие подсчета брошенных звонков с:
```sql
(cs.status = 'ABANDON' OR (cs.status = 'NO ANSWER' AND cs.abandonTime IS NOT NULL AND cs.abandonTime > 0))
```
на:
```sql
cs.status = 'ABANDON'
```

### 3. queue-performance.service.ts
Аналогично упрощено условие для abandoned calls.

### 4. calls-overview.service.ts
Оптимизировано условие для missed calls с использованием IN вместо OR.

## Создано

1. **ANALYTICS_REPORTS_FIX.md** - подробная документация по исправлениям
2. **fix-call-summaries-status.sql** - SQL миграция для обновления существующих записей

## Следующие шаги

1. **Применить SQL миграцию** для обновления существующих CallSummary записей:
   ```bash
   # Подключитесь к PostgreSQL
   psql -U crm_user -d crm_db -f apps/back/migrations/fix-call-summaries-status.sql
   ```

2. **Перезапустить backend** для применения изменений в коде:
   ```bash
   yarn start:back
   ```

3. **Проверить отчеты** на странице `/contact-center/analytics`:
   - Agent Performance
   - Calls Overview
   - Abandoned Calls
   - Queue Performance
   - SLA Metrics
   - IVR Analysis
   - Call Conversion

4. **Опционально: Полная пересборка** (если SQL миграция не помогла):
   ```sql
   TRUNCATE TABLE call_summaries;
   -- CallAggregationService автоматически пересоздаст все записи
   ```

## Затронутые файлы

- ✅ `apps/back/src/app/modules/calls/services/call-aggregation.service.ts`
- ✅ `apps/back/src/app/modules/analytics/services/abandoned-calls.service.ts`
- ✅ `apps/back/src/app/modules/analytics/services/queue-performance.service.ts`
- ✅ `apps/back/src/app/modules/analytics/services/calls-overview.service.ts`
- ✅ `ANALYTICS_REPORTS_FIX.md` (создан)
- ✅ `apps/back/migrations/fix-call-summaries-status.sql` (создан)

## Ожидаемый результат

После применения исправлений:
- ✅ Брошенные звонки правильно классифицируются как ABANDON
- ✅ Статистика по агентам показывает корректные данные
- ✅ Метрики по очередям точные
- ✅ SLA compliance рассчитывается правильно
- ✅ Все отчеты на странице analytics работают корректно
