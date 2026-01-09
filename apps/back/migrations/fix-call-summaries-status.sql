-- Analytics Fix Migration
-- Исправляет статусы существующих CallSummary записей
-- Дата: 10 января 2026

-- Шаг 1: Обновить статус ABANDON для звонков, брошенных в очереди
UPDATE call_summaries 
SET status = 'ABANDON' 
WHERE status = 'NO ANSWER' 
  AND abandonTime IS NOT NULL 
  AND abandonTime > 0;

-- Шаг 2: Проверить количество обновленных записей
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN abandonTime > 0 THEN 1 END) as with_abandon_time
FROM call_summaries
GROUP BY status
ORDER BY count DESC;

-- Шаг 3: Проверить корректность SLA violations
-- Обновить slaViolated для звонков с нарушением SLA
UPDATE call_summaries 
SET slaViolated = true
WHERE (
  (waitTime IS NOT NULL AND waitTime > 30) 
  OR 
  (abandonTime IS NOT NULL AND abandonTime > 20)
)
AND slaViolated = false;

-- Шаг 4: Статистика после обновления
SELECT 
  'Total calls' as metric,
  COUNT(*) as value
FROM call_summaries
UNION ALL
SELECT 
  'ANSWERED',
  COUNT(*)
FROM call_summaries
WHERE status = 'ANSWERED'
UNION ALL
SELECT 
  'ABANDON',
  COUNT(*)
FROM call_summaries
WHERE status = 'ABANDON'
UNION ALL
SELECT 
  'NO ANSWER',
  COUNT(*)
FROM call_summaries
WHERE status = 'NO ANSWER'
UNION ALL
SELECT 
  'BUSY',
  COUNT(*)
FROM call_summaries
WHERE status = 'BUSY'
UNION ALL
SELECT 
  'SLA Violated',
  COUNT(*)
FROM call_summaries
WHERE slaViolated = true;

-- Шаг 5 (Опционально): Полная пересборка если нужно
-- ВНИМАНИЕ: Это удалит все существующие записи!
-- Раскомментируйте только если уверены
-- TRUNCATE TABLE call_summaries;
-- После этого CallAggregationService автоматически пересоздаст все записи из CDR
