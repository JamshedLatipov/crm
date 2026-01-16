# RabbitMQ Integration Strategy для Notifications

## Архитектура

### Два режима работы

```
┌─────────────────────────────────────────────────────┐
│           NOTIFICATION SERVICE                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐      ┌────────────────────┐  │
│  │  SYNC MODE      │      │   ASYNC MODE       │  │
│  │  (Direct Send)  │      │   (Queue-based)    │  │
│  └────────┬────────┘      └─────────┬──────────┘  │
│           │                          │             │
│           │ Одиночные               │ Массовые    │
│           │ сообщения               │ рассылки    │
│           ▼                          ▼             │
│  ┌─────────────────┐      ┌────────────────────┐  │
│  │   WhatsApp      │      │   RabbitMQ Queue   │  │
│  │   Telegram      │      │   ┌─────────────┐  │  │
│  │   Providers     │      │   │  Worker 1   │  │  │
│  └─────────────────┘      │   │  Worker 2   │  │  │
│                            │   │  Worker N   │  │  │
│                            └───┴─────────────┴──┘  │
└─────────────────────────────────────────────────────┘
```

## Когда использовать каждый режим

### SYNC Mode (Direct) - Без RabbitMQ

**Используется для:**
- ✅ Одиночные уведомления (1 сообщение)
- ✅ Триггеры (статус лида изменился → отправить уведомление)
- ✅ Тестовые отправки из интерфейса
- ✅ Предпросмотр шаблонов с реальными данными
- ✅ Webhook callbacks (нужен немедленный ответ)

**Преимущества:**
- Быстрый ответ
- Простая отладка
- Не требует дополнительных сервисов
- Прямой контроль над результатом

**Пример:**
```typescript
// Отправка уведомления менеджеру о новом лиде
await notificationService.sendWhatsAppNow({
  templateId: 'new-lead-alert',
  phoneNumber: manager.phone,
  leadId: lead.id
});
```

### ASYNC Mode (Queue) - С RabbitMQ

**Используется для:**
- ✅ Массовые рассылки (100+ сообщений)
- ✅ Email campaigns
- ✅ SMS campaigns
- ✅ Scheduled notifications (отложенные уведомления)
- ✅ Retry logic при сбоях
- ✅ Rate limiting (не превышать лимиты API)

**Преимущества:**
- Не блокирует HTTP request
- Параллельная обработка
- Автоматический retry
- Масштабирование (несколько workers)
- Персистентность (не теряем сообщения при restart)

**Пример:**
```typescript
// Массовая рассылка 1000 контактам
await notificationService.sendWhatsAppBulk({
  templateId: 'promo-campaign',
  contactIds: [...1000 контактов...],
  scheduled: new Date('2026-01-07 10:00')
});
```

## Implementation

### 1. Queues Structure

```typescript
// Очереди RabbitMQ
const QUEUES = {
  SMS_SEND: 'sms.send',
  EMAIL_SEND: 'email.send',
  WHATSAPP_SEND: 'whatsapp.send',
  TELEGRAM_SEND: 'telegram.send',
  NOTIFICATION_DLQ: 'notification.dlq', // Dead Letter Queue
};

// Exchanges
const EXCHANGES = {
  NOTIFICATIONS: 'notifications',
  RETRY: 'notifications.retry',
};
```

### 2. Message Format

```typescript
interface QueuedNotification {
  id: string;
  channel: 'whatsapp' | 'telegram' | 'sms' | 'email';
  templateId?: string;
  recipient: string;
  context: {
    contactId?: string;
    leadId?: number;
    dealId?: string;
    companyId?: string;
  };
  priority: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, any>;
}
```

### 3. Service Implementation

```typescript
@Injectable()
export class NotificationQueueService {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
    private readonly renderService: TemplateRenderService,
  ) {}

  /**
   * ASYNC: Отправить сообщение через очередь
   */
  async queueNotification(payload: QueuedNotification): Promise<string> {
    const messageId = uuidv4();
    
    await this.client.emit('whatsapp.send', {
      ...payload,
      id: messageId,
      queuedAt: new Date(),
    });

    return messageId;
  }

  /**
   * ASYNC: Массовая отправка
   */
  async queueBulk(params: {
    templateId: string;
    contactIds: string[];
    channel: 'whatsapp' | 'telegram';
  }): Promise<string[]> {
    const messageIds: string[] = [];

    // Батчами по 100 для эффективности
    const batchSize = 100;
    for (let i = 0; i < params.contactIds.length; i += batchSize) {
      const batch = params.contactIds.slice(i, i + batchSize);
      
      for (const contactId of batch) {
        const messageId = await this.queueNotification({
          id: uuidv4(),
          channel: params.channel,
          templateId: params.templateId,
          recipient: '', // Загрузится из contact
          context: { contactId },
          priority: 'normal',
          retryCount: 0,
          maxRetries: 3,
        });
        
        messageIds.push(messageId);
      }
    }

    return messageIds;
  }
}

/**
 * Worker для обработки очереди
 */
@Controller()
export class NotificationWorker {
  constructor(
    private readonly whatsappProvider: WhatsAppProviderService,
    private readonly telegramProvider: TelegramProviderService,
    private readonly renderService: TemplateRenderService,
  ) {}

  @MessagePattern('whatsapp.send')
  async handleWhatsAppMessage(data: QueuedNotification) {
    try {
      // 1. Загружаем шаблон
      const template = await this.templateRepo.findOne({
        where: { id: data.templateId }
      });

      // 2. Загружаем контекст
      const context = await this.renderService.loadContext(data.context);

      // 3. Рендерим сообщение
      const message = await this.renderService.renderTemplate(
        template.content,
        context
      );

      // 4. Отправляем
      const result = await this.whatsappProvider.sendMessage(
        context.contact.phone,
        message
      );

      // 5. Логируем успех
      this.logger.log(`WhatsApp sent: ${data.id}`);
      
      return { success: true, messageId: result.messageId };

    } catch (error) {
      this.logger.error(`WhatsApp failed: ${data.id}`, error);

      // Retry logic
      if (data.retryCount < data.maxRetries) {
        await this.retryMessage(data);
      } else {
        await this.moveToDLQ(data, error);
      }

      throw error;
    }
  }

  @MessagePattern('telegram.send')
  async handleTelegramMessage(data: QueuedNotification) {
    // Аналогично WhatsApp
  }

  private async retryMessage(data: QueuedNotification) {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const delay = Math.pow(2, data.retryCount) * 1000;

    setTimeout(async () => {
      await this.client.emit(data.channel + '.send', {
        ...data,
        retryCount: data.retryCount + 1,
      });
    }, delay);
  }

  private async moveToDLQ(data: QueuedNotification, error: any) {
    await this.client.emit('notification.dlq', {
      ...data,
      error: error.message,
      failedAt: new Date(),
    });
  }
}
```

### 4. Unified Service with Both Modes

```typescript
@Injectable()
export class NotificationService {
  constructor(
    private readonly whatsappProvider: WhatsAppProviderService,
    private readonly telegramProvider: TelegramProviderService,
    private readonly queueService: NotificationQueueService,
    private readonly renderService: TemplateRenderService,
  ) {}

  /**
   * SYNC: Отправить сразу (используется для одиночных сообщений)
   */
  async sendWhatsAppNow(params: {
    templateId: string;
    phoneNumber: string;
    contactId?: string;
    dealId?: string;
  }): Promise<SendWhatsAppResult> {
    // Загружаем и рендерим
    const template = await this.loadTemplate(params.templateId);
    const context = await this.renderService.loadContext({
      contactId: params.contactId,
      dealId: params.dealId,
    });
    const message = await this.renderService.renderTemplate(
      template.content,
      context
    );

    // Отправляем напрямую
    return await this.whatsappProvider.sendMessage(
      params.phoneNumber,
      message
    );
  }

  /**
   * ASYNC: Отправить через очередь (для массовых рассылок)
   */
  async sendWhatsAppBulk(params: {
    templateId: string;
    contactIds: string[];
    scheduled?: Date;
  }): Promise<string[]> {
    // Валидация шаблона
    const template = await this.loadTemplate(params.templateId);
    
    // Отправляем в очередь
    return await this.queueService.queueBulk({
      templateId: params.templateId,
      contactIds: params.contactIds,
      channel: 'whatsapp',
    });
  }

  /**
   * AUTO: Автоматический выбор режима
   */
  async sendWhatsAppAuto(params: {
    templateId: string;
    recipients: Array<{ phoneNumber: string; contactId: string }>;
  }): Promise<any> {
    // Если сообщений <= 10, отправляем синхронно
    if (params.recipients.length <= 10) {
      const results = await Promise.all(
        params.recipients.map(r => 
          this.sendWhatsAppNow({
            templateId: params.templateId,
            phoneNumber: r.phoneNumber,
            contactId: r.contactId,
          })
        )
      );
      return { mode: 'sync', results };
    }

    // Если > 10, отправляем через очередь
    const messageIds = await this.sendWhatsAppBulk({
      templateId: params.templateId,
      contactIds: params.recipients.map(r => r.contactId),
    });
    return { mode: 'async', messageIds };
  }
}
```

## Конфигурация

### docker-compose.yml

```yaml
rabbitmq:
  image: rabbitmq:3-management
  restart: always
  ports:
    - "5672:5672"   # AMQP
    - "15672:15672" # Management UI
  environment:
    RABBITMQ_DEFAULT_USER: guest
    RABBITMQ_DEFAULT_PASS: guest
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
  mem_limit: "512m"
```

### app.module.ts

```typescript
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'notifications',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
})
export class AppModule {}
```

## Мониторинг

### RabbitMQ Management UI

```
http://localhost:15672
Username: guest
Password: guest
```

### Метрики для отслеживания

- Queue depth (сколько сообщений в очереди)
- Consumer count (сколько workers)
- Message rate (сообщений/сек)
- Failed deliveries
- DLQ size

## Рекомендации

### Когда использовать SYNC

✅ Триггеры (лид создан → уведомление менеджеру)
✅ Тестовая отправка из UI
✅ Предпросмотр шаблонов
✅ Критичные уведомления (нужен немедленный ответ)

### Когда использовать ASYNC

✅ Campaigns (100+ получателей)
✅ Отложенные уведомления
✅ Рекуррентные задачи (ежедневные отчеты)
✅ Когда провайдер имеет rate limit

## Итоговая рекомендация

**Для вашей системы шаблонов:**

1. **CRUD шаблонов** → БЕЗ RabbitMQ (простой CRUD)
2. **Тестовая отправка** → БЕЗ RabbitMQ (нужен сразу результат)
3. **Одиночные уведомления** → БЕЗ RabbitMQ (быстро и просто)
4. **Массовые рассылки** → С RabbitMQ (уже используется в campaigns)
5. **Scheduled sends** → С RabbitMQ (отложенная доставка)

**Начните с SYNC режима**, добавьте ASYNC позже при необходимости масштабирования! 🚀
