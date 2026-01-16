# Notification System API Endpoints

## Правильные маршруты

### WhatsApp Templates
**Base URL**: `/api/notifications/whatsapp-templates`

- `GET /api/notifications/whatsapp-templates` - Список всех шаблонов
- `GET /api/notifications/whatsapp-templates/:id` - Один шаблон
- `POST /api/notifications/whatsapp-templates` - Создать шаблон
- `PUT /api/notifications/whatsapp-templates/:id` - Обновить шаблон
- `DELETE /api/notifications/whatsapp-templates/:id` - Удалить шаблон
- `POST /api/notifications/whatsapp-templates/:id/preview` - Превью с переменными
- `POST /api/notifications/whatsapp-templates/:id/send-bulk` - **Массовая отправка**

### Telegram Templates
**Base URL**: `/api/notifications/telegram-templates`

- `GET /api/notifications/telegram-templates` - Список всех шаблонов
- `GET /api/notifications/telegram-templates/:id` - Один шаблон
- `POST /api/notifications/telegram-templates` - Создать шаблон
- `PUT /api/notifications/telegram-templates/:id` - Обновить шаблон
- `DELETE /api/notifications/telegram-templates/:id` - Удалить шаблон
- `POST /api/notifications/telegram-templates/:id/preview` - Превью с переменными
- `POST /api/notifications/telegram-templates/:id/send-bulk` - **Массовая отправка**

## Исправление

### Было (неправильно):
```typescript
// ❌ WhatsApp
'/notifications/whatsapp/templates'

// ❌ Telegram
'/notifications/telegram/templates'
```

### Стало (правильно):
```typescript
// ✅ WhatsApp
'/notifications/whatsapp-templates'

// ✅ Telegram
'/notifications/telegram-templates'
```

## Примеры запросов

### Получить список WhatsApp шаблонов
```bash
curl -X GET "http://localhost:3000/api/notifications/whatsapp-templates?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Создать WhatsApp шаблон
```bash
curl -X POST "http://localhost:3000/api/notifications/whatsapp-templates" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Message",
    "content": "Привет {{contact.name}}, добро пожаловать в нашу систему!",
    "language": "ru",
    "category": "marketing",
    "isActive": true
  }'
```

### Массовая отправка WhatsApp
```bash
curl -X POST "http://localhost:3000/api/notifications/whatsapp-templates/{TEMPLATE_ID}/send-bulk" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactIds": ["uuid-1", "uuid-2", "uuid-3"],
    "priority": "normal"
  }'
```

### Превью шаблона с переменными
```bash
curl -X POST "http://localhost:3000/api/notifications/whatsapp-templates/{TEMPLATE_ID}/preview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "contact-uuid",
    "leadId": 123,
    "dealId": "deal-uuid"
  }'
```

## Query Parameters

### GET списка шаблонов
- `page` (number, default: 1) - Номер страницы
- `limit` (number, default: 20) - Количество на странице
- `category` (string, optional) - Фильтр по категории
- `isActive` (boolean, optional) - Фильтр по активности

Пример:
```
GET /api/notifications/whatsapp-templates?page=1&limit=20&isActive=true&category=marketing
```

## Response Formats

### Список шаблонов
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Welcome Message",
      "content": "Привет {{contact.name}}!",
      "language": "ru",
      "category": "marketing",
      "isActive": true,
      "createdAt": "2026-01-06T12:00:00Z",
      "updatedAt": "2026-01-06T12:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

### Bulk Send Response
```json
{
  "success": true,
  "batchId": "uuid-v4",
  "total": 100,
  "queued": 100,
  "failed": 0,
  "estimatedTime": 300
}
```

### Preview Response
```json
{
  "template": "Привет {{contact.name}}, ваша сделка {{deal.title}}!",
  "rendered": "Привет Иван Иванов, ваша сделка Продажа ПО!",
  "context": {
    "contact": "Иван Иванов",
    "lead": null,
    "deal": "Продажа ПО",
    "company": "ООО Компания"
  }
}
```

## Frontend Services

### WhatsAppTemplateService
Файл: `apps/front/src/app/notifications/services/whatsapp-template.service.ts`

```typescript
// ✅ Правильный URL
private readonly apiUrl = environment.apiBase + '/notifications/whatsapp-templates';
```

### TelegramTemplateService
Файл: `apps/front/src/app/notifications/services/telegram-template.service.ts`

```typescript
// ✅ Правильный URL
private readonly apiUrl = environment.apiBase + '/notifications/telegram-templates';
```

## Swagger Documentation

После запуска backend, документация доступна по адресу:
```
http://localhost:3000/api/docs
```

Там можно найти все endpoints с описанием, примерами и возможностью тестирования.
