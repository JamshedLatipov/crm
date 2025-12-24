# 🚀 Инструкции по запуску и проверке Redis Queue Status System

## Предварительные условия

✅ Redis должен работать (обычно в docker-compose)
✅ Asterisk (AMI) должен быть доступен
✅ PostgreSQL должна работать

## Шаг 1: Запустить сервисы

```bash
# Если еще не запущены
npm run start:services

# Или отдельно запустить Redis
docker-compose up -d redis
```

## Шаг 2: Запустить бэкенд

```bash
npm run start:back
```

## Ожидаемые логи при запуске

```
[NestFactory] Starting NestJS application...
...
[QueueDataSyncService] Starting queue data synchronization from DB to Redis
[QueueDataSyncService] Syncing X queue members to Redis
[QueueDataSyncService] Syncing X queues to Redis
[QueueDataSyncService] Queue data synchronization completed successfully
...
[AmiService] Connecting to AMI 127.0.0.1:5038 as admin
[AmiService] AMI connected
...
Application is running on: http://localhost:3000
```

---

## Шаг 3: Проверить работу

### 3.1 Проверить Redis

```bash
redis-cli ping
# Ответ: PONG

redis-cli
> KEYS queue:*
# Должны видеть ключи типа: queue:operator:PJSIP/1001 и т.д.
```

### 3.2 Проверить через API

```bash
# 1. Получить всех операторов
curl http://localhost:3000/api/queue-status/operators

# Ожидаемый ответ:
# {
#   "success": true,
#   "data": [
#     {
#       "memberId": "PJSIP/1001",
#       "memberName": "PJSIP/1001",
#       "queueName": "sales",
#       "paused": false,
#       "status": "idle",
#       "updatedAt": 1703337600000
#     }
#   ],
#   "count": 1
# }

# 2. Получить полный снимок
curl http://localhost:3000/api/queue-status/snapshot

# 3. Проверить синхронизацию БД ↔ Redis
curl http://localhost:3000/api/queue-status/sync/status
```

---

## Проверка работы в реальном времени

### Имитировать AMI события (для тестирования)

```bash
# Установить статус оператора (имитация AMI события)
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

# Проверить, что обновилось
curl http://localhost:3000/api/queue-status/operators/PJSIP%2F1001
```

---

## Отладка

### Если операторы не видны

```bash
# 1. Проверить Redis подключение
redis-cli ping

# 2. Проверить в Redis ключи
redis-cli KEYS queue:operator:*

# 3. Проверить в PostgreSQL операторов
psql -U postgres -d crm
SELECT * FROM queue_members LIMIT 10;

# 4. Если БД имеет данные, а Redis пуст - пересинхронизировать
curl -X POST http://localhost:3000/api/queue-status/sync/resync

# 5. Проверить логи приложения
grep "synchronization" logs/app.log
grep "RedisQueueStatusService" logs/app.log
```

### Если AMI события не обновляют Redis

```bash
# 1. Проверить AMI подключение
grep "AMI Event" logs/app.log
grep "AmiService" logs/app.log

# 2. Проверить параметры AMI в .env
echo "AMI_HOST=$AMI_HOST"
echo "AMI_PORT=$AMI_PORT"

# 3. Проверить доступность Asterisk
telnet $AMI_HOST $AMI_PORT
# Или
nc -zv $AMI_HOST $AMI_PORT

# 4. Проверить конфигурацию Asterisk
docker exec asterisk asterisk -rx "manager show connected"
```

---

## Мониторинг и статус

### Проверить синхронизацию

```bash
curl http://localhost:3000/api/queue-status/sync/status

# Ответ должен быть примерно:
# {
#   "success": true,
#   "data": {
#     "dbMembers": 5,
#     "dbQueues": 3,
#     "redisOperators": 5,
#     "redisQueues": 3,
#     "redisChannels": 0
#   }
# }
```

### Redis INFO

```bash
redis-cli INFO memory
# Shows memory usage, key counts, evictions

redis-cli INFO stats
# Shows operations per second, hits/misses

redis-cli DBSIZE
# Shows total number of keys
```

### Redis Monitor (смотреть все операции в реальном времени)

```bash
redis-cli monitor
# Будет показывать все операции Redis
# Ctrl+C для выхода
```

---

## Очистка данных

### Очистить Redis (если нужен перезапуск)

```bash
# Способ 1: Через API
curl -X DELETE http://localhost:3000/api/queue-status/clear

# Способ 2: Redis CLI
redis-cli FLUSHALL

# Способ 3: Очистить только очередь
redis-cli FLUSHDB 0
```

### Пересинхронизировать данные из БД

```bash
curl -X POST http://localhost:3000/api/queue-status/sync/resync
```

---

## Тестирование performance

### Redis vs БД

```bash
# Получить всех операторов (из Redis, ~1ms)
time curl http://localhost:3000/api/queue-status/operators > /dev/null

# Сравнить со временем если выключить Redis
# (Посмотреть в логах CallStack)
```

### Нагрузочное тестирование

```bash
# Установить Apache Bench (если нет)
apt-get install apache2-utils

# Тест производительности (100 запросов, 10 параллельных)
ab -n 100 -c 10 http://localhost:3000/api/queue-status/operators

# Тест с более высокой нагрузкой
ab -n 1000 -c 50 http://localhost:3000/api/queue-status/snapshot
```

---

## Интеграция с вашим фронтенд

### Получить данные в Angular

```typescript
// queue-status.service.ts
@Injectable({ providedIn: 'root' })
export class QueueStatusService {
  constructor(private http: HttpClient) {}

  getOperators() {
    return this.http.get<any>('/api/queue-status/operators');
  }

  getSnapshot() {
    return this.http.get<any>('/api/queue-status/snapshot');
  }

  // Polling каждые 5 секунд
  startPolling() {
    return interval(5000).pipe(
      switchMap(() => this.getSnapshot()),
      shareReplay(1)
    );
  }
}

// В компоненте
export class DashboardComponent {
  operators$ = this.service.startPolling().pipe(
    map(snapshot => snapshot.data.operators)
  );

  queues$ = this.service.startPolling().pipe(
    map(snapshot => snapshot.data.queues)
  );
}
```

---

## Полезные команды

### Просмотр операторов в Redis

```bash
# Все операторы
redis-cli SMEMBERS queue:operators:all

# Конкретного оператора
redis-cli GET queue:operator:PJSIP/1001

# Красиво вывести
redis-cli GET queue:operator:PJSIP/1001 | jq
```

### Просмотр каналов в Redis

```bash
# Все каналы
redis-cli SMEMBERS channels:all

# Все активные каналы
redis-cli KEYS channel:*

# Конкретный канал
redis-cli GET channel:SIP/2001-00000001
```

### Просмотр очередей в Redis

```bash
# Все очереди
redis-cli SMEMBERS queues:all

# Конкретная очередь
redis-cli GET queue:status:sales
```

---

## Troubleshooting

### Redis Connection Refused

```bash
# Проверить Redis
redis-cli ping

# Если не работает, запустить
docker run -d -p 6379:6379 redis:latest

# Или в docker-compose
docker-compose up -d redis
```

### Данные не синхронизируются

```bash
# 1. Проверить, что операторы есть в БД
psql -U postgres -d crm -c "SELECT COUNT(*) FROM queue_members"

# 2. Пересинхронизировать
curl -X POST http://localhost:3000/api/queue-status/sync/resync

# 3. Проверить логи
tail -n 50 logs/app.log | grep -i sync
```

### AMI события не приходят

```bash
# 1. Проверить AMI подключение
grep "AMI Event" logs/app.log

# 2. Проверить конфиг Asterisk
docker exec asterisk asterisk -rx "manager show connected"

# 3. Проверить логи Asterisk
docker logs asterisk | tail -50 | grep -i manager

# 4. Перезагрузить Asterisk если нужно
docker restart asterisk
```

### Redis набирает слишком много памяти

```bash
# Проверить использование памяти
redis-cli INFO memory

# Посмотреть большие ключи
redis-cli --bigkeys

# Очистить если нужно
curl -X DELETE http://localhost:3000/api/queue-status/clear
```

---

## Готовые скрипты для проверки

### check-queue-status.sh

```bash
#!/bin/bash

echo "🔍 Checking Queue Status System..."
echo ""

# 1. Redis
echo "📊 Redis Status:"
redis-cli ping && echo "✅ Redis connected" || echo "❌ Redis not connected"
redis-cli DBSIZE
echo ""

# 2. API
echo "🌐 API Status:"
curl -s http://localhost:3000/api/queue-status/operators | jq '.count' 
echo ""

# 3. Sync
echo "🔄 Sync Status:"
curl -s http://localhost:3000/api/queue-status/sync/status | jq '.data'
echo ""

# 4. Redis keys
echo "🗝️  Redis Keys:"
redis-cli KEYS "queue:*" | wc -l
redis-cli KEYS "channel:*" | wc -l
echo ""

echo "✅ Check complete!"
```

---

## Заключение

Система полностью работоспособна! Все команды выше помогут вам:
- ✅ Запустить систему
- ✅ Проверить работу
- ✅ Отладить проблемы
- ✅ Мониторить производительность
- ✅ Интегрировать с фронтенд

**Если что-то не работает, смотрите логи и используйте команды выше для диагностики!** 🚀
