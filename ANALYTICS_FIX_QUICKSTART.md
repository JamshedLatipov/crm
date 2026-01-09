# Быстрая инструкция по применению исправлений аналитики

## Шаг 1: Применить SQL миграцию

```bash
# Подключитесь к базе данных PostgreSQL
psql -U crm_user -d crm_db

# Выполните миграцию
\i apps/back/migrations/fix-call-summaries-status.sql

# Или напрямую:
\q
psql -U crm_user -d crm_db -f apps/back/migrations/fix-call-summaries-status.sql
```

## Шаг 2: Перезапустить backend

```bash
# Остановить текущий процесс (если запущен)
# Ctrl+C или:
pkill -f "yarn start:back"

# Запустить заново
yarn start:back
```

## Шаг 3: Проверить отчеты

Откройте в браузере: `http://localhost:4200/contact-center/analytics`

Проверьте каждую вкладку:
- ✅ Agent Performance
- ✅ Calls Overview  
- ✅ SLA Metrics
- ✅ Abandoned Calls
- ✅ Queue Performance
- ✅ IVR Analysis
- ✅ Call Conversion

## Опция: Полная пересборка (если миграция не помогла)

Если после миграции данные все еще неправильные:

```sql
-- ВНИМАНИЕ: Это удалит все записи CallSummary!
-- Они будут пересозданы автоматически из CDR
TRUNCATE TABLE call_summaries;
```

После этого `CallAggregationService` автоматически пересоздаст все записи из CDR (работает каждые 10 секунд).

## Проверка результата

```sql
-- Проверить статистику по статусам
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM call_summaries
GROUP BY status
ORDER BY count DESC;

-- Проверить брошенные звонки
SELECT 
  COUNT(*) as total_abandon,
  AVG(abandonTime) as avg_abandon_time,
  MIN(abandonTime) as min_abandon_time,
  MAX(abandonTime) as max_abandon_time
FROM call_summaries
WHERE status = 'ABANDON';

-- Проверить SLA
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN slaViolated = true THEN 1 END) as violated,
  ROUND(COUNT(CASE WHEN slaViolated = true THEN 1 END) * 100.0 / COUNT(*), 2) as violation_rate
FROM call_summaries
WHERE queue IS NOT NULL;
```

## Что было исправлено

1. ✅ Правильное определение статуса ABANDON
2. ✅ Упрощенные SQL условия для подсчета брошенных звонков
3. ✅ Корректный расчет метрик по очередям
4. ✅ Исправлена логика в `countByAbandonTimeRange`

## Файлы изменены

- `apps/back/src/app/modules/calls/services/call-aggregation.service.ts`
- `apps/back/src/app/modules/analytics/services/abandoned-calls.service.ts`
- `apps/back/src/app/modules/analytics/services/queue-performance.service.ts`
- `apps/back/src/app/modules/analytics/services/calls-overview.service.ts`
