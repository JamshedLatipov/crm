# Analytics Reports Fix - 10 января 2026

## Проблема
На странице `/contact-center/analytics` почти все отчеты показывали неправильные данные из-за некорректного определения статусов звонков и подсчета метрик.

## Найденные проблемы

### 1. Неправильное определение статуса звонка
**Файл:** `apps/back/src/app/modules/calls/services/call-aggregation.service.ts`

**Было:**
```typescript
status: s.answered ? 'ANSWERED' : (s.status || 'NO ANSWER'),
```

**Проблема:** 
- `s.status` содержал CDR disposition (ANSWERED, NO ANSWER, BUSY, FAILED), а не реальный статус звонка
- Звонки, брошенные в очереди (ABANDON), определялись как NO ANSWER
- Это приводило к неправильному подсчету брошенных звонков в аналитике

**Исправлено:**
```typescript
// Determine correct status based on queue events and CDR disposition
let callStatus = 'NO ANSWER';
if (s.answered) {
  callStatus = 'ANSWERED';
} else if (abandonTime && abandonTime > 0) {
  // Call was abandoned in queue
  callStatus = 'ABANDON';
} else if (cdr) {
  // Use CDR disposition as fallback
  const disposition = cdr.disposition?.toUpperCase();
  if (disposition === 'ANSWERED') {
    callStatus = 'ANSWERED';
  } else if (disposition === 'BUSY') {
    callStatus = 'BUSY';
  } else if (disposition === 'FAILED') {
    callStatus = 'FAILED';
  } else if (disposition === 'NO ANSWER') {
    callStatus = 'NO ANSWER';
  } else {
    callStatus = disposition || 'NO ANSWER';
  }
}
```

### 2. Сложные условия для ABANDON в аналитике
**Файл:** `apps/back/src/app/modules/analytics/services/abandoned-calls.service.ts`

**Было:**
```sql
COUNT(CASE WHEN (cs.status = 'ABANDON' OR (cs.status = 'NO ANSWER' AND cs.abandonTime IS NOT NULL AND cs.abandonTime > 0)) THEN 1 END)
```

**Проблема:**
- Очень сложное условие, которое пыталось компенсировать неправильное определение статуса
- Могло давать ложные срабатывания для звонков NO ANSWER, у которых по какой-то причине был abandonTime
- То же условие использовалось в методе `countByAbandonTimeRange`

**Исправлено:**
```sql
COUNT(CASE WHEN cs.status = 'ABANDON' THEN 1 END)
```

И в методе `countByAbandonTimeRange`:
```typescript
.where("cs.status = 'ABANDON'")
```

### 3. Аналогичная проблема в Queue Performance
**Файл:** `apps/back/src/app/modules/analytics/services/queue-performance.service.ts`

Исправлено аналогично - убрано сложное условие `(cs.status = 'ABANDON' OR (cs.status = 'NO ANSWER' AND cs.abandonTime IS NOT NULL AND cs.abandonTime > 0))` на простое `cs.status = 'ABANDON'`.

### 4. Небольшая оптимизация в Calls Overview
**Файл:** `apps/back/src/app/modules/analytics/services/calls-overview.service.ts`

**Было:**
```sql
COUNT(CASE WHEN cs.status = 'NO ANSWER' OR cs.status = 'BUSY' THEN 1 END)
```

**Исправлено:**
```sql
COUNT(CASE WHEN cs.status IN ('NO ANSWER', 'BUSY') THEN 1 END)
```

## Затронутые отчеты

1. **Agent Performance** - теперь правильно считает ответенные/пропущенные звонки
2. **Calls Overview** - корректное распределение по статусам
3. **Abandoned Calls** - точный подсчет брошенных звонков
4. **Queue Performance** - правильные метрики по очередям
5. **SLA Metrics** - корректные данные по SLA compliance
6. **IVR Analysis** - правильные сессии IVR
7. **Call Conversion** - точные данные по конверсии

## Как работает новая логика

### Определение статуса звонка (приоритеты):
1. **ANSWERED** - если агент ответил на звонок (s.answered === true)
2. **ABANDON** - если звонок был брошен в очереди (abandonTime > 0)
3. **Fallback к CDR disposition** - для всех остальных случаев используется disposition из CDR:
   - ANSWERED
   - BUSY
   - FAILED
   - NO ANSWER

### Метрики звонков:
- **talkTime** - время разговора от момента ответа до завершения
- **ringTime** - время от входа в очередь до соединения с агентом
- **abandonTime** - время от входа в очередь до отбоя звонящего
- **waitTime** - общее время ожидания в очереди
- **slaViolated** - нарушение SLA (waitTime > 30сек или abandonTime > 20сек)

## Что нужно сделать дальше

1. **Пересоздать существующие CallSummary записи** - старые записи имеют неправильные статусы:
   ```sql
   -- Временное решение: обновить существующие записи через миграцию
   UPDATE call_summaries 
   SET status = 'ABANDON' 
   WHERE status = 'NO ANSWER' 
   AND abandonTime IS NOT NULL 
   AND abandonTime > 0;
   ```

2. **Или удалить и пересоздать** - запустить агрегацию заново:
   ```sql
   TRUNCATE TABLE call_summaries;
   -- Затем сервис автоматически пересоздаст все записи из CDR
   ```

3. **Мониторинг** - проверить логи CallAggregationService на предмет ошибок

## Результат
После исправлений все отчеты на странице `/contact-center/analytics` будут показывать корректные данные:
- ✅ Правильный подсчет брошенных звонков
- ✅ Точные метрики по агентам
- ✅ Корректная статистика по очередям
- ✅ Правильные SLA метрики
- ✅ Точные данные по конверсии

## Проверка
После применения изменений рекомендуется:
1. Очистить таблицу call_summaries
2. Дождаться автоматической агрегации (работает каждые 10 секунд)
3. Проверить отчеты на странице analytics
4. Сверить цифры с данными из CDR напрямую
