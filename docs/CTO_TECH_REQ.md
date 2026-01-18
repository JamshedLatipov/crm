# План: Микросервис СТО с настраиваемыми табло и уведомлениями

Отдельный микросервис автоматизации СТО с независимой Angular библиотекой для UI. Включает: PIN-аутентификацию механиков (single-session), admin-панель для настройки электронных табло с сохранением фильтров в БД, zone-based нумерацию очереди (каждая зона имеет свой диапазон номеров), гибкую систему уведомлений клиентов с выбором канала (SMS/WhatsApp/Email), триггеры по статусам заказа (WAITING→IN_PROGRESS→COMPLETED) и кастомные шаблоны сообщений.

## Архитектура микросервиса

### Структура проекта

```
apps/
├── back/                    # Главный CRM сервис (без inventory!)
├── front/                   # Главный CRM frontend
├── sto-service/            # Микросервис СТО
│   ├── src/
│   │   ├── main.ts
│   │   ├── app/
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   │   ├── orders/
│   │   │   │   ├── mechanics/
│   │   │   │   ├── queue/
│   │   │   │   ├── notifications/
│   │   │   │   ├── display/
│   │   │   │   └── inventory-integration/
│   │   │   ├── gateways/
│   │   │   │   └── sto-queue.gateway.ts
│   │   │   └── shared/
│   │   └── assets/
│   ├── project.json
│   └── tsconfig.app.json
└── inventory-service/      # НОВЫЙ: Микросервис инвентаризации
    ├── src/
    │   ├── main.ts
    │   ├── app/
    │   │   ├── app.module.ts
    │   │   ├── modules/
    │   │   │   ├── items/           # Управление запчастями
    │   │   │   ├── stock-movements/ # Движения товара
    │   │   │   ├── suppliers/       # Поставщики
    │   │   │   ├── categories/      # Категории
    │   │   │   └── reservations/    # Резервирование
    │   │   └── shared/
    │   └── assets/
    ├── project.json
    └── tsconfig.app.json

libs/
├── shared/                  # Общие типы между сервисами
│   ├── sto-types/
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   ├── dtos/
│   │   │   └── interfaces/
│   │   └── index.ts
│   └── inventory-types/
│       ├── src/
│       │   ├── entities/
│       │   ├── dtos/
│       │   └── enums/
│       └── index.ts
└── sto-ui/                 # Angular библиотека для СТО UI
    ├── src/
    │   ├── index.ts
    │   ├── lib/
    │   │   ├── components/
    │   │   │   ├── display-board/
    │   │   │   ├── mechanic-terminal/
    │   │   │   ├── admin/
    │   │   │   └── pin-login/
    │   │   ├── services/
    │   │   │   ├── sto-api.service.ts
    │   │   │   └── sto-websocket.service.ts
    │   │   └── sto-ui.module.ts
    │   └── assets/
    ├── project.json
    └── package.json
```

### Inter-service Communication

**1. REST API между сервисами:**
```
CRM → STO:
- GET /api/sto/customers/:contactId/vehicles  (получить авто клиента)
- GET /api/sto/customers/:contactId/orders    (история обслуживания)
- POST /api/sto/orders                         (создать заказ из CRM)

STO → CRM:
- GET /api/crm/contacts/:id                    (данные клиента)
- POST /api/crm/activities                     (логировать активность)
- GET /api/crm/contacts/:id/tags              (проверка VIP статуса)

STO → Inventory:
- GET /api/inventory/items/check               (проверка наличия)
- POST /api/inventory/reservations             (зарезервировать запчасти)
- DELETE /api/inventory/reservations/:id       (отменить резерв)
- POST /api/inventory/items/:id/consume        (списать при завершении)

CRM → Inventory:
- GET /api/inventory/items                     (список запчастей для CRM UI)
- POST /api/inventory/items                    (создать запчасть)
- GET /api/inventory/items/low-stock           (низкие остатки)
```

**2. RabbitMQ для асинхронной коммуникации:**
```
Очереди:
СТО ↔ CRM:
- sto_order_created        (СТО → CRM: создан заказ)
- sto_order_completed      (СТО → CRM: завершён заказ)
- sto_notification_request (СТО → CRM: запрос на отправку уведомления)
- crm_customer_updated     (CRM → СТО: обновлён клиент)

STO ↔ Inventory:
- inventory_check_request  (СТО → Inventory: проверка наличия)
- inventory_check_response (Inventory → СТО: результат проверки)
- inventory_reserved       (Inventory → СТО: запчасти зарезервированы)
- inventory_low_stock      (Inventory → CRM: низкие остатки)
- inventory_restock        (Inventory → СТО: пополнение запчастей)

CRM ↔ Inventory:
- inventory_item_created   (CRM → Inventory: создана запчасть)
- inventory_item_updated   (CRM → Inventory: обновлена запчасть)
```

**3. WebSocket независимый для СТО:**
- WS endpoint: `ws://sto-service:3002/ws` (порт 3002)
- Отдельный gateway для real-time обновлений табло
- Не зависит от CRM WebSocket

**4. Database стратегия:**
- **3 отдельные БД:** `crm_db`, `sto_db`, `inventory_db`
- Полная независимость микросервисов
- Синхронизация через RabbitMQ events + REST API
- Redis для кеширования (клиенты, остатки)

### Управление доступом

**Роль:** Только `admin` может настраивать табло и уведомления
- Проверка через JWT токен из CRM
- Middleware валидирует роль при каждом запросе к `/admin/*` endpoints
- Guard: `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin')`

### QR Self-Service для клиентов

**Концепция:** Клиент самостоятельно становится в очередь через QR-код

**Флоу:**
1. Администратор генерирует QR-код для конкретной зоны (reception/workshop/diagnostic)
2. QR-код содержит ссылку: `https://sto.example.com/queue/join?zone=reception&displayId=abc123`
3. Клиент сканирует QR → открывается публичная веб-форма
4. Клиент вводит: номер телефона, марку авто, тип работ (dropdown)
5. Система:
   - Проверяет клиента в CRM по телефону (через REST API)
   - Если не найден → создаёт минимальную запись в customer_cache
   - Создаёт StoOrder со статусом WAITING
   - Назначает queueNumberInZone
   - Отправляет SMS с номером очереди и ссылкой на статус
6. Клиент получает SMS: "Вы в очереди №5. Отслеживать: https://sto.example.com/queue/status/ORDER_ID"

**Безопасность:**
- Public endpoint без JWT (защита через rate limiting + reCAPTCHA)
- Валидация телефона (формат +992...)
- Ограничение: 1 заказ с одного номера телефона в течение 30 минут
- QR-коды с временным токеном (TTL 24 часа, можно продлить)

**Tracking Page (Публичная):**
- URL: `/queue/status/:orderId?phone=+992...` (валидация по телефону)
- Показывает: текущий номер в очереди, примерное время ожидания, статус
- Real-time обновления через WebSocket или polling каждые 30 сек
- Кнопка "Отменить запись" (только если статус = WAITING)

## Шаги

### 1. Создать backend entities и migrations

а) `DisplayConfig` (id, name: 'Табло приёмки', location, filters JSONB: `{zones: ['reception'], workTypes: ['diagnostic'], showBlocked: true}`, isActive, displayOrder)

б) `StoOrder` с `zone` enum (RECEPTION/WORKSHOP/DIAGNOSTIC/BODYWORK), `queueNumberInZone` integer (вычисляемый на основе зоны: reception 1-99, workshop 100-199, diagnostic 200-299, bodywork 300-399), глобальный `queueNumber` для отображения

в) `StoNotificationRule` (id, name: 'Уведомление о готовности', triggerStatus enum (COMPLETED/IN_PROGRESS/WAITING/BLOCKED), channels JSONB array ['sms', 'whatsapp'], templateId FK, delay minutes, isActive)

г) `StoMessageTemplate` (id, name, channel, subject, body с переменными `{{customerName}}`, `{{vehicleMake}}`, `{{licensePlate}}`, `{{estimatedTime}}`)

Добавить миграции в [apps/sto-service/src/app/modules/](apps/sto-service/src/app/modules/) для каждого соответствующего модуля (display, orders, notifications, qr-codes).

### 2. Реализовать zone-based queue numbering

В `QueueManagerService` метод `assignQueueNumber(order: StoOrder): number` — логика: читать `SELECT MAX(queueNumberInZone) FROM sto_orders WHERE zone = ? AND DATE(createdAt) = CURRENT_DATE`, инкрементировать внутри диапазона зоны (reception: startAt=1 maxAt=99, workshop: 100-199 и т.д.), если достигнут лимит выбросить исключение "Превышен лимит заказов для зоны". 

Добавить cron `@Cron('0 0 * * *')` для сброса счётчиков в полночь (установить флаг `queueResetDate` в Redis или отдельную таблицу). 

Глобальный `queueNumber` вычисляется как `zoneBaseNumber + queueNumberInZone` для совместимости с табло.

### 3. Создать систему уведомлений с шаблонами

а) Создать `apps/sto-service/src/app/modules/notifications/notification.types.ts` с типами уведомлений: `STO_ORDER_READY`, `STO_ORDER_STARTED`, `STO_ORDER_DELAYED`, `STO_ORDER_CREATED`, `STO_ORDER_BLOCKED`

б) Создать `StoNotificationService` в `apps/sto-service/src/app/modules/notifications/` с методом `processStatusChange(order: StoOrder, oldStatus, newStatus)` — находить активные rules через `StoNotificationRuleRepo.find({triggerStatus: newStatus, isActive: true})`, для каждого rule:
   - Загружать template
   - Рендерить через handlebars/mustache подставляя переменные из order
   - Для каждого channel из rule.channels отправлять через RabbitMQ:
     - Queue `sto_notification_request` в CRM MessagesModule для SMS/WhatsApp/Email
     - Payload: `{ channel, recipient, message, orderId }`
   - Добавить optional delay: `setTimeout(() => send(), rule.delay * 60000)`

Hook в `StoOrderService.updateStatus()` для автотриггера.

### 4. Реализовать admin UI для настройки табло

Создать в Angular библиотеке [libs/sto-ui/src/lib/components/admin/display-config/](libs/sto-ui/src/lib/components/admin/display-config/):

а) Компонент `DisplayConfigListComponent` с таблицей всех табло (название, зона, фильтры, активность), кнопки "Добавить табло"/"Редактировать"/"Удалить"

б) Диалог `DisplayConfigDialogComponent` с формой:
   - Название
   - Location input
   - Multi-select для zones (RECEPTION/WORKSHOP/DIAGNOSTIC/BODYWORK)
   - Multi-select для workTypes (maintenance/repair/diagnostic/bodywork)
   - Checkbox "Показывать блокированные"
   - Toggle isActive
   - Preview секция показывающая примерные данные по фильтрам

API endpoints:
- `GET /admin/sto/display-configs`
- `POST /admin/sto/display-configs`
- `PUT /admin/sto/display-configs/:id`
- `DELETE /admin/sto/display-configs/:id`

### 5. Реализовать admin UI для уведомлений

Создать в Angular библиотеке [libs/sto-ui/src/lib/components/admin/notifications/](libs/sto-ui/src/lib/components/admin/notifications/):

а) `NotificationRulesListComponent` с таблицей правил (название, триггер-статус, каналы, шаблон, активность)

б) Диалог `NotificationRuleDialogComponent` с формой:
   - Название
   - Dropdown для triggerStatus (из StoNotificationTrigger enum)
   - Chips multi-select для channels (SMS/WhatsApp/Email/Telegram)
   - Select для templateId
   - Delay input (минуты)
   - Toggle isActive

в) `MessageTemplatesComponent` для CRUD шаблонов:
   - Monaco editor для body с autocomplete переменных `{{customerName}}`
   - Preview с тестовыми данными

API:
- `GET/POST/PUT/DELETE /admin/sto/notification-rules`
- `GET/POST/PUT/DELETE /admin/sto/message-templates`

### 6. Модифицировать display board для работы с БД-конфигурацией

В `StoDisplayBoardComponent` при `ngOnInit()`:
- Читать `displayId` из query params
- Загружать конфигурацию через `GET /sto/display-configs/:displayId`
- Извлекать filters
- Подключаться к WebSocket отправляя `register_display` событие с `{displayId, filters}`

Gateway в `handleRegisterDisplay()`:
- Сохраняет маппинг `displayId → {socketId, filters}`
- При broadcast `queue_update` фильтрует данные: `orders.filter(o => filters.zones.includes(o.zone) && (!filters.workTypes || filters.workTypes.includes(o.workType)) && (filters.showBlocked || o.status !== 'BLOCKED'))`

На UI:
- Добавить header с названием табло из config.name
- Индикатор zone (цветовые badges)
- Отображение `queueNumberInZone` вместо глобального для clarity

### 7. Реализовать QR Self-Service для клиентов

**Backend (apps/sto-service/):**

а) Создать `QrCodeModule` с:
- Entity `QrCode` (id, zone, displayId, token UUID, expiresAt, isActive, createdBy admin)
- `QrCodeService.generate(zone, displayId, ttlHours)` → возвращает token и QR image URL
- Controller `GET /admin/sto/qr-codes` (список), `POST /admin/sto/qr-codes` (генерация)
- Controller `GET /admin/sto/qr-codes/:id/download` (скачать PNG/SVG)
- Использовать библиотеку `qrcode` для генерации

б) Создать Public API endpoints (без JWT auth):
```typescript
// Валидация QR токена и получение информации о зоне
GET /public/queue/info?token=abc123
Response: { zone, availableWorkTypes, estimatedWaitMinutes }

// Самостоятельная запись в очередь
POST /public/queue/join
Body: {
  token: string,           // из QR
  phone: string,           // +992...
  vehicleMake: string,
  vehicleModel?: string,
  workType: string,
  workDescription?: string,
  captchaToken: string     // Google reCAPTCHA v3
}
Response: {
  orderId: string,
  queueNumber: number,
  estimatedWaitMinutes: number,
  trackingUrl: string
}

// Публичная страница отслеживания
GET /public/queue/status/:orderId?phone=+992...
Response: {
  queueNumber: number,
  currentPosition: number,  // позиция в очереди сейчас
  status: string,
  estimatedWaitMinutes: number,
  canCancel: boolean
}

// Отмена записи клиентом
POST /public/queue/cancel/:orderId
Body: { phone: string }  // для валидации
```

в) Middleware для rate limiting:
- `@UseGuards(ThrottlerGuard)` на public endpoints
- Ограничение: 5 запросов в минуту с одного IP
- Дополнительная проверка: 1 активный заказ на телефон в течение 30 мин

г) Интеграция с CRM:
- `CrmApiService.findContactByPhone(phone)` → если найден, использовать customerId
- Если не найден → создать в `customer_cache` таблице локально
- При создании заказа отправить RabbitMQ event `sto_order_created` в CRM

**Frontend (libs/sto-ui/):**

а) Admin компонент `QrCodeGeneratorComponent`:
- Форма: выбор zone, displayId, TTL (по умолчанию 24 часа)
- Кнопка "Генерировать QR"
- Отображение сгенерированного QR с возможностью скачать (PNG/SVG/PDF)
- Список активных QR-кодов с кнопками "Деактивировать"/"Скачать"

б) Public компонент `QueueJoinFormComponent` (не требует авторизации):
- Проверка токена через `GET /public/queue/info?token=...`
- Если токен валиден:
  - Форма: телефон (маска +992), марка авто (autocomplete), модель, тип работ (dropdown)
  - Google reCAPTCHA v3 интеграция
  - Кнопка "Встать в очередь"
- После успеха:
  - Показать номер в очереди, примерное время
  - Кнопка "Отслеживать статус" → переход на tracking page
  - Информация: "SMS отправлено на ваш номер"

в) Public компонент `QueueTrackingComponent` (не требует авторизации):
- URL: `/queue/status/:orderId?phone=+992...`
- Валидация: проверка соответствия orderId и phone через API
- Отображение:
  - Текущая позиция в очереди (№5 из 12)
  - Статус заказа с индикатором (WAITING/IN_PROGRESS/COMPLETED)
  - Примерное время ожидания
  - Информация об авто и работах
- Polling каждые 30 секунд для обновления данных
- Кнопка "Отменить запись" (если статус = WAITING)

**SMS уведомления:**
- При создании заказа через QR:
  ```
  Вы в очереди СТО №5 (зона: Приёмка)
  Примерное время: 15 мин
  Отследить: https://sto.example.com/q/ABC123
  ```
- При приближении очереди (за 2 позиции):
  ```
  Ваша очередь приближается! Вы №3 в очереди.
  ```
- При начале работы:
  ```
  Ваш автомобиль принят в работу (пост №2, механик Иван)
  ```

## Требования (ответы на вопросы)

### 1. ✅ Управление доступом к admin-панели

**Решение:** Только роль `admin` может настраивать табло и уведомления.

**Реализация:**
- JWT токен из главного CRM сервиса
- Guard на СТО-сервисе: `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin')`
- Middleware проверяет роль при каждом запросе к `/admin/sto/*`
- Для механиков отдельная PIN-аутентификация (не требует роль admin)

### 2. ✅ Preview/тестирование уведомлений

**Решение:** Да, добавить кнопку "Отправить тестовое уведомление".

**Реализация:**
- API endpoint: `POST /admin/sto/notification-rules/:id/test`
- В запросе передавать `testRecipient: { phone?: string, email?: string }`
- По умолчанию отправлять на контакт текущего администратора (из JWT payload)
- В теле сообщения добавлять префикс `[ТЕСТ]` для идентификации
- Не учитывать throttling/cooldown для тестовых отправок

### 3. ⚠️ Масштабируемость табло

**Текущее решение:** Без группировки, simple list.

**Future enhancement (если >10 табло):**
- Добавить поле `category` в `DisplayConfig` entity
- Группировка в admin UI по категориям
- Broadcast-группы в Gateway для оптимизации
- Пока не критично для начального внедрения

---

## Коммуникация между сервисами

### CRM Service → STO Service

**1. REST API вызовы:**
```typescript
// CRM создаёт заказ в СТО из карточки клиента
POST /api/sto/orders
{
  customerId: string,
  vehicleId: string,
  workType: string,
  priority: 'normal' | 'urgent' | 'vip'
}

// CRM получает историю обслуживания
GET /api/sto/customers/:contactId/orders?limit=10
```

**2. RabbitMQ Events (CRM → STO):**
```typescript
// Когда обновляется клиент в CRM
Queue: 'crm_customer_updated'
Payload: { customerId, name, phone, email, tags }

// Когда резервируются запчасти
Queue: 'inventory_reserved'
Payload: { orderId, items: [...], reservedBy, reservedAt }
```

### STO Service → CRM Service

**1. REST API вызовы:**
```typescript
// СТО получает данные клиента из CRM
GET /api/crm/contacts/:id
{
  id, name, phone, email, tags, totalDealsAmount
}

// СТО логирует активность в CRM
POST /api/crm/activities
{
  contactId, type: 'sto_order_completed',
  description: 'Завершён заказ #123: замена масла'
}
```

**2. RabbitMQ Events (STO → CRM):**
```typescript
// Когда создаётся заказ в СТО
Queue: 'sto_order_created'
Payload: { orderId, customerId, vehicleInfo, estimatedCost }

// Когда завершается заказ
Queue: 'sto_order_completed'
Payload: { orderId, customerId, actualCost, completedAt }

// Запрос на отправку уведомления (использует CRM MessagesModule)
Queue: 'sto_notification_request'
Payload: { channel: 'sms', recipient: '+992...', message: '...' }
```

**3. WebSocket (независимый):**
- СТО имеет собственный WS server на порту `:3001/ws`
- Не зависит от CRM WebSocket
- Используется только для табло и терминалов механиков

### Shared Types Library

**libs/shared/sto-types/src:**
```typescript
// Экспортируется и используется обоими сервисами
export interface StoOrderDto {
  id: string;
  customerId: string;
  vehicleInfo: VehicleInfo;
  zone: StoOrderZone;
  status: StoOrderStatus;
  priority: StoOrderPriority;
}

export enum StoOrderZone {
  RECEPTION = 'reception',
  WORKSHOP = 'workshop',
  DIAGNOSTIC = 'diagnostic',
  BODYWORK = 'bodywork'
}

// ... все shared DTOs, enums, interfaces
```

---

## Архитектура компонентов

### STO Service Modules (apps/sto-service/)

```
apps/sto-service/src/app/
├── app.module.ts                  # Главный модуль СТО микросервиса
├── modules/
│   ├── orders/                   # Управление заказами
│   │   ├── orders.module.ts
│   │   ├── entities/
│   │   │   ├── sto-order.entity.ts
│   │   │   ├── vehicle.entity.ts
│   │   │   └── customer-cache.entity.ts  # Кеш клиентов из CRM
│   │   ├── services/
│   │   │   ├── sto-order.service.ts
│   │   │   └── queue-manager.service.ts
│   │   ├── controllers/
│   │   │   └── sto-order.controller.ts
│   │   └── dto/
│   ├── mechanics/                # Механики и сессии
│   │   ├── mechanics.module.ts
│   │   ├── entities/
│   │   │   ├── mechanic.entity.ts
│   │   │   └── mechanic-session.entity.ts
│   │   ├── services/
│   │   │   ├── mechanic.service.ts
│   │   │   └── mechanic-auth.service.ts
│   │   └── controllers/
│   │       └── mechanic.controller.ts
│   ├── display/                  # Конфигурация табло
│   │   ├── display.module.ts
│   │   ├── entities/
│   │   │   └── display-config.entity.ts
│   │   ├── services/
│   │   │   └── display-config.service.ts
│   │   └── controllers/
│   │       └── display-config.controller.ts
│   ├── notifications/            # Уведомления клиентов
│   │   ├── notifications.module.ts
│   │   ├── entities/
│   │   │   ├── notification-rule.entity.ts
│   │   │   └── message-template.entity.ts
│   │   ├── services/
│   │   │   ├── notification.service.ts
│   │   │   └── template-renderer.service.ts
│   │   └── controllers/
│   │       ├── notification-rule.controller.ts
│   │       └── message-template.controller.ts
│   ├── qr-codes/                 # QR Self-Service
│   │   ├── qr-codes.module.ts
│   │   ├── entities/
│   │   │   ├── qr-code.entity.ts
│   │   │   └── customer-cache.entity.ts
│   │   ├── services/
│   │   │   ├── qr-code.service.ts
│   │   │   └── public-queue.service.ts
│   │   └── controllers/
│   │       ├── qr-code.controller.ts      # Admin endpoints
│   │       └── public-queue.controller.ts # Public endpoints
│   ├── crm-integration/          # Интеграция с CRM
│   │   ├── crm-integration.module.ts
│   │   ├── services/
│   │   │   ├── crm-api.service.ts          # REST вызовы к CRM
│   │   │   ├── crm-event-listener.service.ts  # RabbitMQ consumer
│   │   │   └── customer-sync.service.ts     # Синхронизация клиентов
│   │   └── consumers/
│   │       ├── customer-updated.consumer.ts
│   │       └── inventory-reserved.consumer.ts
│   └── inventory-integration/   # Проверка запчастей через CRM
│       ├── inventory-integration.module.ts
│       └── services/
│           └── parts-availability.service.ts
├── gateways/
│   └── sto-queue.gateway.ts      # WebSocket для табло
├── guards/
│   ├── jwt-auth.guard.ts         # Проверка JWT из CRM
│   └── roles.guard.ts            # Проверка роли admin
└── shared/
    ├── config/
    │   └── database.config.ts    # Отдельная БД sto_db
    └── constants/
        └── zone-ranges.ts

libs/shared/sto-types/            # Общие типы для CRM + STO
└── src/
    ├── entities/
    ├── dtos/
    └── enums/
```

### Frontend Structure (Angular Library)

```
libs/sto-ui/                      # Отдельная Angular библиотека
├── src/
│   ├── index.ts                  # Public API
│   ├── lib/
│   │   ├── sto-ui.module.ts      # Главный модуль библиотеки
│   │   ├── components/
│   │   │   ├── pin-login/
│   │   │   │   ├── pin-login.component.ts
│   │   │   │   ├── pin-login.component.html
│   │   │   │   └── pin-login.component.scss
│   │   │   ├── display-board/
│   │   │   │   ├── display-board.component.ts
│   │   │   │   ├── display-board.component.html
│   │   │   │   ├── display-board.component.scss
│   │   │   │   └── components/
│   │   │   │       ├── queue-table/
│   │   │   │       ├── kpi-cards/
│   │   │   │       └── blocked-orders-section/
│   │   │   ├── mechanic-terminal/
│   │   │   │   ├── mechanic-terminal.component.ts
│   │   │   │   ├── mechanic-terminal.component.html
│   │   │   │   ├── mechanic-terminal.component.scss
│   │   │   │   └── components/
│   │   │   │       ├── status-bar/
│   │   │   │       ├── current-order-card/
│   │   │   │       └── available-orders-grid/
│   │   │   ├── admin/
│   │   │   │   ├── display-config/
│   │   │   │   │   ├── display-config-list.component.ts
│   │   │   │   │   └── display-config-dialog.component.ts
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── notification-rules-list.component.ts
│   │   │   │   │   ├── notification-rule-dialog.component.ts
│   │   │   │   │   └── message-templates.component.ts
│   │   │   │   └── qr-codes/
│   │   │   │       ├── qr-code-list.component.ts
│   │   │   │       └── qr-code-generator.component.ts
│   │   │   └── public/              # Публичные компоненты (без auth)
│   │   │       ├── queue-join-form/
│   │   │       │   ├── queue-join-form.component.ts
│   │   │       │   ├── queue-join-form.component.html
│   │   │       │   └── queue-join-form.component.scss
│   │   │       └── queue-tracking/
│   │   │           ├── queue-tracking.component.ts
│   │   │           ├── queue-tracking.component.html
│   │   │           └── queue-tracking.component.scss
│   │   ├── services/
│   │   │   ├── sto-api.service.ts       # REST API к СТО сервису
│   │   │   ├── sto-websocket.service.ts # WebSocket подключение
│   │   │   ├── display-config.service.ts
│   │   │   └── notification-rules.service.ts
│   │   └── models/                      # Re-export from @libs/shared/sto-types
│   │       └── index.ts
│   └── assets/
│       ├── sounds/
│       │   └── alert.mp3
│       └── styles/
│           └── sto-theme.scss
├── project.json
├── tsconfig.lib.json
└── README.md

# Использование в apps/front:
apps/front/src/app/
└── pages/
    └── sto/                          # Страница СТО в основном CRM
        ├── sto-page.component.ts
        └── sto-page.component.html   # Использует компоненты из @libs/sto-ui

# Импорт в apps/front:
import { StoUiModule } from '@libs/sto-ui';
import { DisplayBoardComponent, MechanicTerminalComponent } from '@libs/sto-ui';
```

## Технические детали

### Entities Schema

#### DisplayConfig

```typescript
@Entity('display_configs')
export class DisplayConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // "Табло приёмки"

  @Column({ nullable: true })
  location: string; // "Зона ожидания, 1 этаж"

  @Column('jsonb')
  filters: {
    zones: string[];
    workTypes?: string[];
    showBlocked: boolean;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### StoOrder

```typescript
export enum StoOrderZone {
  RECEPTION = 'reception',
  WORKSHOP = 'workshop',
  DIAGNOSTIC = 'diagnostic',
  BODYWORK = 'bodywork'
}

export enum StoOrderStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum StoOrderPriority {
  URGENT = 'urgent',
  VIP = 'vip',
  WARRANTY = 'warranty',
  NORMAL = 'normal'
}

@Entity('sto_orders')
export class StoOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  queueNumber: number; // Глобальный номер для display

  @Column({ type: 'int' })
  queueNumberInZone: number; // Номер внутри зоны

  @Column({ type: 'enum', enum: StoOrderZone })
  zone: StoOrderZone;

  // Vehicle info
  @Column()
  vehicleMake: string;

  @Column()
  vehicleModel: string;

  @Column({ type: 'int' })
  vehicleYear: number;

  @Column()
  licensePlate: string;

  @Column({ nullable: true })
  vin: string;

  // Customer
  @ManyToOne(() => Contact)
  customer: Contact;

  // Work details
  @Column({ type: 'text' })
  workDescription: string;

  @Column()
  workType: string; // 'maintenance' | 'repair' | 'diagnostic' | 'bodywork'

  @Column({ type: 'int' })
  estimatedDurationMinutes: number;

  @Column({ type: 'enum', enum: StoOrderPriority })
  priority: StoOrderPriority;

  // Status
  @Column({ type: 'enum', enum: StoOrderStatus })
  status: StoOrderStatus;

  @Column({ nullable: true })
  bayNumber: string;

  @ManyToOne(() => User, { nullable: true })
  mechanic: User;

  @Column('jsonb', { nullable: true })
  requiredParts: Array<{ itemId: string; name: string; quantity: number }>;

  @Column({ nullable: true })
  blockedReason: string;

  // Pricing
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ default: 'TJS' })
  currency: string;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get waitingMinutes(): number {
    if (this.status === StoOrderStatus.IN_PROGRESS || this.status === StoOrderStatus.COMPLETED) {
      return 0;
    }
    const now = new Date();
    return Math.floor((now.getTime() - this.createdAt.getTime()) / 60000);
  }

  get startedMinutesAgo(): number | null {
    if (!this.startedAt) return null;
    const now = new Date();
    return Math.floor((now.getTime() - this.startedAt.getTime()) / 60000);
  }
}
```

#### StoNotificationRule

```typescript
export enum StoNotificationTrigger {
  ORDER_CREATED = 'order_created',
  ORDER_STARTED = 'order_started',
  ORDER_COMPLETED = 'order_completed',
  ORDER_BLOCKED = 'order_blocked',
  ORDER_DELAYED = 'order_delayed'
}

@Entity('sto_notification_rules')
export class StoNotificationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: StoNotificationTrigger })
  triggerStatus: StoNotificationTrigger;

  @Column('jsonb')
  channels: string[]; // ['sms', 'whatsapp', 'email']

  @ManyToOne(() => StoMessageTemplate)
  template: StoMessageTemplate;

  @Column({ type: 'int', default: 0 })
  delayMinutes: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### StoMessageTemplate

```typescript
@Entity('sto_message_templates')
export class StoMessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  channel: string; // 'sms' | 'whatsapp' | 'email' | 'telegram'

  @Column({ nullable: true })
  subject: string; // For email

  @Column({ type: 'text' })
  body: string; // Template with {{variables}}

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### QrCode

```typescript
@Entity('qr_codes')
export class QrCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: StoOrderZone })
  zone: StoOrderZone;

  @Column({ nullable: true })
  displayId: string; // Привязка к конкретному табло (опционально)

  @Column({ unique: true })
  token: string; // UUID для URL

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  qrImageUrl: string; // Путь к сгенерированному изображению

  @ManyToOne(() => User)
  createdBy: User; // Admin кто создал

  @Column({ type: 'int', default: 0 })
  usageCount: number; // Счётчик использований

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  getPublicUrl(baseUrl: string): string {
    return `${baseUrl}/queue/join?token=${this.token}`;
  }
}
```

#### CustomerCache (для клиентов не из CRM)

```typescript
@Entity('customer_cache')
export class CustomerCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  crmContactId: string; // Если синхронизирован с CRM

  @Column()
  phone: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: false })
  isVip: boolean; // Синхронизируется из CRM tags

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date; // Последняя синхронизация с CRM

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

### Inventory Service Entities

#### InventoryItem

```typescript
export enum ItemCategory {
  PARTS = 'parts',          // Запчасти
  CONSUMABLES = 'consumables', // Расходники (масла, фильтры)
  ACCESSORIES = 'accessories', // Аксессуары
  TOOLS = 'tools'           // Инструменты
}

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string; // Артикул

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ItemCategory })
  category: ItemCategory;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  purchasePrice: number; // Закупочная цена

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  sellingPrice: number; // Цена продажи

  @Column({ type: 'int', default: 0 })
  quantity: number; // Текущий остаток

  @Column({ type: 'int', default: 10 })
  reorderPoint: number; // Порог для уведомления о низком остатке

  @Column({ nullable: true })
  location: string; // Расположение на складе (полка, ряд)

  @Column({ nullable: true })
  supplierId: string; // Связь с поставщиком

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### StockMovement

```typescript
export enum MovementType {
  PURCHASE = 'purchase',     // Закупка
  SALE = 'sale',             // Продажа
  RETURN = 'return',         // Возврат
  ADJUSTMENT = 'adjustment', // Корректировка
  RESERVATION = 'reservation', // Резерв для заказа
  CONSUMPTION = 'consumption'  // Списание при завершении заказа
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @ManyToOne(() => InventoryItem)
  @JoinColumn({ name: 'itemId' })
  item: InventoryItem;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'int' })
  quantity: number; // Положительное для прихода, отрицательное для расхода

  @Column({ type: 'int' })
  quantityBefore: number;

  @Column({ type: 'int' })
  quantityAfter: number;

  @Column({ nullable: true })
  referenceId: string; // ID заказа СТО, закупки, или другой операции

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  createdBy: string; // user_id из CRM

  @CreateDateColumn()
  createdAt: Date;
}
```

#### Reservation

```typescript
export enum ReservationStatus {
  ACTIVE = 'active',
  CONSUMED = 'consumed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

@Entity('inventory_reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @ManyToOne(() => InventoryItem)
  @JoinColumn({ name: 'itemId' })
  item: InventoryItem;

  @Column({ type: 'int' })
  quantity: number;

  @Column()
  stoOrderId: string; // Связь с заказом СТО

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.ACTIVE })
  status: ReservationStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date; // TTL резервации (по умолчанию +24 часа)

  @Column({ nullable: true })
  consumedAt: Date; // Когда списан при завершении заказа

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### Supplier

```typescript
@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

### Zone Number Ranges

```typescript
export const ZONE_NUMBER_RANGES = {
  [StoOrderZone.RECEPTION]: { start: 1, end: 99 },
  [StoOrderZone.WORKSHOP]: { start: 100, end: 199 },
  [StoOrderZone.DIAGNOSTIC]: { start: 200, end: 299 },
  [StoOrderZone.BODYWORK]: { start: 300, end: 399 }
};
```

### WebSocket Events

```typescript
// Client → Server
interface RegisterDisplayEvent {
  displayId: string;
  filters: {
    zones: string[];
    workTypes?: string[];
    showBlocked: boolean;
  };
}

// Server → Client
interface QueueUpdateEvent {
  type: 'queue_update';
  orders: StoOrder[];
  timestamp: Date;
}

interface MechanicsUpdateEvent {
  type: 'mechanics_update';
  mechanics: Mechanic[];
}

interface ForceLogoutEvent {
  type: 'force_logout';
  reason: string;
}
```

### Template Variables

```typescript
export const TEMPLATE_VARIABLES = {
  customerName: 'Имя клиента',
  customerPhone: 'Телефон клиента',
  vehicleMake: 'Марка автомобиля',
  vehicleModel: 'Модель автомобиля',
  vehicleYear: 'Год выпуска',
  licensePlate: 'Гос. номер',
  workDescription: 'Описание работ',
  estimatedTime: 'Примерное время',
  estimatedCost: 'Примерная стоимость',
  mechanicName: 'Имя механика',
  bayNumber: 'Номер поста',
  completedAt: 'Время завершения',
  queueNumber: 'Номер в очереди'
};
```

## API Endpoints Summary

### Display Config

- `GET /admin/sto/display-configs` - Список всех конфигураций табло
- `GET /admin/sto/display-configs/:id` - Получить конфигурацию по ID
- `POST /admin/sto/display-configs` - Создать новую конфигурацию
- `PUT /admin/sto/display-configs/:id` - Обновить конфигурацию
- `DELETE /admin/sto/display-configs/:id` - Удалить конфигурацию
- `GET /sto/display-configs/:id/preview` - Preview данных по фильтрам

### Notification Rules

- `GET /admin/sto/notification-rules` - Список правил уведомлений
- `POST /admin/sto/notification-rules` - Создать правило
- `PUT /admin/sto/notification-rules/:id` - Обновить правило
- `DELETE /admin/sto/notification-rules/:id` - Удалить правило
- `POST /admin/sto/notification-rules/:id/test` - Отправить тестовое уведомление

### Message Templates

- `GET /admin/sto/message-templates` - Список шаблонов
- `POST /admin/sto/message-templates` - Создать шаблон
- `PUT /admin/sto/message-templates/:id` - Обновить шаблон
- `DELETE /admin/sto/message-templates/:id` - Удалить шаблон
- `POST /admin/sto/message-templates/:id/preview` - Preview с тестовыми данными

### STO Orders

- `GET /sto/orders` - Список заказов с фильтрами
- `GET /sto/orders/:id` - Получить заказ
- `POST /sto/orders` - Создать новый заказ
- `PATCH /sto/orders/:id` - Обновить заказ
- `POST /sto/orders/:id/start` - Начать работу
- `POST /sto/orders/:id/complete` - Завершить работу
- `POST /sto/orders/:id/block` - Заблокировать (нет запчастей)
- `POST /sto/orders/:id/unblock` - Разблокировать

### Mechanics

- `POST /sto/auth/pin` - PIN-аутентификация
- `GET /sto/mechanics/me` - Текущий механик
- `POST /sto/mechanics/status` - Изменить статус
- `POST /sto/mechanics/take-order/:orderId` - Взять заказ в работу
- `GET /sto/mechanics/available-orders` - Доступные заказы для механика

### QR Codes (Admin)

- `GET /admin/sto/qr-codes` - Список всех QR-кодов
- `POST /admin/sto/qr-codes` - Генерировать новый QR-код
- `GET /admin/sto/qr-codes/:id` - Получить QR-код по ID
- `GET /admin/sto/qr-codes/:id/download` - Скачать QR (PNG/SVG)
- `DELETE /admin/sto/qr-codes/:id` - Деактивировать QR-код

### Public API (без авторизации)

- `GET /public/queue/info?token=:token` - Информация о зоне по QR токену
- `POST /public/queue/join` - Самостоятельная запись в очередь
- `GET /public/queue/status/:orderId?phone=:phone` - Отслеживание заказа
- `POST /public/queue/cancel/:orderId` - Отмена записи клиентом

---

### Inventory API Endpoints

#### Items Management (Admin/Manager)

- `GET /api/inventory/items` - Список всех запчастей
  - Query: `?category=parts&search=масло&lowStock=true`
- `POST /api/inventory/items` - Создать новую запчасть
- `GET /api/inventory/items/:id` - Получить запчасть по ID
- `PATCH /api/inventory/items/:id` - Обновить запчасть
- `DELETE /api/inventory/items/:id` - Удалить запчасть (soft delete)
- `GET /api/inventory/items/low-stock` - Запчасти с низким остатком

#### Stock Movements

- `GET /api/inventory/movements` - История движений
  - Query: `?itemId=xxx&type=purchase&from=2024-01-01&to=2024-12-31`
- `POST /api/inventory/movements` - Создать движение (закупка/корректировка)
- `GET /api/inventory/movements/:id` - Детали движения

#### Reservations (Internal API для СТО)

- `POST /api/inventory/reservations` - Зарезервировать запчасти
  ```json
  {
    "stoOrderId": "uuid",
    "items": [
      { "itemId": "uuid", "quantity": 2 },
      { "itemId": "uuid", "quantity": 1 }
    ]
  }
  ```
- `GET /api/inventory/reservations?stoOrderId=:id` - Резервы для заказа
- `DELETE /api/inventory/reservations/:id` - Отменить резерв
- `POST /api/inventory/items/:id/consume` - Списать запчасть (завершение заказа)
  ```json
  {
    "quantity": 2,
    "stoOrderId": "uuid",
    "notes": "Использовано при ремонте"
  }
  ```

#### Availability Check (Internal API для СТО)

- `POST /api/inventory/items/check` - Проверка наличия нескольких позиций
  ```json
  {
    "items": [
      { "sku": "OIL-5W30", "quantity": 4 },
      { "sku": "FILTER-123", "quantity": 1 }
    ]
  }
  ```
  **Response:**
  ```json
  {
    "available": true,
    "items": [
      { "sku": "OIL-5W30", "available": true, "inStock": 10 },
      { "sku": "FILTER-123", "available": false, "inStock": 0 }
    ]
  }
  ```

#### Suppliers Management

- `GET /api/inventory/suppliers` - Список поставщиков
- `POST /api/inventory/suppliers` - Создать поставщика
- `GET /api/inventory/suppliers/:id` - Получить поставщика
- `PATCH /api/inventory/suppliers/:id` - Обновить поставщика
- `DELETE /api/inventory/suppliers/:id` - Удалить поставщика

---

## Deployment Configuration

### Docker Compose

```yaml
# docker-compose.yml (добавить к существующим сервисам)
services:
  sto-service:
    build:
      context: .
      dockerfile: apps/sto-service/Dockerfile
    ports:
      - "3001:3001"  # HTTP API
      - "3002:3002"  # WebSocket
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/sto_db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - CRM_API_URL=http://back:3000/api  # URL главного CRM
      - JWT_SECRET=${JWT_SECRET}  # Общий секрет с CRM
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - crm_network

  sto-db-init:
    image: postgres:15
    environment:
      - PGPASSWORD=${DB_PASSWORD}
    command: >
      sh -c "psql -h postgres -U ${DB_USER} -c 'CREATE DATABASE sto_db;' || true"
    depends_on:
      - postgres
    networks:
      - crm_network

  inventory-service:
    build:
      context: .
      dockerfile: apps/inventory-service/Dockerfile
    ports:
      - "3003:3003"  # HTTP API
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/inventory_db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - JWT_SECRET=${JWT_SECRET}  # Общий секрет с CRM
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - crm_network

  inventory-db-init:
    image: postgres:15
    environment:
      - PGPASSWORD=${DB_PASSWORD}
    command: >
      sh -c "psql -h postgres -U ${DB_USER} -c 'CREATE DATABASE inventory_db;' || true"
    depends_on:
      - postgres
    networks:
      - crm_network

networks:
  crm_network:
    driver: bridge
```

### Environment Variables

**apps/sto-service/.env:**
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=sto_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# CRM Integration
CRM_API_URL=http://localhost:3000/api
CRM_API_KEY=shared_secret_key

# Inventory Integration
INVENTORY_API_URL=http://localhost:3003/api

# JWT (общий с CRM для проверки токенов)
JWT_SECRET=your-secret-key

# WebSocket
WS_PORT=3002
WS_PATH=/ws

# Server
PORT=3001
```

**apps/inventory-service/.env:**
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=inventory_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# JWT (общий с CRM для проверки токенов)
JWT_SECRET=your-secret-key

# Server
PORT=3003
```

### Nx Configuration

**apps/sto-service/project.json:**
```json
{
  "name": "sto-service",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/sto-service/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "outputs": ["{options.outputPath}"],
      "options": {
        "target": "node",
        "compiler": "tsc",
        "outputPath": "dist/apps/sto-service",
        "main": "apps/sto-service/src/main.ts",
        "tsConfig": "apps/sto-service/tsconfig.app.json"
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "options": {
        "buildTarget": "sto-service:build",
        "watch": true
      }
    }
  }
}
```

**apps/inventory-service/project.json:**
```json
{
  "name": "inventory-service",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/inventory-service/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "outputs": ["{options.outputPath}"],
      "options": {
        "target": "node",
        "compiler": "tsc",
        "outputPath": "dist/apps/inventory-service",
        "main": "apps/inventory-service/src/main.ts",
        "tsConfig": "apps/inventory-service/tsconfig.app.json"
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "options": {
        "buildTarget": "inventory-service:build",
        "watch": true
      }
    }
  }
}
```

**libs/sto-ui/project.json:**
```json
{
  "name": "sto-ui",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/sto-ui/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "@nx/angular:package",
      "outputs": ["{workspaceRoot}/dist/libs/sto-ui"],
      "options": {
        "project": "libs/sto-ui/ng-package.json"
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "options": {
        "config": "libs/sto-ui/vitest.config.ts"
      }
    }
  }
}
```

### Package Scripts

**package.json (добавить):**
```json
{
  "scripts": {
    "start:sto": "nx serve sto-service",
    "build:sto": "nx build sto-service",
    "build:sto-ui": "nx build sto-ui",
    "test:sto": "nx test sto-service",
    "test:sto-ui": "nx test sto-ui",
    "start:inventory": "nx serve inventory-service",
    "build:inventory": "nx build inventory-service",
    "test:inventory": "nx test inventory-service"
  }
}
```

---

## Implementation Priority

### Phase 1: Project Setup & Core Backend (Week 1)
- [ ] Create NestJS microservice app: `apps/sto-service/`
- [ ] Setup separate database `sto_db` in docker-compose
- [ ] Create shared types library: `libs/shared/sto-types/`
- [ ] Create Angular UI library: `libs/sto-ui/`
- [ ] Configure Nx build targets and scripts
- [ ] Create entities (DisplayConfig, StoOrder, StoNotificationRule, StoMessageTemplate)
- [ ] Implement QueueManagerService with zone-based numbering
- [ ] Create StoOrderService with status management
- [ ] Build REST API endpoints for orders
- [ ] Add migrations
- [ ] Setup JWT validation from CRM tokens

### Phase 2: CRM Integration & WebSocket (Week 2)
- [ ] Create CrmIntegrationModule in STO service
- [ ] Implement CrmApiService for REST calls to CRM
- [ ] Setup RabbitMQ consumers (customer_updated, inventory_reserved)
- [ ] Setup RabbitMQ producers (sto_order_created, sto_notification_request)
- [ ] Implement customer cache sync
- [ ] Create StoQueueGateway on separate port :3002
- [ ] Implement display registration and filtering
- [ ] Add broadcast logic every 3 seconds
- [ ] Test multi-display support with multiple connections

### Phase 2.5: QR Self-Service (Week 2)
- [ ] Create QrCodeModule with entity and service
- [ ] Implement QR generation using `qrcode` library
- [ ] Create admin endpoints for QR management
- [ ] Create CustomerCache entity for non-CRM clients
- [ ] Implement PublicQueueController (no auth)
- [ ] Add rate limiting middleware (@UseGuards(ThrottlerGuard))
- [ ] Integrate Google reCAPTCHA v3
- [ ] Create public queue join logic (check CRM, create order)
- [ ] Implement SMS notification on queue join
- [ ] Create public tracking endpoint
- [ ] Test QR token validation and expiration

### Phase 3: Authentication & Sessions (Week 2-3)
- [ ] Implement PIN authentication
- [ ] Create mechanic session management
- [ ] Add force logout on duplicate login
- [ ] Build mechanic REST API

### Phase 4: Notifications System (Week 3)
- [ ] Create StoNotificationService
- [ ] Implement template rendering (handlebars)
- [ ] Integrate with MessagesModule (SMS/WhatsApp)
- [ ] Add status change hooks
- [ ] Implement delayed notifications

### Phase 5: Admin UI - Display Config (Week 3)
- [ ] Create admin components in `libs/sto-ui/`
- [ ] DisplayConfigListComponent
- [ ] DisplayConfigDialogComponent with form
- [ ] StoApiService for HTTP calls to sto-service:3001
- [ ] API integration
- [ ] Preview functionality
- [ ] Add @Roles('admin') guard checks

### Phase 5.5: Admin UI - QR Codes (Week 3-4)
- [ ] Create QrCodeListComponent in `libs/sto-ui/admin/qr-codes/`
- [ ] QrCodeGeneratorComponent with form (zone, displayId, TTL)
- [ ] Display generated QR code with download buttons (PNG/SVG/PDF)
- [ ] List active QR codes with usage statistics
- [ ] Deactivate/Delete QR functionality
- [ ] Copy public URL to clipboard
- [ ] QR preview and print layout

### Phase 6: Admin UI - Notifications (Week 4)
- [ ] NotificationRulesListComponent in `libs/sto-ui/`
- [ ] NotificationRuleDialogComponent
- [ ] MessageTemplatesComponent with Monaco editor
- [ ] Template variables autocomplete
- [ ] Preview with mock data
- [ ] "Send Test Notification" button implementation
- [ ] API endpoint: POST /admin/sto/notification-rules/:id/test
- [ ] Test notification to admin's contact

### Phase 7: Display Board UI (Week 4-5)
- [ ] Create StoDisplayBoardComponent in `libs/sto-ui/`
- [ ] StoWebsocketService connecting to ws://sto-service:3002
- [ ] Load display config from query params
- [ ] Implement display registration event
- [ ] KPI cards (in-progress, waiting, available bays)
- [ ] Queue table with sorting by priority + time
- [ ] Visual alerts (pulse animation, color coding)
- [ ] Audio alerts with cooldown
- [ ] Fullscreen mode support
- [ ] Test with multiple displays simultaneously

### Phase 7.5: Public UI - QR Self-Service (Week 5)
- [ ] Create QueueJoinFormComponent in `libs/sto-ui/public/`
- [ ] Token validation on page load
- [ ] Phone number input with mask (+992...)
- [ ] Vehicle make/model inputs with autocomplete
- [ ] Work type dropdown (populated from API)
- [ ] Google reCAPTCHA v3 integration
- [ ] Success screen with queue number and tracking link
- [ ] Create QueueTrackingComponent
- [ ] Phone validation for tracking access
- [ ] Real-time position updates (polling every 30s)
- [ ] Status indicators with icons/colors
- [ ] Cancel order button (if WAITING status)
- [ ] Mobile-responsive design (primary use case)
- [ ] PWA manifest for "Add to Home Screen"
- [ ] Test on multiple devices

### Phase 8: Mechanic Terminal UI (Week 5-6)
- [ ] Create PinLoginComponent in `libs/sto-ui/`
- [ ] Implement single-session enforcement (force logout on duplicate)
- [ ] MechanicTerminalComponent
- [ ] Status bar with quick status changes
- [ ] Current order card with timer
- [ ] Available orders grid with priority sorting
- [ ] Take order action (API call + WebSocket update)
- [ ] Complete order action
- [ ] Handle force_logout WebSocket event

### Phase 9: Inventory Service Implementation (Week 6)
- [ ] Create NestJS microservice app: `apps/inventory-service/`
- [ ] Setup separate database `inventory_db` in docker-compose
- [ ] Create shared types library: `libs/shared/inventory-types/`
- [ ] Create entities (InventoryItem, StockMovement, Reservation, Supplier)
- [ ] Implement ItemsModule with CRUD operations
- [ ] Implement StockMovementsModule with history tracking
- [ ] Implement ReservationsModule with TTL logic (24h)
- [ ] Build REST API endpoints for all modules
- [ ] Setup RabbitMQ consumers (inventory_check_request, inventory_item_created)
- [ ] Setup RabbitMQ producers (inventory_low_stock, inventory_reserved, inventory_restock)
- [ ] Integrate with СТО service (check availability, reservations, consume)
- [ ] Integrate with CRM (low stock notifications, inventory management UI)
- [ ] Add automated low-stock alerts (daily cron job)
- [ ] Implement inventory reports API
- [ ] Add migrations

### Phase 10: Polish & Testing (Week 6-7)
- [ ] End-to-end testing (CRM ↔ STO communication)
- [ ] Load testing (50+ concurrent orders, 10+ displays)
- [ ] Test RabbitMQ failure scenarios
- [ ] Test database connection failures
- [ ] UI/UX refinements
- [ ] Performance optimization (Redis caching)
- [ ] API documentation (Swagger)
- [ ] Deployment documentation
- [ ] User manuals for admin/mechanics
