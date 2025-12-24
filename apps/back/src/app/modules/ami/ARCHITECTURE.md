# Redis Queue Status System - Архитектура и интеграция

## Обзор

Реализована система для хранения и управления **актуальным статусом операторов очередей и каналов в Redis**. Система автоматически обновляется при получении AMI событий от Asterisk.

## Компоненты системы

### 1. RedisQueueStatusService (`redis-queue-status.service.ts`)
**Ядро системы** - сервис для работы с Redis

**Функции:**
- Управление статусом операторов (memberId → OperatorStatusData)
- Управление статусом каналов (channelId → ChannelStatusData)  
- Управление статусом очередей (queueName → QueueStatusData)
- Полный снимок состояния (getFullSnapshot)

**Ключи в Redis:**
```
queue:operator:{memberId}      → OperatorStatusData JSON
channel:{channelId}            → ChannelStatusData JSON
queue:status:{queueName}       → QueueStatusData JSON

queue:operators:all            → Set всех memberId (индекс)
channels:all                   → Set всех channelId (индекс)
queues:all                     → Set всех queueName (индекс)
```

**TTL:** 1 час для всех ключей

### 2. AmiService (обновленный) (`ami.service.ts`)
**Слушает AMI события** и обновляет Redis в реальном времени

**Обрабатываемые события:**
- `QueueMemberStatus` - Изменение статуса оператора
- `QueueMemberAdded` - Оператор присоединился к очереди
- `QueueMemberRemoved` - Оператор удален из очереди  
- `QueueMemberPaused/Unpaused` - Оператор на паузе/активный
- `Newchannel` - Новый вызов (канал создан)
- `Hangup` - Вызов завершен (канал удален)
- `BridgeCreate/BridgeEnter` - Вызов подключен
- `VarSet` - Изменение переменного (обновление состояния канала)
- `QueueCallerJoin/Leave` - Вызыватель вошел/вышел из очереди

**Поток обработки:**
```
AMI Event
  ↓
[AmiService.onEvent()]
  ├→ [Store в AriEventStoreService]  (сохранение истории)
  └→ [handleStatusUpdate()]           (обновление Redis)
      ├→ handleQueueMemberStatus()
      ├→ handleNewChannel()
      ├→ handleHangup()
      ├→ handleBridgeEvent()
      └→ handleQueueCallerEvent()
          ↓
      [RedisQueueStatusService.set*Status()]
          ↓
      Redis обновлена (актуальные данные)
```

### 3. ContactCenterService (обновленный) (`contact-center.service.ts`)
**API слой** для получения статуса операторов и очередей

**Стратегия получения данных:**
```
Запрос getOperatorsSnapshot()
  ↓
Try: RedisQueueStatusService.getAllOperators()
  ├→ Success: Вернуть из Redis (быстро, ~1ms)
  └→ Error: Fallback на БД (медленнее, ~10-50ms)
```

**Методы:**
- `getOperatorsSnapshot()` - Все операторы со статусом
- `getQueueOperators(queueName)` - Операторы конкретной очереди
- `getQueuesSnapshot()` - Все очереди со статусом
- `getQueueStatus(queueName)` - Статус конкретной очереди
- `getDashboardData()` - Полные данные дашборда
- `tick()` - Для polling из gateway

**Fallback механизм:**
1. Если Redis доступен и содержит данные → используем Redis (быстро)
2. Если Redis недоступен → падаем на БД (надежно)
3. Система всегда работает, просто с разной скоростью

### 4. QueueDataSyncService (`queue-data-sync.service.ts`)
**Синхронизирует данные БД в Redis** при старте приложения

**Что делает:**
- При инициализации модуля (`onModuleInit`)
- Загружает всех операторов из `queue_members`
- Загружает все очереди из `queues`
- Сохраняет в Redis актуальный конфиг

**Методы:**
- `syncQueueMembers()` - Синхронизировать операторов
- `syncQueues()` - Синхронизировать очереди
- `resyncAll()` - Ручная переиндексация
- `getSyncStatus()` - Проверить синхронизацию

### 5. QueueStatusController (`queue-status.controller.ts`)
**REST API** для управления и просмотра статуса

**Endpoints:**

#### Операторы
```
GET    /api/queue-status/operators              - Все операторы
GET    /api/queue-status/operators/:memberId    - Конкретный оператор
GET    /api/queue-status/operators/queue/:name  - Операторы очереди
POST   /api/queue-status/operators              - Установить статус (тест)
DELETE /api/queue-status/operators/:memberId    - Удалить оператора
```

#### Каналы
```
GET    /api/queue-status/channels               - Все каналы
GET    /api/queue-status/channels/:channelId    - Конкретный канал
POST   /api/queue-status/channels               - Установить статус (тест)
DELETE /api/queue-status/channels/:channelId    - Удалить канал
```

#### Очереди
```
GET    /api/queue-status/queues                 - Все очереди
GET    /api/queue-status/queues/:queueName      - Конкретная очередь
POST   /api/queue-status/queues                 - Установить статус (тест)
```

#### Дашборд
```
GET    /api/queue-status/snapshot               - Полный снимок
DELETE /api/queue-status/clear                  - Очистить все (!)
```

#### Синхронизация
```
GET    /api/queue-status/sync/status            - Статус синхронизации
POST   /api/queue-status/sync/resync            - Пересинхронизировать
```

## Структура данных

### OperatorStatusData
```typescript
{
  memberId: string;               // уникальный ID (e.g., "PJSIP/1001")
  memberName: string;             // имя оператора
  queueName: string;              // очередь оператора
  paused: boolean;                // на паузе?
  status: 'idle' | 'in_call' | 'paused' | 'offline';
  currentCallId?: string;         // ID текущего вызова
  updatedAt: number;              // timestamp обновления
  wrapUpTime?: number;            // остаток wrap-up (сек)
}
```

### ChannelStatusData
```typescript
{
  channelId: string;              // уникальный ID канала
  channelName: string;            // имя канала
  state: 'down' | 'reserved' | 'off_hook' | 'dialing' | 'ring' | 'up' | 'busy';
  extension?: string;             // расширение
  context?: string;               // контекст диалплана
  priority?: number;              // приоритет
  updatedAt: number;              // timestamp
  callDuration?: number;          // длительность вызова (сек)
}
```

### QueueStatusData
```typescript
{
  queueName: string;              // имя очереди
  totalMembers: number;           // всего членов
  activeMembers: number;          // активных членов
  callsWaiting: number;           // вызовов в очереди
  longestWaitTime?: number;       // самое долгое ожидание (сек)
  updatedAt: number;              // timestamp
}
```

## Поток данных

### Real-time обновления

```
┌─────────────────────────────────────────────────────┐
│                    Asterisk (AMI)                   │
│  (Генерирует события: QueueMemberStatus, Hangup..) │
└─────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │      AmiService.onEvent()          │
        │  (Получает и обрабатывает события)  │
        └─────────────────────────────────────┘
                    ↓              ↓
    ┌──────────────────┐  ┌─────────────────┐
    │ AriEventStore    │  │ AmiService      │
    │ (историю)       │  │handleStatusUp..│
    └──────────────────┘  └─────────────────┘
                              ↓
        ┌─────────────────────────────────────┐
        │   RedisQueueStatusService           │
        │   setOperatorStatus(data)           │
        │   setChannelStatus(data)            │
        │   setQueueStatus(data)              │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │           Redis Database            │
        │  (Актуальные данные в памяти)      │
        └─────────────────────────────────────┘
```

### API запросы

```
┌─────────────────────────────────┐
│    Клиент/Фронтенд              │
│  (Запрашивает статус)           │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│   QueueStatusController         │
│  /api/queue-status/operators    │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│   ContactCenterService          │
│  getOperatorsSnapshot()         │
└─────────────────────────────────┘
                ↓
    ┌───────────────────────┐
    │ Try Redis first       │
    └───────────────────────┘
      ↓               ↓
   Success         Error/Empty
     ↓                 ↓
  ┌────────┐      ┌──────────┐
  │ Redis  │      │ Fallback │
  │(~1ms)  │      │   DB     │
  └────────┘      │(~50ms)   │
     ↓            └──────────┘
     └─────────┬──────────┘
               ↓
    OperatorStatus[] 
    (JSON response)
```

## Фазы инициализации

### Фаза 1: Запуск приложения
```
NestJS Application Start
        ↓
Load AmiModule
        ↓
┌─────────────────────────────────────────────┐
│ QueueDataSyncService.onModuleInit()         │
│ ├─ syncQueueMembers()                       │
│ │  └─ Загрузить всех операторов из БД      │
│ │     → Сохранить в Redis                   │
│ └─ syncQueues()                             │
│    └─ Загрузить все очереди из БД           │
│       → Сохранить в Redis                   │
└─────────────────────────────────────────────┘
        ↓
Load AmiService
        ↓
Connect to AMI (Asterisk)
        ↓
✓ Ready to receive events
```

### Фаза 2: Runtime операция
```
Asterisk Event (e.g., QueueMemberStatus)
        ↓
AmiService получает событие
        ↓
handleStatusUpdate() выбирает нужный handler
        ↓
handler вызывает:
  RedisQueueStatusService.set*Status(data)
        ↓
Redis обновлена
```

### Фаза 3: API запрос
```
HTTP GET /api/queue-status/operators
        ↓
QueueStatusController.getAllOperators()
        ↓
ContactCenterService.getOperatorsSnapshot()
        ↓
Try: RedisQueueStatusService.getAllOperators()
        ├─ Success → Redis возвращает данные
        └─ Error → Fallback на БД
        ↓
Вернуть JSON response
```

## Преимущества архитектуры

### 1. Производительность
- Redis в памяти: **~1 ms** для запроса
- БД на диске: **~10-50 ms** для запроса
- **50x ускорение** для типичного запроса

### 2. Надежность
- **Fallback на БД** - система работает даже если Redis упал
- **Автосинхронизация** - AMI события обновляют Redis
- **Периодический resync** - может быть добавлен для восстановления консистентности

### 3. Масштабируемость
- Redis Cluster поддерживается
- Батчирование AMI событий возможно
- TTL предотвращает утечки памяти

### 4. Отладка
- **API endpoints** для ручного управления и тестирования
- **Sync status endpoint** для проверки консистентности
- **Full snapshot** для отладки и мониторинга

## Миграция / Откат

### Миграция на Redis (безопасная)

**Этап 1:** Redis работает параллельно
```
ContactCenterService → Try Redis → Success
                              ↓
                          Return data
```

**Этап 2:** Redis полностью готова
```
✓ Redis содержит все актуальные данные
✓ Все новые события идут в Redis
✓ БД используется только для конфига
```

**Этап 3** (опционально): Убрать код fallback
```
// Убрать try-catch для максимальной производительности
const operators = await this.redisStatus.getAllOperators();
```

### Откат (если что-то сломалось)

**Просто вернуть fallback:**
```typescript
// ContactCenterService останется использовать БД
try {
  const redisOps = await this.redisStatus.getAllOperators();
  // ...
} catch (e) {
  // Используем БД
  const members = await this.membersRepo.find();
  // ...
}
```

**Итог:** Система работает, просто медленнее

## Интеграция с существующим кодом

### ContactCenterGateway (без изменений!)
```typescript
// Так же как было, но теперь данные из Redis
const { operators, queues } = await this.contactCenterService.tick();
this.server.emit('update', { operators, queues });
```

### Новые сервисы могут использовать Redis напрямую
```typescript
constructor(private redisStatus: RedisQueueStatusService) {}

async getQueueStats(queueName: string) {
  const [operators, queueStatus] = await Promise.all([
    this.redisStatus.getQueueOperators(queueName),
    this.redisStatus.getQueueStatus(queueName),
  ]);
  return { operators, queueStatus };
}
```

## Deployment в Production

1. **Redis должен быть запущен** (в docker-compose уже есть)

2. **Переменные окружения:**
   ```
   REDIS_URL=redis://redis:6379
   AMI_HOST=asterisk
   AMI_PORT=5038
   AMI_USER=admin
   AMI_PASSWORD=amp111
   ```

3. **Мониторинг:**
   - Логировать ошибки RedisQueueStatusService
   - Проверять `/api/queue-status/sync/status` периодически
   - Алерт если DB operators > Redis operators × 1.5

4. **Резервные копии:**
   - Redis не требует backup (это кэш, не источник истины)
   - Источник истины - PostgreSQL

## Дальнейшие улучшения

- [ ] WebSocket subscription на изменения
- [ ] Историчность: логирование всех изменений
- [ ] Аналитика: метрики времени обработки
- [ ] Batching: группировка AMI событий
- [ ] Redis Cluster для HA
- [ ] Сжатие данных для экономии памяти
