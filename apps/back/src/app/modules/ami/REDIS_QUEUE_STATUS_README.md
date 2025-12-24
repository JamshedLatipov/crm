# Queue Status Redis Integration

Система для хранения и управления актуальным статусом операторов очередей и каналов в Redis.

## Архитектура

### Компоненты

1. **RedisQueueStatusService** (`redis-queue-status.service.ts`)
   - Основной сервис для работы с Redis
   - Управляет статусом операторов, каналов и очередей
   - Методы: `set*Status()`, `get*Status()`, `remove*Status()`, `getFullSnapshot()`
   - TTL: 1 час для всех ключей

2. **AmiService** (обновленный)
   - Обрабатывает AMI события от Asterisk
   - Автоматически обновляет статус в Redis при событиях:
     - `QueueMemberStatus`, `QueueMemberAdded`, `QueueMemberRemoved`
     - `QueueMemberPaused`, `QueueMemberUnpaused`
     - `Newchannel`, `Hangup`, `BridgeCreate`, `BridgeEnter`
     - `VarSet`, `QueueCallerJoin`, `QueueCallerLeave`

3. **ContactCenterService** (обновленный)
   - Теперь использует Redis для получения актуального статуса
   - Fallback на БД, если Redis недоступен
   - Методы: `getOperatorsSnapshot()`, `getQueuesSnapshot()`, `getDashboardData()`

4. **QueueStatusController** (новый)
   - REST API для управления и просмотра статуса
   - Endpoints для операторов, каналов, очередей

## Структура данных в Redis

### Ключи

- **Операторы**: `queue:operator:{memberId}`
- **Каналы**: `channel:{channelId}`
- **Очереди**: `queue:status:{queueName}`
- **Индексы**: 
  - `queue:operators:all` (set всех memberId)
  - `channels:all` (set всех channelId)
  - `queues:all` (set всех queueName)

### OperatorStatusData

```typescript
{
  memberId: string;           // уникальный идентификатор оператора
  memberName: string;         // имя оператора (e.g., PJSIP/1001)
  queueName: string;          // очередь, к которой привязан оператор
  paused: boolean;            // паузирован ли оператор
  status: 'idle' | 'in_call' | 'paused' | 'offline';
  currentCallId?: string;     // ID текущего вызова (если есть)
  updatedAt: number;          // timestamp обновления
  wrapUpTime?: number;        // секунды оставшегося wrap-up времени
}
```

### ChannelStatusData

```typescript
{
  channelId: string;          // уникальный ID канала
  channelName: string;        // имя канала
  state: 'down' | 'reserved' | 'off_hook' | 'dialing' | 'ring' | 'up' | 'busy';
  extension?: string;         // расширение
  context?: string;           // контекст диалплана
  priority?: number;          // приоритет
  updatedAt: number;          // timestamp обновления
  callDuration?: number;      // длительность вызова в секундах
}
```

### QueueStatusData

```typescript
{
  queueName: string;          // имя очереди
  totalMembers: number;       // всего членов очереди
  activeMembers: number;      // активных членов (не на паузе)
  callsWaiting: number;       // вызовов в очереди
  longestWaitTime?: number;   // самое долгое время ожидания (сек)
  updatedAt: number;          // timestamp обновления
}
```

## REST API Endpoints

### Операторы

```
GET    /api/queue-status/operators              - Все операторы
GET    /api/queue-status/operators/:memberId    - Конкретный оператор
GET    /api/queue-status/operators/queue/:queueName - Операторы очереди
POST   /api/queue-status/operators              - Установить статус оператора
DELETE /api/queue-status/operators/:memberId    - Удалить оператора
```

### Каналы

```
GET    /api/queue-status/channels               - Все каналы
GET    /api/queue-status/channels/:channelId    - Конкретный канал
POST   /api/queue-status/channels               - Установить статус канала
DELETE /api/queue-status/channels/:channelId    - Удалить канал
```

### Очереди

```
GET    /api/queue-status/queues                 - Все очереди
GET    /api/queue-status/queues/:queueName      - Конкретная очередь
POST   /api/queue-status/queues                 - Установить статус очереди
```

### Дашборд

```
GET    /api/queue-status/snapshot               - Полный снимок (операторы, каналы, очереди)
DELETE /api/queue-status/clear                  - Очистить все данные Redis
```

## Примеры использования

### Получить всех операторов

```bash
curl http://localhost:3000/api/queue-status/operators
```

Ответ:
```json
{
  "success": true,
  "data": [
    {
      "memberId": "PJSIP/1001",
      "memberName": "PJSIP/1001",
      "queueName": "sales",
      "paused": false,
      "status": "idle",
      "currentCallId": null,
      "updatedAt": 1703337600000,
      "wrapUpTime": null
    }
  ],
  "count": 1
}
```

### Получить операторов конкретной очереди

```bash
curl http://localhost:3000/api/queue-status/operators/queue/sales
```

### Получить полный снимок состояния

```bash
curl http://localhost:3000/api/queue-status/snapshot
```

Ответ:
```json
{
  "success": true,
  "data": {
    "operators": [...],
    "channels": [...],
    "queues": [...],
    "timestamp": 1703337600000
  }
}
```

### Вручную установить статус оператора (для тестирования)

```bash
curl -X POST http://localhost:3000/api/queue-status/operators \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "PJSIP/1001",
    "memberName": "PJSIP/1001",
    "queueName": "sales",
    "paused": false,
    "status": "in_call",
    "currentCallId": "1234567890.1",
    "updatedAt": 1703337600000
  }'
```

## Интеграция с ContactCenterGateway

ContactCenterService автоматически использует Redis при доступности:

```typescript
// В любом контроллере/сервисе
constructor(private contactCenterService: ContactCenterService) {}

// Получить актуальные данные (из Redis если доступна, иначе из БД)
const { operators, queues } = await this.contactCenterService.tick();

// Получить полный дашборд
const dashboardData = await this.contactCenterService.getDashboardData();
```

## Обработка AMI событий

Сервис автоматически слушает AMI события:

### QueueMemberStatus
- Обновляет статус оператора в Redis
- Записывает состояние (idle, in_call, paused, offline)

### QueueMemberPaused / QueueMemberUnpaused
- Обновляет флаг паузы оператора

### Newchannel / Hangup
- Создает/удаляет запись канала в Redis
- Отслеживает жизненный цикл канала

### BridgeCreate / BridgeEnter
- Обновляет статус канала (переводит в "up")

## Production Notes

1. **TTL**: Все ключи в Redis имеют TTL 1 час. Если AMI не отправляет обновления, статус автоматически удалится из Redis.

2. **Fallback на БД**: ContactCenterService имеет fallback на PostgreSQL, если Redis недоступна. Система будет работать, но с задержкой.

3. **Мониторинг**: Логируйте ошибки Redis для отладки подключения:
   ```
   [RedisQueueStatusService] Failed to set operator status: ...
   ```

4. **Масштабируемость**: Redis handles thousands of operators/channels efficiently. Для очень больших систем (10k+) рассмотрите:
   - Cluster Redis
   - Пайпинг для batch updates
   - Более короткий TTL

## Тестирование

### Локальное тестирование

1. Убедитесь, что Redis работает:
   ```bash
   redis-cli ping
   # Должно вернуть: PONG
   ```

2. Проверьте статус сервиса:
   ```bash
   curl http://localhost:3000/api/queue-status/snapshot
   ```

3. Создайте тестовые данные:
   ```bash
   curl -X POST http://localhost:3000/api/queue-status/operators \
     -H "Content-Type: application/json" \
     -d '{"memberId":"test-1","memberName":"test-1","queueName":"test","paused":false,"status":"idle","updatedAt":1703337600000}'
   ```

4. Проверьте наличие данных в Redis:
   ```bash
   redis-cli
   > KEYS queue:operator:*
   > GET queue:operator:test-1
   > SMEMBERS queue:operators:all
   ```

### Очистка тестовых данных

```bash
curl -X DELETE http://localhost:3000/api/queue-status/clear
```

## Миграция с БД на Redis

ContactCenterService поддерживает плавную миграцию:

1. **Фаза 1**: Оба источника активны (Redis + БД)
   - Если Redis пуст, используется БД
   - AMI события обновляют только Redis

2. **Фаза 2**: Полная миграция
   - Все операторы загружаются в Redis через AMI события
   - Система использует только Redis (БД только для конфига)

3. **Фаза 3** (опционально): Убрать fallback на БД
   - Если нужна максимальная производительность

## Troubleshooting

### Redis connection refused
- Проверьте, что Redis запущен: `redis-cli ping`
- Проверьте REDIS_URL в .env: `redis://localhost:6379`

### Статусы не обновляются
- Проверьте, что AMI подключен и получает события
- Посмотрите логи AmiService: `[AMI EVENT]`
- Проверьте в Redis: `redis-cli KEYS queue:operator:*`

### Неправильный статус оператора
- Может быть задержка между AMI событием и Redis обновлением
- Проверьте параметры mapping в `mapMemberStatus()` и `mapChannelState()`

## Дальнейшие улучшения

- [ ] Persistent subscription на изменения Redis (WebSocket)
- [ ] Историчность: ведение логов изменений статуса
- [ ] Аналитика: метрики по времени обработки вызовов
- [ ] Batching: группировка AMI событий для оптимизации Redis
- [ ] Шардирование: распределение данных по нескольким Redis инстансам
