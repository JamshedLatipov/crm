# Исправления ошибок PostgreSQL в DealHistoryService

## Проблема
Ошибки в SQL запросах:
```
QueryFailedError: column "changescount" does not exist
```

## Причина
PostgreSQL автоматически приводит алиасы к нижнему регистру, но в коде использовались camelCase обращения к этим алиасам.

## Исправления

### 1. Метод getUserActivity()
**До:**
```typescript
.addSelect('COUNT(*)', 'changesCount')
.orderBy('changesCount', 'DESC');
// ...
changesCount: parseInt(result.changesCount, 10),
```

**После:**
```typescript
.addSelect('COUNT(*)', 'changescount')
.orderBy('changescount', 'DESC');
// ...
changesCount: parseInt(result.changescount, 10),
```

### 2. Метод getMostActiveDays()
**До:**
```typescript
.leftJoin('history.deal', 'deal')
.addSelect('COUNT(*)', 'changesCount')
.orderBy('changesCount', 'DESC');
// ...
changesCount: parseInt(result.changesCount, 10),
```

**После:**
```typescript
.leftJoin('deals', 'deal', 'deal.id = history.dealId')
.addSelect('COUNT(*)', 'changescount')
.orderBy('changescount', 'DESC');
// ...
changesCount: parseInt(result.changescount, 10),
```

## Изменения в коде

### Файл: `apps/back/src/app/modules/deals/services/deal-history.service.ts`

1. **Исправлены алиасы COUNT(*)**:
   - `'changesCount'` → `'changescount'`
   
2. **Исправлены ORDER BY клаузы**:
   - `'changesCount'` → `'changescount'`
   
3. **Исправлен доступ к результатам**:
   - `result.changesCount` → `result.changescount`
   
4. **Исправлен JOIN с таблицей deals**:
   - `leftJoin('history.deal', 'deal')` → `leftJoin('deals', 'deal', 'deal.id = history.dealId')`

## Результат
После этих исправлений SQL запросы должны работать корректно с PostgreSQL:

- ✅ Алиасы используют нижний регистр
- ✅ JOIN с таблицей deals выполняется явно
- ✅ Обращение к результатам соответствует реальным алиасам

## Тестирование
Для проверки исправлений:
1. Запустить бэкенд: `npm run start:back`
2. Открыть страницу сделки с историей
3. Проверить работу API endpoints: `/deals/:id/history` и `/deals/history/most-active-deals`