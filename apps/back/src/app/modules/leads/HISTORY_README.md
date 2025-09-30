# Lead History - История изменений лидов

Модуль для отслеживания и отображения истории изменений лидов в CRM системе.

## Компоненты

### Entities

#### LeadHistory
Основная сущность для хранения истории изменений:
- `id` - уникальный идентификатор записи
- `leadId` - ID лида
- `fieldName` - название измененного поля
- `oldValue` / `newValue` - старое и новое значения
- `changeType` - тип изменения (CREATED, UPDATED, STATUS_CHANGED, и т.д.)
- `userId` / `userName` - пользователь, внесший изменение  
- `description` - описание изменения
- `metadata` - дополнительные метаданные
- `createdAt` - дата и время изменения

#### ChangeType (enum)
Типы изменений:
- `CREATED` - создание лида
- `UPDATED` - обновление данных
- `STATUS_CHANGED` - изменение статуса
- `ASSIGNED` - назначение менеджеру
- `SCORED` - изменение скора
- `QUALIFIED` - квалификация/дисквалификация
- `CONVERTED` - конвертация в сделку
- `NOTE_ADDED` - добавление заметки
- `CONTACT_ADDED` - добавление контакта
- `TAG_ADDED` / `TAG_REMOVED` - управление тегами
- `FOLLOW_UP_SCHEDULED` - планирование follow-up

### Services

#### LeadHistoryService
Основной сервис для работы с историей:

**Методы:**
- `createHistoryEntry(data)` - создание записи в истории
- `getLeadHistory(leadId, filters, page, limit)` - получение истории конкретного лида
- `getRecentChanges(filters, page, limit)` - получение последних изменений по всем лидам
- `getChangeStatistics(leadId?, dateFrom?, dateTo?)` - статистика изменений
- `getUserActivity(dateFrom?, dateTo?, limit)` - активность пользователей
- `compareLeadStates(leadId, fromDate, toDate)` - сравнение состояний лида
- `cleanupOldHistory(olderThanDays)` - очистка старой истории

#### LeadService (обновленный)
Добавлены методы с поддержкой трекинга:
- `create(data, userId?, userName?)` - создание с записью в историю
- `update(id, data, userId?, userName?)` - обновление с трекингом изменений
- `assignLead(id, user, assignedByUserId?, assignedByUserName?)` - назначение с историей
- `scoreLead(id, score, userId?, userName?)` - изменение скора с историей
- `changeStatus(id, status, userId?, userName?)` - изменение статуса с историей
- `qualifyLead(id, isQualified, userId?, userName?)` - квалификация с историей
- `convertToDeal(leadId, dealData, userId?, userName?)` - конвертация с историей

### Controllers

#### LeadController (обновленный)
Добавлены endpoints для истории:
- `GET /leads/:id/history` - история конкретного лида
- `GET /leads/:id/history/stats` - статистика изменений лида

#### LeadHistoryController
Глобальные endpoints для истории:
- `GET /leads/history/recent` - последние изменения по всем лидам
- `GET /leads/history/stats` - общая статистика изменений
- `GET /leads/history/user-activity` - активность пользователей

## API Endpoints

### История конкретного лида

```
GET /leads/:id/history
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
      "leadId": 123,
      "fieldName": "status",
      "oldValue": "new",
      "newValue": "contacted",
      "changeType": "status_changed",
      "userId": "user1",
      "userName": "Иван Иванов",
      "description": "Статус изменен с new на contacted",
      "metadata": {
        "Предыдущий статус": "new",
        "Новый статус": "contacted"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### Статистика изменений лида

```
GET /leads/:id/history/stats
```

**Query Parameters:**
- `dateFrom` - дата начала (ISO формат)
- `dateTo` - дата окончания (ISO формат)

**Пример ответа:**
```json
{
  "created": 1,
  "updated": 5,
  "status_changed": 3,
  "assigned": 1,
  "scored": 2,
  "qualified": 1,
  "converted": 0
}
```

### Последние изменения по всем лидам

```
GET /leads/history/recent
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
GET /leads/history/stats
```

**Query Parameters:**
- `dateFrom` - дата начала (ISO формат)
- `dateTo` - дата окончания (ISO формат)

### Активность пользователей

```
GET /leads/history/user-activity
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
    "changesCount": 25,
    "lastActivity": "2024-01-15T14:22:00Z"
  }
]
```

## База данных

### Таблица lead_history

```sql
CREATE TABLE lead_history (
  id SERIAL PRIMARY KEY,
  leadId INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
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
CREATE INDEX IDX_lead_history_leadId ON lead_history(leadId);
CREATE INDEX IDX_lead_history_changeType ON lead_history(changeType);
CREATE INDEX IDX_lead_history_userId ON lead_history(userId);
CREATE INDEX IDX_lead_history_createdAt ON lead_history(createdAt);
```

## Миграции

Миграция автоматически создается и выполняется при запуске приложения:
- `1727635200000-CreateLeadHistoryTable.ts` - создание таблицы и индексов

## Использование

### Автоматическое отслеживание

История автоматически записывается при:
- Создании лида через `LeadService.create()`
- Обновлении лида через `LeadService.update()`
- Изменении статуса через `LeadService.changeStatus()`
- Назначении менеджера через `LeadService.assignLead()`
- Изменении скора через `LeadService.scoreLead()`
- Квалификации через `LeadService.qualifyLead()`
- Конвертации в сделку через `LeadService.convertToDeal()`

### Программное создание записей

```typescript
await this.historyService.createHistoryEntry({
  leadId: 123,
  fieldName: 'customField',
  oldValue: 'old value',
  newValue: 'new value',
  changeType: ChangeType.UPDATED,
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
// История конкретного лида
const history = await this.leadService.getLeadHistory(123, {
  changeType: [ChangeType.STATUS_CHANGED, ChangeType.UPDATED],
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31')
}, 1, 20);

// Последние изменения
const recent = await this.historyService.getRecentChanges({
  userId: ['user1', 'user2']
}, 1, 10);

// Статистика
const stats = await this.historyService.getChangeStatistics(123);
```

## Обслуживание

### Очистка старой истории

```typescript
// Удалить историю старше 365 дней
const deletedCount = await this.historyService.cleanupOldHistory(365);
```

Рекомендуется настроить автоматическую очистку через cron job или планировщик задач.