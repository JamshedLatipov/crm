# Улучшение надежности логирования звонков операторами

## Проблема

Ранее система использовала **временные клиентские ID** (`clientCallId`), генерируемые на фронтенде, для связи логов звонков с записями CDR от Asterisk. Это приводило к:

- **Ненадежной идентификации звонков** - временные ID могут быть потеряны при обновлении страницы или сбоях
- **Сложной логике reconciliation** - нужен был фоновый сервис для сопоставления временных ID с CDR записями
- **Задержкам в связывании данных** - reconciliation работал с интервалом 10 секунд
- **Дублированию логов** - при сбоях могли создаваться повторные записи

## Решение

Использование **SIP Call-ID и Asterisk uniqueid** как надежных идентификаторов:

### 1. Приоритет идентификаторов

**Новая логика в ReconciliationService:**
1. **asteriskUniqueId** (если уже получен) - самый надежный
2. **sipCallId** (SIP Call-ID из JsSIP) - доступен сразу при инициации звонка
3. **clientCallId** (legacy) - для обратной совместимости

### 2. Миграция базы данных

Создан уникальный индекс на `asteriskUniqueId` ([1735478400000-AddUniqueIndexOnAsteriskUniqueId.ts](../apps/back/src/app/modules/calls/migrations/1735478400000-AddUniqueIndexOnAsteriskUniqueId.ts)):

```sql
CREATE UNIQUE INDEX "IDX_call_logs_asteriskUniqueId" 
ON "call_logs" ("asteriskUniqueId") 
WHERE "asteriskUniqueId" IS NOT NULL
```

Преимущества:
- Быстрый поиск по `asteriskUniqueId`
- Предотвращение дублирования логов с одинаковым uniqueid
- NULL значения допускаются (для записей без uniqueid)

### 3. Обновление CdrService (Backend)

Изменения в [cdr.service.ts](../apps/back/src/app/modules/calls/services/cdr.service.ts):

- `createCallLog()` теперь принимает `asteriskUniqueId` как приоритетный параметр
- Проверка на существующий лог с таким uniqueid перед созданием нового
- Обновление существующего лога вместо создания дубликата
- Приоритеты идентификаторов при reconciliation

```typescript
async createCallLog(data: Partial<CallLog>): Promise<CallLog> {
  // Если asteriskUniqueId предоставлен, проверяем дубликаты
  if (data.asteriskUniqueId) {
    const existing = await this.callLogRepo.findOne({
      where: { asteriskUniqueId: data.asteriskUniqueId },
    });
    if (existing) {
      // Обновляем существующий лог вместо создания дубликата
      Object.assign(existing, { ...data, updatedAt: new Date() });
      return await this.callLogRepo.save(existing);
    }
  }
  // ... создание нового лога
}
```

### 4. Улучшение ReconciliationService (Backend)

Обновлен [reconciliation.service.ts](../apps/back/src/app/modules/calls/services/reconciliation.service.ts):

- **Быстрее работает**: интервал уменьшен с 10 до 3 секунд
- **Приоритет 1**: Поиск по `asteriskUniqueId` (самый надежный)
- **Приоритет 2**: Поиск по `sipCallId` (SIP Call-ID из JsSIP)
- **Приоритет 3**: Legacy поддержка `clientCallId` через `userfield`

```typescript
private async reconcileOnce() {
  const pending = await this.callLogRepo.find({ where: { status: 'awaiting_cdr' } });
  
  for (const cl of pending) {
    let found: Cdr | null = null;
    
    // Приоритет 1: asteriskUniqueId
    if (cl.asteriskUniqueId) {
      found = await this.cdrRepo.findOne({ where: { uniqueid: cl.asteriskUniqueId } });
    }
    
    // Приоритет 2: sipCallId (SIP Call-ID)
    if (!found && cl.sipCallId) {
      found = await this.cdrRepo.findOne({ where: { uniqueid: cl.sipCallId } });
    }
    
    // Приоритет 3: clientCallId (legacy)
    if (!found && cl.clientCallId) {
      found = await this.cdrRepo.findOne({ where: { userfield: cl.clientCallId } });
    }
    
    if (found) {
      cl.asteriskUniqueId = found.uniqueid;
      cl.duration = found.duration;
      cl.disposition = found.disposition;
      cl.status = 'completed';
      await this.callLogRepo.save(cl);
    }
  }
}
```

### 5. Обновление Softphone Component (Frontend)

Изменения в [softphone.component.ts](../apps/front/src/app/softphone/softphone.component.ts):

- Использование **SIP Call-ID** из JsSIP session напрямую
- Передача `sipCallId` в `saveCallLog()` для быстрого reconciliation
- Никаких WebSocket подключений - просто используем то, что уже есть

```typescript
async manualRegisterCall(payload) {
  const callId = this.sessionSvc.getSessionCallKey(this.currentSession);
  
  // Извлекаем SIP Call-ID из сессии
  const sipCallId = this.currentSession?.call_id || callId;
  
  const logResult = await this.callHistoryService.saveCallLog(callId, {
    sipCallId,  // SIP Call-ID для reconciliation с CDR
    note: noteToSave,
    callType: this.callState.callType(),
    scriptBranch: branch,
  });
  
  this.logger.info('Manual CDR registered', { 
    logId: savedLogId, 
    sipCallId 
  });
}
```

## Архитектура

```
┌──────────────┐
│   JsSIP      │  session.call_id
│   Session    │  (SIP Call-ID)
└──────┬───────┘
       │
       │ Извлекаем call_id
       │
┌──────▼────────┐
│  Softphone    │  saveCallLog({ sipCallId })
│  Component    │
└──────┬────────┘
       │ POST /api/cdr/log
       │
┌──────▼────────┐
│  CdrService   │  Сохраняет с sipCallId
└──────┬────────┘
       │
┌──────▼────────────────┐
│ ReconciliationService │  Каждые 3 секунды:
│                       │  1. Ищет CDR по sipCallId
│                       │  2. Обновляет asteriskUniqueId
│                       │  3. Статус: completed
└───────────────────────┘
```

## Преимущества

### ✅ Простота
- **Нет WebSocket** - не нужны дополнительные соединения
- **Используем то, что есть** - SIP Call-ID из JsSIP session
- **Меньше кода** - проще поддерживать и отлаживать

### ✅ Надежность
- **SIP Call-ID** - стандартный идентификатор SIP протокола
- **Нет временных ID** - используем стабильные идентификаторы
- **Нет дублирования** - уникальный индекс предотвращает дубликаты

### ⚡ Производительность
- **Быстрый reconciliation** - 3 секунды вместо 10
- **Индексированный поиск** - UNIQUE индекс на asteriskUniqueId
- **Меньше запросов** - нет постоянного WebSocket трафика

### 🔄 Обратная совместимость
- Legacy логи с `clientCallId` продолжают работать
- Reconciliation поддерживает все типы идентификаторов
- Постепенная миграция существующих данных

## Как это работает

### Сценарий 1: Исходящий звонок

1. Оператор набирает номер
2. JsSIP создает session с `call_id` (SIP Call-ID)
3. Оператор сохраняет лог через UI → передается `sipCallId`
4. Backend сохраняет лог со статусом `awaiting_cdr`
5. **Через 1-3 секунды**: Asterisk создает CDR запись с `uniqueid`
6. **Через 3 секунды**: ReconciliationService находит CDR по `sipCallId`
7. ReconciliationService обновляет лог: добавляет `asteriskUniqueId`, `duration`, `disposition`, меняет статус на `completed`

### Сценарий 2: Входящий звонок

1. Asterisk отправляет звонок оператору
2. JsSIP принимает звонок, создает session с `call_id`
3. Оператор отвечает и ведет разговор
4. Оператор сохраняет лог → передается `sipCallId`
5. ReconciliationService быстро находит CDR и обновляет лог

## Миграция существующих данных

Существующие логи с временными ID продолжат работать:

1. ReconciliationService найдет CDR записи по `clientCallId` (через `userfield`)
2. Обновит `asteriskUniqueId` в логе
3. Следующие обращения будут использовать надежный uniqueid

Новые логи сразу используют `sipCallId` для быстрого сопоставления.

## Конфигурация

### Backend

В `CallsModule` **ничего дополнительного не требуется** - только то, что уже было:
- TypeORM entities
- CdrService
- ReconciliationService

### Frontend

В `softphone.component.ts`:
- Извлечение `session.call_id` из JsSIP session
- Передача как `sipCallId` при сохранении лога

## Тестирование

### 1. Проверка SIP Call-ID
```bash
# В консоли браузера после инициации звонка:
[Softphone] Manual CDR registered: {
  logId: 'uuid-...',
  sipCallId: 'abcd1234-5678-...',  # SIP Call-ID из JsSIP
  callId: 'c-...'
}
```

### 2. Проверка reconciliation
```sql
-- Проверка логов в статусе awaiting_cdr
SELECT id, "sipCallId", "asteriskUniqueId", status, "createdAt"
FROM call_logs
WHERE status = 'awaiting_cdr'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Через 3-5 секунд проверяем, что они обновились
SELECT id, "sipCallId", "asteriskUniqueId", status, duration
FROM call_logs
WHERE id IN (...) -- ID из предыдущего запроса
```

### 3. Проверка индекса
```sql
-- Проверка индекса
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'call_logs' 
  AND indexname = 'IDX_call_logs_asteriskUniqueId';

-- Проверка уникальности
SELECT "asteriskUniqueId", COUNT(*) 
FROM call_logs 
WHERE "asteriskUniqueId" IS NOT NULL 
GROUP BY "asteriskUniqueId" 
HAVING COUNT(*) > 1;
-- Должно вернуть 0 строк
```

## Дальнейшие улучшения

1. **Опциональный HTTP endpoint**: GET `/api/calls/current/{extension}/uniqueid` для мгновенного получения uniqueid
2. **Webhook от Asterisk**: Настроить Asterisk для отправки CDR webhook сразу после создания записи
3. **Redis кэширование**: Кэшировать маппинг sipCallId -> asteriskUniqueId для еще более быстрого доступа

## Зависимости

- **Backend**: TypeORM, NestJS
- **Frontend**: JsSIP (уже используется)
- **Нет дополнительных зависимостей** - все уже установлено!

## См. также

- [CALL_LOG_TASK_LINKING.txt](../CALL_LOG_TASK_LINKING.txt) - Связь логов с задачами
- [ReconciliationService](../apps/back/src/app/modules/calls/services/reconciliation.service.ts) - Фоновый сервис сопоставления


## Проблема

Ранее система использовала **временные клиентские ID** (`clientCallId`), генерируемые на фронтенде, для связи логов звонков с записями CDR от Asterisk. Это приводило к:

- **Ненадежной идентификации звонков** - временные ID могут быть потеряны при обновлении страницы или сбоях
- **Сложной логике reconciliation** - нужен был фоновый сервис для сопоставления временных ID с CDR записями
- **Задержкам в связывании данных** - reconciliation работает с интервалом 10 секунд
- **Дублированию логов** - при сбоях могли создаваться повторные записи

## Решение

Использование **Asterisk uniqueid** как основного надежного идентификатора звонка:

### 1. WebSocket Gateway для call events (Backend)

Создан `CallEventsGateway` ([call-events.gateway.ts](../apps/back/src/app/modules/calls/gateways/call-events.gateway.ts)):

- Подписывается на AMI события от Asterisk (`Newchannel`, `DialBegin`, `Hangup`)
- Извлекает Asterisk `uniqueid` из событий
- Передает события операторам через WebSocket в реальном времени
- Требует JWT аутентификацию
- Связывает SIP extension с userId для таргетированной доставки

**События:**
```typescript
{
  event: 'call_initiated' | 'call_ended',
  uniqueid: string,           // Надежный Asterisk uniqueid
  extension: string,
  channel: string,
  direction: 'inbound' | 'outbound',
  remoteNumber: string,
  timestamp: string
}
```

### 2. Миграция базы данных

Создан уникальный индекс на `asteriskUniqueId` ([1735478400000-AddUniqueIndexOnAsteriskUniqueId.ts](../apps/back/src/app/modules/calls/migrations/1735478400000-AddUniqueIndexOnAsteriskUniqueId.ts)):

```sql
CREATE UNIQUE INDEX "IDX_call_logs_asteriskUniqueId" 
ON "call_logs" ("asteriskUniqueId") 
WHERE "asteriskUniqueId" IS NOT NULL
```

Преимущества:
- Быстрый поиск по `asteriskUniqueId`
- Предотвращение дублирования логов с одинаковым uniqueid
- NULL значения допускаются (для legacy записей)

### 3. Обновление CdrService (Backend)

Изменения в [cdr.service.ts](../apps/back/src/app/modules/calls/services/cdr.service.ts):

- `createCallLog()` теперь принимает `asteriskUniqueId` как приоритетный параметр
- Проверка на существующий лог с таким uniqueid перед созданием нового
- Обновление существующего лога вместо создания дубликата
- Приоритеты идентификаторов: `asteriskUniqueId` > `sipCallId` > `clientCallId`

```typescript
async createCallLog(data: Partial<CallLog>): Promise<CallLog> {
  // Если asteriskUniqueId предоставлен, проверяем дубликаты
  if (data.asteriskUniqueId) {
    const existing = await this.callLogRepo.findOne({
      where: { asteriskUniqueId: data.asteriskUniqueId },
    });
    if (existing) {
      // Обновляем существующий лог вместо создания дубликата
      Object.assign(existing, { ...data, updatedAt: new Date() });
      return await this.callLogRepo.save(existing);
    }
  }
  // ... создание нового лога
}
```

### 4. Упрощение ReconciliationService (Backend)

Обновлен [reconciliation.service.ts](../apps/back/src/app/modules/calls/services/reconciliation.service.ts):

- **Приоритет 1**: Поиск по `asteriskUniqueId` (самый надежный)
- **Приоритет 2**: Поиск по `sipCallId` (может содержать uniqueid)
- **Приоритет 3**: Legacy поддержка `clientCallId` через `userfield`

Процесс reconciliation стал быстрее и надежнее, так как основная работа теперь делается через WebSocket в момент инициации звонка.

### 5. CallEventsService (Frontend)

Создан новый сервис [call-events.service.ts](../apps/front/src/app/softphone/services/call-events.service.ts):

- Подключается к WebSocket namespace `/call-events`
- Получает события звонков в реальном времени
- Хранит `currentCallUniqueId` в signal для реактивного доступа
- Автоматическое переподключение при обрыве связи
- Требует JWT токен и SIP extension при подключении

**API:**
```typescript
// Подключение
connect(token: string, extension: string)

// Получение текущего uniqueid
getCurrentCallUniqueId(): string | null

// Отключение
disconnect()
```

### 6. Обновление Softphone Component (Frontend)

Изменения в [softphone.component.ts](../apps/front/src/app/softphone/softphone.component.ts):

- Подключение к `CallEventsService` при успешной SIP регистрации
- Получение Asterisk `uniqueid` из WebSocket при инициации звонка
- Передача `asteriskUniqueId` в `saveCallLog()` вместо временного ID
- Отключение от WebSocket при `ngOnDestroy()`

```typescript
async manualRegisterCall(payload) {
  const asteriskUniqueId = this.callEventsSvc.getCurrentCallUniqueId();
  
  const logResult = await this.callHistoryService.saveCallLog(callId, {
    asteriskUniqueId,  // Надежный идентификатор
    note: noteToSave,
    callType: this.callState.callType(),
    scriptBranch: branch,
  });
  
  this.logger.info('Manual CDR registered', { 
    logId: savedLogId, 
    asteriskUniqueId 
  });
}
```

## Архитектура

```
┌──────────────┐     AMI Events      ┌─────────────────┐
│   Asterisk   │ ─────────────────> │  CallEventsGW   │
│              │   Newchannel/       │  (Backend)      │
│  uniqueid:   │   DialBegin         │                 │
│  1234.56     │                     │  Extract        │
└──────────────┘                     │  uniqueid       │
                                     └────────┬────────┘
                                              │ WebSocket
                                              │ emit('call_event')
                                     ┌────────▼────────┐
                                     │ CallEventsService│
                                     │  (Frontend)      │
                                     │                  │
                                     │  Store uniqueid  │
                                     │  in signal       │
                                     └────────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │   Softphone     │
                                     │   Component     │
                                     │                 │
                                     │ Save log with   │
                                     │ asteriskUniqueId│
                                     └────────┬────────┘
                                              │ POST /api/cdr/log
                                     ┌────────▼────────┐
                                     │   CdrService    │
                                     │                 │
                                     │ Save/update log │
                                     │ by uniqueid     │
                                     └─────────────────┘
```

## Преимущества

### ✅ Надежность
- **Нет временных ID** - используется стабильный Asterisk uniqueid
- **Нет дублирования** - уникальный индекс предотвращает создание дубликатов
- **Нет потери данных** - uniqueid доступен сразу при инициации звонка

### ⚡ Производительность
- **Реал-тайм доставка** - WebSocket передает uniqueid мгновенно
- **Меньше нагрузки** - reconciliation работает быстрее благодаря приоритетному поиску
- **Индексированный поиск** - UNIQUE индекс на asteriskUniqueId

### 🔄 Обратная совместимость
- Legacy логи с `clientCallId` продолжают работать
- Reconciliation поддерживает старые идентификаторы
- Постепенная миграция существующих данных

### 🛠️ Упрощение
- Меньше кода для сопоставления ID
- Понятная логика приоритетов
- Меньше edge cases для обработки

## Миграция существующих данных

Существующие логи с временными ID продолжат работать:

1. ReconciliationService найдет CDR записи по `clientCallId` (через `userfield`)
2. Обновит `asteriskUniqueId` в логе
3. Следующие обращения будут использовать надежный uniqueid

Новые логи сразу создаются с `asteriskUniqueId` благодаря WebSocket.

## Конфигурация

### Backend

В `CallsModule` добавлены:
- `CallEventsGateway` в providers
- `JwtModule` для аутентификации WebSocket
- `AmiModule` для получения AMI событий

### Frontend

В `softphone.component.ts`:
- Инжектируется `CallEventsService`
- Подключение при `registered` событии
- Отключение в `ngOnDestroy()`

## Тестирование

### 1. Проверка WebSocket подключения
```bash
# В консоли браузера после SIP регистрации должно появиться:
[CallEventsService] Connected to call-events gateway
[CallEventsService] Extension registered: { extension: 'operator1', userId: '...' }
```

### 2. Проверка получения uniqueid
```bash
# При инициации звонка:
[CallEventsService] Received call event: {
  event: 'call_initiated',
  uniqueid: '1735478123.45',
  extension: 'operator1',
  ...
}
```

### 3. Проверка сохранения лога
```bash
# При сохранении лога звонка:
[Softphone] Manual CDR registered: {
  logId: 'uuid-...',
  asteriskUniqueId: '1735478123.45',
  callId: 'c-...'
}
```

### 4. Проверка базы данных
```sql
-- Проверка индекса
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'call_logs' 
  AND indexname = 'IDX_call_logs_asteriskUniqueId';

-- Проверка уникальности
SELECT "asteriskUniqueId", COUNT(*) 
FROM call_logs 
WHERE "asteriskUniqueId" IS NOT NULL 
GROUP BY "asteriskUniqueId" 
HAVING COUNT(*) > 1;
-- Должно вернуть 0 строк
```

## Дальнейшие улучшения

1. **Расширение событий**: Добавить события `call_answered`, `call_held`, `call_transferred`
2. **Статистика**: Агрегация метрик по uniqueid в реальном времени
3. **Отладка**: Dashboard для мониторинга WebSocket подключений
4. **Кэширование**: Redis для хранения маппинга extension -> userId
5. **Масштабирование**: Sticky sessions или Redis Pub/Sub для multi-instance setup

## Зависимости

- **Backend**: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `asterisk-ami-client`
- **Frontend**: `socket.io-client` (уже установлен)

## См. также

- [WEBSOCKET_NOTIFICATIONS.md](./WEBSOCKET_NOTIFICATIONS.md) - WebSocket уведомления
- [CALL_LOG_TASK_LINKING.txt](../CALL_LOG_TASK_LINKING.txt) - Связь логов с задачами
- [AMI Service](../apps/back/src/app/modules/ami/ami.service.ts) - Интеграция с Asterisk Manager Interface
