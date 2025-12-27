# ⚡ Быстрый старт Notification Center

## Проблема решена! ✅

Ошибка `Missing credentials for "PLAIN"` больше не появляется, так как Email канал теперь **выключен по умолчанию**.

## 🚀 Запуск без Email (минимальная конфигурация)

### 1. Добавьте в `.env`:

```env
# Каналы (Email выключен по умолчанию)
FEATURE_SMS_ENABLED=true
FEATURE_EMAIL_ENABLED=false
FEATURE_WEBHOOK_ENABLED=true

# SMS настройки (если нужны)
SMS_PROVIDER=smsru
SMS_API_KEY=your-key-here
```

### 2. Запустите приложение:

```bash
npm run start:back
```

✅ **Готово!** Приложение запустится без ошибок. Email просто не будет доступен.

## 📧 Включение Email (опционально)

Если хотите использовать Email, следуйте инструкциям в [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).

### Кратко:

```env
# Включить Email
FEATURE_EMAIL_ENABLED=true

# SMTP для Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
```

**Важно:** Для Gmail нужен [App Password](https://myaccount.google.com/apppasswords), обычный пароль не работает.

## 📊 Проверка статуса

```bash
curl http://localhost:3000/notifications/health
```

Ответ покажет какие каналы доступны:
```json
{
  "sms": { "available": true },
  "email": { "available": false },  // Выключен
  "webhook": { "available": true }
}
```

## 🎯 Использование

### SMS:
```typescript
POST /notifications/send
{
  "channel": "sms",
  "recipient": "+79991234567",
  "message": "Тестовое сообщение"
}
```

### Webhook:
```typescript
POST /notifications/send
{
  "channel": "webhook",
  "recipient": "https://webhook.site/your-id",
  "message": "Test event",
  "metadata": { "event": "test" }
}
```

## 📚 Подробная документация

- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Детальная настройка всех каналов
- [EMAIL_REST_EXAMPLES.md](./EMAIL_REST_EXAMPLES.md) - Примеры использования
- [README.md](./README.md) - Полная документация модуля
