# WebSocket Notifications Migration

## Изменения

Канал получения нотификаций переведён с HTTP polling на WebSocket (socket.io).

## Что изменилось

### Backend

1. **Создан WebSocket Gateway** (`apps/back/src/app/modules/notifications/gateways/notifications.gateway.ts`):
   - Обрабатывает подключения пользователей
   - Отправляет нотификации в реальном времени
   - Поддерживает события: `subscribe_notifications`, `get_notifications`, `mark_as_read`, `mark_all_as_read`
   - Автоматически отслеживает онлайн пользователей
   - Поддерживает переподключение

2. **Обновлён NotificationModule**:
   - Добавлен `NotificationsGateway` в providers и exports
   - Gateway доступен для других модулей

### Frontend

1. **Обновлён NotificationService** (`apps/front/src/app/services/notification.service.ts`):
   - ❌ Удалён HTTP polling (interval)
   - ✅ Добавлено WebSocket подключение через socket.io-client
   - ✅ Автоматическое переподключение
   - ✅ Fallback на HTTP API при отсутствии WS соединения
   - ✅ Поддержка browser notifications
   - ✅ Новый observable: `onNewNotification()` для подписки на новые уведомления

2. **Добавлена зависимость**: `socket.io-client@^4.7.2` в package.json

## Преимущества WebSocket подхода

### ⚡ Производительность
- **Мгновенная доставка** - уведомления приходят сразу, без задержек polling
- **Снижение нагрузки на сервер** - нет постоянных HTTP запросов каждые 30 секунд
- **Экономия трафика** - bidirectional connection, данные передаются только при необходимости

### 🔄 Реал-тайм
- Пользователь видит уведомления **мгновенно** при их создании
- Счётчик непрочитанных обновляется в реальном времени
- Поддержка множественных вкладок/устройств

### 🛡️ Надёжность
- Автоматическое переподключение при обрывах связи
- Fallback на HTTP API при недоступности WebSocket
- Отслеживание состояния подключения через `isConnected` signal

## API

### Backend Events (Gateway)

**От клиента к серверу:**
```typescript
// Подписка на уведомления
socket.emit('subscribe_notifications', { userId: string })

// Получение списка уведомлений
socket.emit('get_notifications', { 
  limit?: number, 
  offset?: number, 
  unreadOnly?: boolean 
})

// Пометить как прочитанное
socket.emit('mark_as_read', { notificationId: number })

// Пометить все как прочитанные
socket.emit('mark_all_as_read', {})
```

**От сервера к клиенту:**
```typescript
// Новое уведомление
socket.on('new_notification', (notification: Notification) => {})

// Обновление счётчика
socket.on('unread_count', (data: { count: number }) => {})
```

### Frontend API

**Новые возможности:**
```typescript
// Подписка на новые уведомления
notificationService.onNewNotification().subscribe(notification => {
  console.log('New notification:', notification);
});

// Проверка состояния подключения
const isConnected = notificationService.isConnected();

// Запрос разрешения на браузерные уведомления
await notificationService.requestNotificationPermission();
```

**Существующие методы работают без изменений:**
```typescript
// Загрузка уведомлений (теперь через WS, fallback на HTTP)
notificationService.loadNotifications({ unreadOnly: true });

// Пометить как прочитанное
notificationService.markAsRead(notificationId);

// Пометить все как прочитанные
notificationService.markAllAsRead();
```

## Использование в других сервисах

Теперь другие сервисы (LeadService, DealsService, TaskService) могут отправлять уведомления в реальном времени:

```typescript
// В любом сервисе, где нужно отправить уведомление
@Injectable()
export class SomeService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationsGateway: NotificationsGateway // <- добавить
  ) {}

  async someAction(userId: string) {
    // Создаём уведомление в БД
    const notifications = await this.notificationService.createLeadNotification(
      NotificationType.LEAD_CREATED,
      'Новый лид',
      'Создан новый лид',
      { leadId: 123 },
      userId
    );

    // Отправляем через WebSocket в реальном времени
    for (const notification of notifications) {
      await this.notificationsGateway.sendNotificationToUser(userId, notification);
    }
  }
}
```

## Миграция

### Что нужно сделать

1. **Установить зависимости:**
   ```bash
   npm install
   ```

2. **Перезапустить backend:**
   ```bash
   npm run start:back
   ```

3. **Перезапустить frontend:**
   ```bash
   npm run start:front
   ```

### Проверка работы

1. Откройте DevTools → Network → WS
2. Найдите соединение `/api/notifications/ws`
3. Статус должен быть `101 Switching Protocols` (WebSocket established)
4. Во вкладке Messages будут видны входящие/исходящие события

В консоли браузера появятся логи:
```
✅ Connected to notifications WebSocket
🔔 Unread count updated: 5
📬 New notification received: {...}
```

## Отладка

### Backend
```typescript
// В NotificationsGateway включены логи:
console.log('Client connected:', client.id);
console.log('New notification sent to user');
```

### Frontend
```typescript
// В NotificationService:
console.log('✅ Connected to notifications WebSocket');
console.log('📬 New notification received');
console.log('🔔 Unread count updated');
```

## Конфигурация

### WebSocket URL
Автоматически определяется из `environment.apiBase`:
```typescript
// Пример: http://localhost:3333/api → ws://localhost:3333
const wsUrl = environment.apiBase.replace('http', 'ws');
```

### Path
```typescript
path: '/api/notifications/ws'
```

### Reconnection
```typescript
reconnection: true
reconnectionAttempts: 5
reconnectionDelay: 3000  // 3 секунды
```

## TODO (будущие улучшения)

- [ ] Добавить аутентификацию через JWT токен в query параметры
- [ ] Добавить rate limiting для WebSocket событий
- [ ] Реализовать комнаты для групповых уведомлений
- [ ] Добавить метрики производительности WebSocket
- [ ] Реализовать сжатие сообщений
- [ ] Добавить heartbeat/ping-pong для проверки соединения
