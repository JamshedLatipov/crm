# Настройка переменных окружения для Notification Center

## 🔧 Включение/Выключение каналов

### Базовые настройки

Добавьте в ваш `.env` файл:

```env
# Включение каналов (по умолчанию)
FEATURE_SMS_ENABLED=true      # SMS отключен по умолчанию
FEATURE_EMAIL_ENABLED=false   # Email ВЫКЛЮЧЕН по умолчанию (требует SMTP)
FEATURE_WEBHOOK_ENABLED=true  # Webhooks включены по умолчанию
```

### ⚠️ Важно!

**Email по умолчанию ВЫКЛЮЧЕН**, так как требует настройки SMTP credentials. 

Если вы не настроите SMTP и оставите `FEATURE_EMAIL_ENABLED=false`, вы увидите в логах:
```
[EmailProviderService] Email provider is disabled. Set FEATURE_EMAIL_ENABLED=true to enable.
```

Это **нормально** и не является ошибкой. Приложение будет работать со всеми остальными каналами.

## 📧 Настройка Email (SMTP)

### Шаг 1: Получение SMTP credentials

#### Для Gmail:

1. Включите двухфакторную аутентификацию в Google Account
2. Перейдите в [App Passwords](https://myaccount.google.com/apppasswords)
3. Создайте новый App Password
4. Используйте сгенерированный пароль в `SMTP_PASSWORD`

#### Для Outlook/Hotmail:

1. Перейдите в настройки безопасности
2. Создайте App Password
3. Используйте его в настройках

#### Для SendGrid/Mailgun:

Получите API ключ из панели управления провайдера.

### Шаг 2: Добавление в .env

```env
# Включить Email канал
FEATURE_EMAIL_ENABLED=true

# SMTP настройки для Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM="CRM System" <noreply@example.com>
SMTP_FROM_NAME=CRM System

# Настройки массовой отправки
EMAIL_BATCH_SIZE=50
EMAIL_BATCH_DELAY=1000
```

### Шаг 3: Перезапуск приложения

```bash
npm run start:back
```

Если настройки правильные, вы увидите:
```
[EmailProviderService] SMTP connection verified successfully
```

### Популярные SMTP провайдеры

**Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Outlook:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
```

## 📱 Настройка SMS

SMS по умолчанию **включен**, но требует API ключей от провайдера.

```env
FEATURE_SMS_ENABLED=true

# Выберите провайдера
SMS_PROVIDER=smsru  # smsru | smsc | twilio

# SMS.RU
SMS_API_KEY=your-smsru-api-key
SMS_API_URL=https://sms.ru/sms/send
SMS_SENDER=CRM

# SMSC.RU (альтернатива)
# SMSC_LOGIN=your-login
# SMSC_PASSWORD=your-password

# Twilio (альтернатива)
# TWILIO_ACCOUNT_SID=your-sid
# TWILIO_AUTH_TOKEN=your-token
# TWILIO_PHONE_NUMBER=+1234567890
```

## 🌐 Настройка REST API/Webhooks

Webhooks по умолчанию **включены** и не требуют дополнительной настройки.

```env
FEATURE_WEBHOOK_ENABLED=true

# Опциональные настройки
WEBHOOK_TIMEOUT=5000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY=1000

# Глобальная аутентификация (опционально)
WEBHOOK_AUTH_TYPE=bearer  # bearer | basic | apikey | none
WEBHOOK_AUTH_TOKEN=your-default-token
```

## 🚨 Устранение проблем

### Ошибка: "Missing credentials for PLAIN"

**Причина:** Email канал включен, но не настроены SMTP credentials.

**Решение 1:** Выключить Email канал
```env
FEATURE_EMAIL_ENABLED=false
```

**Решение 2:** Настроить SMTP credentials
```env
FEATURE_EMAIL_ENABLED=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Ошибка: "SMTP connection verification failed"

**Возможные причины:**
1. Неверные credentials
2. Не создан App Password (для Gmail)
3. Неправильный порт (попробуйте 465 или 587)
4. Firewall блокирует соединение

**Решение:**
```env
# Попробуйте другой порт
SMTP_PORT=465
SMTP_SECURE=true

# Или отключите проверку TLS (не рекомендуется для production)
SMTP_TLS_REJECT_UNAUTHORIZED=false
```

### Email не работает, но приложение запускается

Если `FEATURE_EMAIL_ENABLED=false`, это **нормально**. Email просто не будет доступен, но остальные каналы работают.

Для использования Email:
1. Настройте SMTP credentials
2. Установите `FEATURE_EMAIL_ENABLED=true`
3. Перезапустите приложение

## 📊 Проверка статуса каналов

После запуска проверьте доступность каналов:

```bash
GET /notifications/health
```

Ответ:
```json
{
  "sms": {
    "available": true,
    "provider": "smsru",
    "balance": 1250.50
  },
  "email": {
    "available": false,  // false если FEATURE_EMAIL_ENABLED=false
    "provider": "smtp",
    "error": "Email provider is not enabled or not configured"
  },
  "webhook": {
    "available": true
  }
}
```

## ✅ Рекомендуемая конфигурация

### Для разработки (минимальная):
```env
FEATURE_SMS_ENABLED=true
FEATURE_EMAIL_ENABLED=false  # Выключен для быстрого старта
FEATURE_WEBHOOK_ENABLED=true

SMS_PROVIDER=smsru
SMS_API_KEY=test-key
```

### Для production (полная):
```env
FEATURE_SMS_ENABLED=true
FEATURE_EMAIL_ENABLED=true
FEATURE_WEBHOOK_ENABLED=true

# SMS
SMS_PROVIDER=smsru
SMS_API_KEY=production-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASSWORD=secure-app-password

# Webhooks
WEBHOOK_TIMEOUT=5000
WEBHOOK_MAX_RETRIES=3
```

## 🔒 Безопасность

**⚠️ Никогда не коммитьте .env файлы в git!**

1. Добавьте `.env` в `.gitignore`
2. Используйте `.env.example` как шаблон
3. Для production используйте переменные окружения сервера
4. Храните credentials в безопасном месте (1Password, AWS Secrets Manager и т.д.)

## 📚 Дополнительная документация

- [README.md](./README.md) - Обзор модуля
- [EMAIL_REST_EXAMPLES.md](./EMAIL_REST_EXAMPLES.md) - Примеры использования
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Итоги реализации
