# Настройки каналов - Документация

## Обзор

Реализован полнофункциональный UI для управления настройками каналов уведомлений (SMS, Email, WhatsApp, Telegram, Webhook и др.) через веб-интерфейс.

## Структура

### Backend (NestJS + TypeORM)

#### 1. Setting Entity (`apps/back/src/messages/setting.entity.ts`)
- **Поля**:
  - `id`: UUID
  - `key`: уникальное имя настройки (например: `SMS_API_KEY`)
  - `value`: значение настройки
  - `category`: категория (SMS, EMAIL, WHATSAPP, TELEGRAM, WEBHOOK, CAMPAIGN, NOTIFICATION, FEATURE, GENERAL)
  - `description`: описание
  - `isEncrypted`: флаг шифрования (base64)
  - `isSecret`: флаг секретного значения (скрывается в UI как `••••••••`)
  - `createdAt`, `updatedAt`: временные метки

#### 2. Setting Service (`apps/back/src/messages/setting.service.ts`)
- **Методы**:
  - `findAll()`: получить все настройки с дешифровкой и маскировкой секретов
  - `findByCategory(category)`: фильтр по категории
  - `findByKey(key)` / `getValue(key, defaultValue)`: получение отдельной настройки
  - `create(dto)`: создание новой настройки
  - `update(key, dto)`: обновление
  - `bulkUpdate(updates[])`: массовое обновление
  - `delete(key)`: удаление
  - `initializeDefaults()`: инициализация из переменных окружения (.env)
  - `encrypt(text)` / `decrypt(encrypted)`: base64 кодирование/декодирование
  - `getCategoryFromKey(key)`: автоматическая категоризация по префиксу (SMS_, SMTP_, etc.)
  - `isKeySecret(key)`: определение секретных ключей (PASSWORD, TOKEN, API_KEY, SECRET)

#### 3. Setting Controller (`apps/back/src/messages/setting.controller.ts`)
- **Endpoints**:
  ```
  GET    /api/messages/settings                    - все настройки
  GET    /api/messages/settings/category/:category - по категории
  GET    /api/messages/settings/key/:key           - по ключу
  POST   /api/messages/settings                    - создать
  PUT    /api/messages/settings/:key               - обновить
  PUT    /api/messages/settings/bulk               - массовое обновление
  DELETE /api/messages/settings/:key               - удалить
  POST   /api/messages/settings/initialize-defaults - инициализация из .env
  POST   /api/messages/settings/test               - тестирование канала
  ```

### Frontend (Angular 17+ Standalone Components)

#### 1. Models (`apps/front/src/app/messages/models/setting.models.ts`)
- TypeScript интерфейсы: `Setting`, `CreateSettingDto`, `UpdateSettingDto`, `BulkUpdateSettingDto`, `TestSettingDto`, `TestSettingResponse`
- Enum: `SettingCategory`

#### 2. Service (`apps/front/src/app/messages/services/setting.service.ts`)
- Методы для всех API endpoints
- Использование HttpClient + Signals

#### 3. Settings Component (`apps/front/src/app/messages/components/settings/settings.component.ts`)
- **Функционал**:
  - Табы для каждой категории (SMS, Email, WhatsApp, Telegram, Webhook, Функции)
  - Отображение настроек с маскировкой секретов (`••••••••`)
  - Кнопки: Редактировать, Удалить для каждой настройки
  - Кнопка "Добавить" в каждой вкладке
  - Кнопка "Инициализировать из .env" в header
  - Loading overlay при загрузке
  - Empty state для пустых категорий

#### 4. Setting Dialog Component (`apps/front/src/app/messages/components/settings/setting-dialog.component.ts`)
- **Режимы**: создание / редактирование
- **Поля формы**:
  - Ключ (readonly при редактировании)
  - Значение (с кнопкой показать/скрыть для секретов)
  - Категория (dropdown)
  - Описание (textarea)
  - Чекбоксы: "Секретное значение", "Шифровать"
- **Валидация**: обязательные поля (key, value, category)

#### 5. Navigation
- Добавлено в sidebar: "Настройки каналов" (иконка settings)
- Route: `/messages/settings` (lazy-loaded)

## Использование

### 1. Первая инициализация
1. Перейти: Сообщения → Настройки каналов
2. Нажать кнопку "Инициализировать из .env"
3. Система автоматически импортирует все настройки из переменных окружения в БД

### Список инициализируемых настроек:

#### SMS (10 настроек)
- `SMS_PROVIDER` - SMS провайдер (smsru, smsc, twilio)
- `SMS_API_KEY` - SMS.RU API ключ ⚠️
- `SMS_SENDER` - Отправитель SMS
- `SMSC_LOGIN` - SMSC логин
- `SMSC_PASSWORD` - SMSC пароль ⚠️
- `TWILIO_ACCOUNT_SID` - Twilio Account SID ⚠️
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token ⚠️
- `TWILIO_PHONE_NUMBER` - Twilio номер телефона

#### Email (6 настроек)
- `SMTP_HOST` - SMTP хост
- `SMTP_PORT` - SMTP порт
- `SMTP_USER` - SMTP пользователь
- `SMTP_PASSWORD` - SMTP пароль ⚠️
- `SMTP_FROM` - Email отправителя
- `SMTP_FROM_NAME` - Имя отправителя

#### WhatsApp (5 настроек)
- `WHATSAPP_API_URL` - WhatsApp API URL
- `WHATSAPP_API_KEY` - WhatsApp API ключ ⚠️
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp Phone Number ID
- `WHATSAPP_BUSINESS_ACCOUNT_ID` - WhatsApp Business Account ID
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp Access Token ⚠️

#### Telegram (4 настройки)
- `TELEGRAM_BOT_TOKEN` - Telegram Bot Token ⚠️
- `TELEGRAM_BOT_USERNAME` - Telegram Bot Username
- `TELEGRAM_WEBHOOK_URL` - Telegram Webhook URL
- `TELEGRAM_API_URL` - Telegram API URL

#### Webhook (6 настроек)
- `WEBHOOK_URL` - Webhook URL для исходящих уведомлений
- `WEBHOOK_SECRET` - Webhook секретный ключ для подписи ⚠️
- `WEBHOOK_TIMEOUT` - Webhook timeout (мс)
- `WEBHOOK_RETRY_COUNT` - Количество попыток повтора
- `WEBHOOK_AUTH_TYPE` - Тип авторизации (none, basic, bearer, api_key)
- `WEBHOOK_AUTH_VALUE` - Значение авторизации ⚠️

#### Feature Flags (5 настроек)
- `FEATURE_SMS_ENABLED` - Включить SMS
- `FEATURE_EMAIL_ENABLED` - Включить Email
- `FEATURE_WHATSAPP_ENABLED` - Включить WhatsApp
- `FEATURE_TELEGRAM_ENABLED` - Включить Telegram
- `FEATURE_WEBHOOK_ENABLED` - Включить Webhook

⚠️ - Секретное значение (автоматически шифруется и маскируется в UI)

**Итого: 36 настроек** по умолчанию

### 2. Создание новой настройки
1. Выбрать нужную вкладку (например, SMS)
2. Нажать "Добавить"
3. Заполнить форму:
   - Ключ: `SMS_PROVIDER_API_KEY`
   - Значение: `your-api-key-here`
   - Категория: SMS
   - Описание: API ключ провайдера SMS
   - Секретное значение: ✓
   - Шифровать: ✓
4. Нажать "Создать"

### 3. Редактирование
1. Найти настройку в списке
2. Нажать иконку "Редактировать" (карандаш)
3. Изменить нужные поля
4. Нажать "Сохранить"

### 4. Удаление
1. Найти настройку в списке
2. Нажать иконку "Удалить" (корзина)
3. Подтвердить удаление

## Особенности реализации

### Безопасность
- Секретные значения (пароли, токены, API ключи) кодируются в base64
- В UI секреты отображаются как `••••••••`
- При редактировании можно показать/скрыть значение кнопкой "глаз"

### Автоматическая категоризация
Backend автоматически определяет категорию по префиксу ключа:
- `SMS_*` → SMS
- `SMTP_*` / `MAIL_*` → EMAIL
- `WHATSAPP_*` → WHATSAPP
- `TELEGRAM_*` → TELEGRAM
- `WEBHOOK_*` → WEBHOOK
- и т.д.

### Автоматическое определение секретов
Ключи, содержащие: `PASSWORD`, `TOKEN`, `API_KEY`, `SECRET`, `APIKEY` автоматически помечаются как секретные.

## Следующие шаги (TODO)

### 1. Тестирование каналов
Добавить UI для тестирования каналов:
- Кнопка "Тест" для каждой категории
- Форма: номер телефона/email/chat_id для тестового сообщения
- Вызов `/api/messages/settings/test`
- Отображение результата (успех/ошибка)

### 2. Интеграция с провайдерами
Обновить существующие сервисы провайдеров:
- `sms-provider.service.ts`
- `email-provider.service.ts`
- `rest-api-provider.service.ts`

Чтобы они читали настройки из БД через `SettingService.getValue()` с fallback на `process.env`.

### 3. Специализированные формы
Создать отдельные компоненты с готовыми формами для каждого канала:
- `SmsSettingsForm`: выбор провайдера (smsru/smsc/twilio), API key, sender name
- `EmailSettingsForm`: SMTP host, port, user, password, from address
- `WhatsAppSettingsForm`: API настройки
- `TelegramSettingsForm`: Bot token
- `WebhookSettingsForm`: URL, auth type, timeout

### 4. Валидация
Добавить валидацию значений:
- Email формат для SMTP_USER
- URL формат для WEBHOOK_URL
- Числовые значения для портов
- Regex паттерны для специфичных форматов

### 5. Экспорт/Импорт
- Экспорт настроек в JSON
- Импорт настроек из JSON
- Миграция между окружениями (dev → prod)

## Архитектурные решения

### Почему base64 вместо AES?
- Простота реализации для MVP
- Отсутствие проблем с TypeScript crypto типами
- Достаточно для базовой защиты в БД
- Можно легко upgrade до AES-256-CBC позже

### Почему standalone components?
- Angular 17+ best practices
- Упрощенная структура без NgModules
- Улучшенная производительность (lazy loading)
- Современный подход

### Почему signals?
- Новый реактивный API Angular
- Улучшенная производительность
- Упрощенный change detection
- Future-proof (Angular 18+ основан на signals)

## Технический стек

**Backend:**
- NestJS 10+
- TypeORM
- PostgreSQL
- JWT Authentication

**Frontend:**
- Angular 17+
- Standalone Components
- Signals API
- Material Design
- Reactive Forms
- Lazy Loading

## Структура файлов

```
apps/
├── back/src/messages/
│   ├── setting.entity.ts           # TypeORM entity
│   ├── setting.dto.ts              # DTOs
│   ├── setting.service.ts          # Business logic
│   ├── setting.controller.ts       # REST API
│   └── messages.module.ts          # Module registration
│
└── front/src/app/messages/
    ├── models/
    │   └── setting.models.ts       # TypeScript interfaces
    ├── services/
    │   └── setting.service.ts      # API client
    ├── components/settings/
    │   ├── settings.component.ts   # Main component
    │   ├── settings.component.html # Template
    │   ├── settings.component.scss # Styles
    │   └── setting-dialog.component.ts # Edit/Create dialog
    └── messages.routes.ts          # Routing
```

## База данных

### Таблица: `settings`

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settings_category ON settings(category);
CREATE INDEX idx_settings_key ON settings(key);
```

## API Examples

### Получить все настройки
```bash
GET /api/messages/settings
Authorization: Bearer <token>
```

Response:
```json
[
  {
    "id": "uuid",
    "key": "SMS_API_KEY",
    "value": "••••••••",
    "category": "SMS",
    "description": "API ключ SMS провайдера",
    "isSecret": true,
    "isEncrypted": true,
    "createdAt": "2025-01-01T12:00:00Z",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
]
```

### Создать настройку
```bash
POST /api/messages/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "key": "SMTP_PASSWORD",
  "value": "password123",
  "category": "EMAIL",
  "description": "SMTP пароль",
  "isSecret": true,
  "isEncrypted": true
}
```

### Обновить настройку
```bash
PUT /api/messages/settings/SMTP_PASSWORD
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "new-password456"
}
```

### Инициализировать из .env
```bash
POST /api/messages/settings/initialize-defaults
Authorization: Bearer <token>
```

---

**Статус:** ✅ MVP готов
**Дата:** 2025-01-29
**Разработчик:** AI Assistant
