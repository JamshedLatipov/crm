# Deal History - История изменений сделок

Модуль для отслеживания и отображения истории изменений сделок в CRM системе.

## Компоненты

### Entities

#### DealHistory
Основная сущность для хранения истории изменений сделок:
- `id` - уникальный идентификатор записи
- `dealId` - ID сделки (UUID)
- `fieldName` - название измененного поля
- `oldValue` / `newValue` - старое и новое значения
- `changeType` - тип изменения (CREATED, UPDATED, STAGE_MOVED, и т.д.)
- `userId` / `userName` - пользователь, внесший изменение  
- `description` - описание изменения
- `metadata` - дополнительные метаданные
- `createdAt` - дата и время изменения

#### DealChangeType (enum)
Типы изменений сделок:
- `CREATED` - создание сделки
- `UPDATED` - обновление данных
- `DELETED` - удаление сделки
- `STATUS_CHANGED` - изменение статуса (открыта/выиграна/проиграна)
- `STAGE_MOVED` - перемещение между этапами
- `ASSIGNED` - назначение менеджеру
- `AMOUNT_CHANGED` - изменение суммы
- `PROBABILITY_CHANGED` - изменение вероятности
- `WON` - выигрыш сделки
- `LOST` - проигрыш сделки
- `REOPENED` - переоткрытие сделки
- `NOTE_ADDED` - добавление заметки
- `CONTACT_LINKED` - связывание с контактом
- `COMPANY_LINKED` - связывание с компанией
- `LEAD_LINKED` - связывание с лидом
- `DATE_CHANGED` - изменение дат

### Services

#### DealHistoryService
Основной сервис для работы с историей:

**Методы:**
- `createHistoryEntry(data)` - создание записи в истории
- `getDealHistory(dealId, filters, page, limit)` - получение истории конкретной сделки
- `getRecentChanges(filters, page, limit)` - получение последних изменений по всем сделкам
- `getChangeStatistics(dealId?, dateFrom?, dateTo?)` - статистика изменений
- `getUserActivity(dateFrom?, dateTo?, limit)` - активность пользователей
- `compareDealStates(dealId, fromDate, toDate)` - сравнение состояний сделки
- `getStageMovementStats(dateFrom?, dateTo?)` - статистика движения по этапам
- `getMostActiveDays(limit, dateFrom?, dateTo?)` - самые активные сделки
- `cleanupOldHistory(olderThanDays)` - очистка старой истории

#### DealsService (обновленный)
Добавлены методы с поддержкой трекинга:
- `createDeal(dto, userId?, userName?)` - создание с записью в историю
- `updateDeal(id, dto, userId?, userName?)` - обновление с трекингом изменений
- `moveToStage(id, stageId, userId?, userName?)` - перемещение между этапами с историей
- `winDeal(id, actualAmount?, userId?, userName?)` - выигрыш сделки с историей
- `loseDeal(id, reason, userId?, userName?)` - проигрыш сделки с историей
- `assignDeal(id, managerId, userId?, userName?)` - назначение с историей
- `linkDealToCompany/Contact/Lead(dealId, entityId, userId?, userName?)` - связывание с историей

### Controllers

#### DealsController (обновленный)
Добавлены endpoints для истории:
- `GET /deals/:id/history` - история конкретной сделки
- `GET /deals/:id/history/stats` - статистика изменений сделки
- `GET /deals/history/stage-movement-stats` - статистика движения по этапам
- `GET /deals/history/most-active` - самые активные сделки

#### DealHistoryController
Глобальные endpoints для истории:
- `GET /deals/history/recent` - последние изменения по всем сделкам
- `GET /deals/history/stats` - общая статистика изменений
- `GET /deals/history/user-activity` - активность пользователей
- `GET /deals/history/stage-movement` - статистика движения по этапам
- `GET /deals/history/most-active-deals` - самые активные сделки

## API Endpoints

### История конкретной сделки

```
GET /deals/:id/history
```

**Query Parameters:**
- `page` - номер страницы (по умолчанию 1)
- `limit` - количество записей на странице (по умолчанию 50)
- `changeType` - тип изменения (можно несколько через запятую)
- `userId` - ID пользователя (можно несколько через запятую)
- `fieldName` - название поля (можно несколько через запятую)
- `dateFrom` - дата начала (ISO формат)
- `dateTo` - дата окончания (ISO формат)

**Пример ответа:**
```json
{
  "history": [
    {
      "id": 1,
      "dealId": "123e4567-e89b-12d3-a456-426614174000",
      "fieldName": "amount",
      "oldValue": "10000",
      "newValue": "15000",
      "changeType": "amount_changed",
      "userId": "user1",
      "userName": "Иван Иванов",
      "description": "Сумма изменена с 10000 на 15000",
      "metadata": {
        "Поле": "amount",
        "Старое значение": "10000",
        "Новое значение": "15000"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### Статистика изменений сделки

```
GET /deals/:id/history/stats
```

**Query Parameters:**
- `dateFrom` - дата начала (ISO формат)
- `dateTo` - дата окончания (ISO формат)

**Пример ответа:**
```json
{
  "created": 1,
  "updated": 5,
  "stage_moved": 3,
  "amount_changed": 2,
  "assigned": 1,
  "won": 0,
  "lost": 0
}
```

### Последние изменения по всем сделкам

```
GET /deals/history/recent
```

**Query Parameters:**
- `page` - номер страницы (по умолчанию 1)
- `limit` - количество записей на странице (по умолчанию 20)
- `changeType` - тип изменения (можно несколько через запятую)
- `userId` - ID пользователя (можно несколько через запятую)
- `dateFrom` - дата начала (ISO формат)
- `dateTo` - дата окончания (ISO формат)

### Общая статистика изменений

```
GET /deals/history/stats
```

**Query Parameters:**
- `dateFrom` - дата начала (ISO формат)
- `dateTo` - дата окончания (ISO формат)

### Активность пользователей

```
GET /deals/history/user-activity
```

**Query Parameters:**
- `dateFrom` - дата начала (ISO формат)
- `dateTo` - дата окончания (ISO формат)
- `limit` - количество пользователей (по умолчанию 10)

**Пример ответа:**
```json
[
  {
    "userId": "user1",
    "userName": "Иван Иванов",
    "changesCount": 45,
    "lastActivity": "2024-01-15T14:22:00Z"
  }
]
```

### Статистика движения по этапам

```
GET /deals/history/stage-movement
```

**Query Parameters:**
- `dateFrom` - дата начала (ISO формат)
- `dateTo` - дата окончания (ISO формат)

**Пример ответа:**
```json
[
  {
    "fromStage": "stage1",
    "toStage": "stage2",
    "count": 15
  }
]
```

### Самые активные сделки

```
GET /deals/history/most-active-deals
```

**Query Parameters:**
- `limit` - количество сделок (по умолчанию 10)
- `dateFrom` - дата начала (ISO формат)
- `dateTo` - дата окончания (ISO формат)

**Пример ответа:**
```json
[
  {
    "dealId": "123e4567-e89b-12d3-a456-426614174000",
    "dealTitle": "Сделка с крупным клиентом",
    "changesCount": 28,
    "lastChange": "2024-01-15T16:45:00Z"
  }
]
```

## База данных

### Таблица deal_history

```sql
CREATE TABLE deal_history (
  id SERIAL PRIMARY KEY,
  dealId UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  fieldName VARCHAR(255),
  oldValue TEXT,
  newValue TEXT,
  changeType ENUM(...) NOT NULL,
  userId VARCHAR(255),
  userName VARCHAR(255),
  description TEXT,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IDX_deal_history_dealId ON deal_history(dealId);
CREATE INDEX IDX_deal_history_changeType ON deal_history(changeType);
CREATE INDEX IDX_deal_history_userId ON deal_history(userId);
CREATE INDEX IDX_deal_history_createdAt ON deal_history(createdAt);
```

## Миграции

Миграция автоматически создается и выполняется при запуске приложения:
- `1727635300000-CreateDealHistoryTable.ts` - создание таблицы и индексов

## Использование

### Автоматическое отслеживание

История автоматически записывается при:
- Создании сделки через `DealsService.createDeal()`
- Обновлении сделки через `DealsService.updateDeal()`
- Перемещении между этапами через `DealsService.moveToStage()`
- Выигрыше сделки через `DealsService.winDeal()`
- Проигрыше сделки через `DealsService.loseDeal()`
- Назначении менеджера через `DealsService.assignDeal()`
- Связывании с контактами/компаниями/лидами

### Программное создание записей

```typescript
await this.historyService.createHistoryEntry({
  dealId: '123e4567-e89b-12d3-a456-426614174000',
  fieldName: 'customField',
  oldValue: 'old value',
  newValue: 'new value',
  changeType: DealChangeType.UPDATED,
  userId: 'user1',
  userName: 'Иван Иванов',
  description: 'Обновлено пользовательское поле',
  metadata: {
    'Источник': 'API',
    'Причина': 'Массовое обновление'
  }
});
```

### Получение истории

```typescript
// История конкретной сделки
const history = await this.dealsService.getDealHistory('deal-uuid', {
  changeType: [DealChangeType.STAGE_MOVED, DealChangeType.AMOUNT_CHANGED],
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31')
}, 1, 20);

// Последние изменения
const recent = await this.historyService.getRecentChanges({
  userId: ['user1', 'user2']
}, 1, 10);

// Статистика
const stats = await this.historyService.getChangeStatistics('deal-uuid');

// Статистика движения по этапам
const stageStats = await this.historyService.getStageMovementStats(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

## Особенности для сделок

### Специфичные типы изменений

- `STAGE_MOVED` - отслеживание перемещений между этапами воронки
- `WON` / `LOST` - отслеживание результатов сделок
- `AMOUNT_CHANGED` - отслеживание изменений суммы сделки
- `PROBABILITY_CHANGED` - отслеживание изменений вероятности закрытия

### Статистика движения по этапам

Специальный метод для анализа эффективности воронки продаж:
- Какие этапы чаще всего пропускаются
- На каких этапах сделки "застревают"
- Общая статистика переходов между этапами

### Анализ активности сделок

Выявление сделок с наибольшим количеством изменений:
- Помогает понять сложные сделки
- Выявляет проблемные направления
- Анализ работы менеджеров

## Обслуживание

### Очистка старой истории

```typescript
// Удалить историю старше 365 дней
const deletedCount = await this.historyService.cleanupOldHistory(365);
```

### Мониторинг производительности

Рекомендуется мониторить размер таблицы deal_history и настроить автоматическую архивацию или очистку старых записей для поддержания производительности.