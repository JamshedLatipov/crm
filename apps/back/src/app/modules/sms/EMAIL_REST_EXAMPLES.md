# Email & REST API Integration Examples

Примеры использования Email и REST API функционала в модуле уведомлений.

## 📧 Email Templates

### Создание HTML шаблона

```typescript
POST /email-templates
{
  "name": "Приветственное письмо",
  "description": "Отправляется новым пользователям после регистрации",
  "subject": "Добро пожаловать в {{company}}!",
  "preheader": "Спасибо за регистрацию",
  "category": "welcome",
  "htmlContent": `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Здравствуйте, {{firstName}}!</h1>
          <p>Спасибо за регистрацию в <strong>{{company}}</strong>.</p>
          <p>Ваш email: <code>{{email}}</code></p>
          <a href="{{loginUrl}}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">
            Войти в систему
          </a>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Если вы не регистрировались на нашем сайте, проигнорируйте это письмо.
          </p>
        </div>
      </body>
    </html>
  `,
  "textContent": "Здравствуйте, {{firstName}}! Спасибо за регистрацию в {{company}}. Войдите в систему: {{loginUrl}}",
  "cssStyles": null,
  "variables": {
    "firstName": "Имя пользователя",
    "company": "Название компании",
    "email": "Email пользователя",
    "loginUrl": "Ссылка для входа"
  }
}
```

### Валидация HTML шаблона

```typescript
POST /email-templates/validate
{
  "htmlContent": "<html><body><h1>Test</h1><script>alert('xss')</script></body></html>"
}

// Response:
{
  "isValid": false,
  "errors": [
    "Script tags are not allowed in email templates"
  ],
  "warnings": []
}
```

### Рендеринг шаблона (предпросмотр)

```typescript
POST /email-templates/:id/render
{
  "variables": {
    "firstName": "Иван",
    "company": "Acme Corp",
    "email": "ivan@example.com",
    "loginUrl": "https://example.com/login"
  }
}

// Response:
{
  "subject": "Добро пожаловать в Acme Corp!",
  "html": "<html>...</html>",
  "text": "Здравствуйте, Иван!..."
}
```

### Получение статистики шаблона

```typescript
GET /email-templates/:id/statistics

// Response:
{
  "template": {
    "id": "uuid",
    "name": "Приветственное письмо",
    "category": "welcome",
    ...
  },
  "stats": {
    "totalSent": 1250,
    "totalDelivered": 1200,
    "totalOpened": 800,
    "totalClicked": 350,
    "totalBounced": 50,
    "totalUnsubscribed": 15,
    "deliveryRate": 96.0,
    "openRate": 66.67,
    "clickRate": 43.75,
    "bounceRate": 4.0,
    "unsubscribeRate": 1.25
  }
}
```

## 🔔 Notification API

### Отправка уведомления через один канал

**SMS:**
```typescript
POST /notifications/send
{
  "channel": "sms",
  "recipient": "+79991234567",
  "message": "Ваш код подтверждения: 1234",
  "metadata": {
    "type": "verification",
    "userId": "uuid"
  }
}
```

**Email:**
```typescript
POST /notifications/send
{
  "channel": "email",
  "recipient": "user@example.com",
  "subject": "Подтверждение регистрации",
  "message": "<html><body><h1>Добро пожаловать!</h1></body></html>",
  "template": "welcome-email-id",
  "variables": {
    "firstName": "Иван",
    "company": "Acme Corp"
  }
}
```

**Webhook:**
```typescript
POST /notifications/send
{
  "channel": "webhook",
  "recipient": "https://api.example.com/webhooks/notifications",
  "message": "User registered",
  "metadata": {
    "event": "user.registered",
    "userId": "uuid",
    "timestamp": "2025-12-27T10:00:00Z"
  }
}
```

### Многоканальная отправка

Отправка одного уведомления через несколько каналов параллельно:

```typescript
POST /notifications/send-multi
{
  "channels": ["sms", "email", "webhook"],
  "sms": {
    "phoneNumber": "+79991234567",
    "message": "Заказ #12345 подтверждён"
  },
  "email": {
    "to": "user@example.com",
    "subject": "Заказ #12345 подтверждён",
    "html": "<html>...</html>"
  },
  "webhook": {
    "url": "https://api.example.com/webhooks/orders",
    "event": "order.confirmed",
    "data": {
      "orderId": "12345",
      "userId": "uuid",
      "amount": 1500.00
    }
  },
  "variables": {
    "orderId": "12345",
    "userName": "Иван Иванов"
  }
}

// Response:
{
  "results": {
    "sms": {
      "success": true,
      "messageId": "sms-uuid",
      "provider": "smsru",
      "cost": 1.5
    },
    "email": {
      "success": true,
      "messageId": "<email-id@example.com>",
      "provider": "smtp"
    },
    "webhook": {
      "success": true,
      "statusCode": 200,
      "responseTime": 145
    }
  },
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

### Массовая отправка через один канал

```typescript
POST /notifications/send-bulk
{
  "channel": "email",
  "notifications": [
    {
      "recipient": "user1@example.com",
      "subject": "Новости компании",
      "message": "<html>...</html>",
      "variables": {
        "firstName": "Иван"
      }
    },
    {
      "recipient": "user2@example.com",
      "subject": "Новости компании",
      "message": "<html>...</html>",
      "variables": {
        "firstName": "Мария"
      }
    }
  ]
}

// Response:
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "recipient": "user1@example.com",
      "success": true,
      "messageId": "<id1@example.com>"
    },
    {
      "recipient": "user2@example.com",
      "success": true,
      "messageId": "<id2@example.com>"
    }
  ]
}
```

### Проверка доступности каналов

```typescript
GET /notifications/health

// Response:
{
  "sms": {
    "available": true,
    "provider": "smsru",
    "balance": 1250.50,
    "lastCheck": "2025-12-27T10:30:00Z"
  },
  "email": {
    "available": true,
    "provider": "smtp",
    "host": "smtp.gmail.com",
    "lastCheck": "2025-12-27T10:30:00Z"
  },
  "webhook": {
    "available": true,
    "lastCheck": "2025-12-27T10:30:00Z"
  }
}
```

### Статистика по каналам

```typescript
GET /notifications/stats

// Response:
{
  "sms": {
    "totalSent": 15420,
    "totalDelivered": 14850,
    "totalFailed": 570,
    "deliveryRate": 96.3,
    "averageCost": 1.5
  },
  "email": {
    "totalSent": 45200,
    "totalDelivered": 43500,
    "totalOpened": 28000,
    "totalClicked": 8500,
    "deliveryRate": 96.2,
    "openRate": 64.4,
    "clickRate": 30.4
  },
  "webhook": {
    "totalSent": 8900,
    "totalSuccessful": 8750,
    "totalFailed": 150,
    "successRate": 98.3,
    "averageResponseTime": 125
  }
}
```

## 🌐 REST API Provider Configuration

### Конфигурация в .env

```env
# REST API Webhook настройки
WEBHOOK_TIMEOUT=5000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY=1000

# Аутентификация для исходящих webhooks
WEBHOOK_AUTH_TYPE=bearer        # bearer | basic | apikey | none
WEBHOOK_AUTH_TOKEN=your_token   # Для bearer
WEBHOOK_API_KEY=your_api_key    # Для apikey
WEBHOOK_USERNAME=user           # Для basic
WEBHOOK_PASSWORD=pass           # Для basic
```

### Отправка webhook с различными типами аутентификации

**Bearer Token:**
```typescript
POST /notifications/send
{
  "channel": "webhook",
  "recipient": "https://api.example.com/events",
  "message": "New event",
  "metadata": {
    "event": "user.created",
    "auth": {
      "type": "bearer",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**API Key:**
```typescript
POST /notifications/send
{
  "channel": "webhook",
  "recipient": "https://api.example.com/events",
  "message": "New event",
  "metadata": {
    "event": "user.created",
    "auth": {
      "type": "apikey",
      "key": "x-api-key",
      "value": "your-api-key-here"
    }
  }
}
```

**Basic Auth:**
```typescript
POST /notifications/send
{
  "channel": "webhook",
  "recipient": "https://api.example.com/events",
  "message": "New event",
  "metadata": {
    "event": "user.created",
    "auth": {
      "type": "basic",
      "username": "api_user",
      "password": "api_password"
    }
  }
}
```

## 📊 Многоканальные кампании

### Создание многоканальной кампании

```typescript
POST /notification-campaigns
{
  "name": "Акция на Новый Год 2026",
  "description": "Многоканальное оповещение о новогодней акции",
  "channels": ["sms", "email", "webhook"],
  "type": "scheduled",
  "scheduledAt": "2025-12-31T10:00:00Z",
  "segmentId": "active-customers-segment-id",
  "smsTemplateId": "new-year-sms-template-id",
  "emailTemplateId": "new-year-email-template-id",
  "settings": {
    "sms": {
      "enabled": true,
      "provider": "smsru",
      "sendingSpeed": 100,
      "retryFailed": true
    },
    "email": {
      "enabled": true,
      "smtpHost": "smtp.gmail.com",
      "smtpPort": 587,
      "from": "noreply@example.com",
      "replyTo": "support@example.com"
    },
    "webhook": {
      "enabled": true,
      "url": "https://api.example.com/campaigns/notifications",
      "event": "campaign.new_year_2026",
      "authentication": {
        "type": "bearer",
        "token": "your-token"
      }
    }
  }
}
```

### Статистика многоканальной кампании

```typescript
GET /notification-campaigns/:id/stats

// Response:
{
  "campaign": {
    "id": "uuid",
    "name": "Акция на Новый Год 2026",
    "channels": ["sms", "email", "webhook"],
    "status": "completed"
  },
  "overall": {
    "totalRecipients": 5000,
    "totalSent": 15000,        // 5000 * 3 channels
    "totalDelivered": 14500,
    "totalFailed": 500,
    "deliveryRate": 96.67
  },
  "channelStats": [
    {
      "channel": "sms",
      "sent": 5000,
      "delivered": 4850,
      "failed": 150,
      "cost": 7500.00,
      "deliveryRate": 97.0
    },
    {
      "channel": "email",
      "sent": 5000,
      "delivered": 4800,
      "opened": 3200,
      "clicked": 950,
      "failed": 200,
      "deliveryRate": 96.0,
      "openRate": 66.67,
      "clickRate": 29.69
    },
    {
      "channel": "webhook",
      "sent": 5000,
      "successful": 4850,
      "failed": 150,
      "successRate": 97.0,
      "averageResponseTime": 135
    }
  ]
}
```

## 🔧 Email Provider (SMTP) Configuration

### Конфигурация в .env

```env
# SMTP настройки
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false              # true для порта 465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@example.com
SMTP_FROM_NAME=CRM System

# Массовая отправка
EMAIL_BATCH_SIZE=50
EMAIL_BATCH_DELAY=1000         # мс между батчами
```

### Gmail App Password

Для Gmail нужно создать App Password:
1. Перейти в Google Account Settings
2. Security → 2-Step Verification
3. App passwords → Generate
4. Использовать сгенерированный пароль в `SMTP_PASSWORD`

### Примеры конфигураций для популярных провайдеров

**Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Outlook/Hotmail:**
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

## 🎯 Use Cases

### Case 1: Подтверждение заказа

Отправить клиенту уведомление о подтверждении заказа через SMS и Email:

```typescript
POST /notifications/send-multi
{
  "channels": ["sms", "email"],
  "sms": {
    "phoneNumber": "+79991234567",
    "message": "Заказ #{{orderId}} подтверждён. Сумма: {{amount}} руб. Доставка: {{deliveryDate}}"
  },
  "email": {
    "to": "customer@example.com",
    "subject": "Заказ #{{orderId}} подтверждён",
    "html": "<!-- HTML template with order details -->"
  },
  "variables": {
    "orderId": "12345",
    "amount": "1500.00",
    "deliveryDate": "28.12.2025"
  }
}
```

### Case 2: Webhook уведомление о событии

Уведомить внешнюю систему о новом лиде:

```typescript
POST /notifications/send
{
  "channel": "webhook",
  "recipient": "https://crm-external.example.com/api/leads",
  "message": "New lead created",
  "metadata": {
    "event": "lead.created",
    "data": {
      "leadId": "uuid",
      "name": "Иван Иванов",
      "phone": "+79991234567",
      "email": "ivan@example.com",
      "source": "website",
      "createdAt": "2025-12-27T10:00:00Z"
    },
    "auth": {
      "type": "bearer",
      "token": "integration-token"
    }
  }
}
```

### Case 3: Напоминание о встрече

За день до встречи отправить напоминание через SMS и Email:

```typescript
POST /notifications/send-multi
{
  "channels": ["sms", "email"],
  "sms": {
    "phoneNumber": "+79991234567",
    "message": "Напоминание: завтра в {{time}} встреча с {{manager}}. Адрес: {{address}}"
  },
  "email": {
    "to": "client@example.com",
    "subject": "Напоминание о встрече завтра",
    "html": "<!-- Meeting reminder HTML template -->"
  },
  "variables": {
    "time": "14:00",
    "manager": "Петров И.И.",
    "address": "ул. Ленина, 10"
  }
}
```

## 🔒 Безопасность

### Валидация Email

Email-адреса автоматически валидируются перед отправкой:

```typescript
// В EmailProviderService
private validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

### Защита от XSS в HTML шаблонах

HTML шаблоны проверяются на наличие опасного контента:

```typescript
// Запрещено:
- <script> теги
- javascript: URL
- on* event handlers
- <iframe> теги

// Разрешено:
- Стандартные HTML теги (div, p, h1, a, img, table и т.д.)
- Inline CSS стили
- Классы и ID
```

### Rate Limiting

Рекомендуется настроить rate limiting для API endpoints:

```typescript
// В main.ts или в guards
import { ThrottlerModule } from '@nestjs/throttler';

ThrottlerModule.forRoot({
  ttl: 60,
  limit: 10, // 10 запросов в минуту
})
```

## 📈 Мониторинг и логирование

Все отправки логируются с детальной информацией:

```typescript
{
  "timestamp": "2025-12-27T10:30:00Z",
  "channel": "email",
  "recipient": "user@example.com",
  "status": "delivered",
  "messageId": "<id@example.com>",
  "duration": 245,
  "metadata": {
    "campaignId": "uuid",
    "templateId": "uuid"
  }
}
```

Ошибки также детально логируются:

```typescript
{
  "timestamp": "2025-12-27T10:30:00Z",
  "channel": "webhook",
  "recipient": "https://api.example.com/events",
  "status": "failed",
  "error": "Connection timeout after 5000ms",
  "retryAttempt": 2,
  "willRetry": true
}
```
