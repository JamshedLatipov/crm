# WhatsApp Channel Attribution Fix

## Проблема
WhatsApp сообщения отображались как SMS в аналитике, несмотря на правильное создание кампаний с `channel: 'whatsapp'`.

## Причина
Отсутствовали dedicated RabbitMQ consumers для WhatsApp и Telegram каналов. Все сообщения с routing key `whatsapp.send` и `telegram.send` не обрабатывались, так как были зарегистрированы только consumers для `sms.send`.

## Решение

### 1. Добавлены константы очередей
**Файл**: `apps/back/src/app/modules/queues/queue.constants.ts`

```typescript
export const QUEUE_NAMES = {
  SMS: 'crm_sms_queue',
  WHATSAPP: 'crm_whatsapp_queue',         // ✅ НОВОЕ
  TELEGRAM: 'crm_telegram_queue',         // ✅ НОВОЕ
  LEAD: 'crm_lead_queue',
  WEBHOOK: 'crm_webhook_queue',
  DLQ: 'crm_dead_letter_queue',
} as const;
```

### 2. Создан WhatsAppQueueConsumer
**Файл**: `apps/back/src/app/modules/queues/consumers/whatsapp-queue.consumer.ts`

- Подключается к RabbitMQ очереди `crm_whatsapp_queue`
- Привязывается к routing key `whatsapp.send`
- Обрабатывает сообщения из `QueuedMessage`
- Сохраняет результаты в таблицу `whatsapp_messages` (не `sms_messages`)
- Использует `WhatsAppProviderService` для отправки
- Рендерит шаблоны через `TemplateRenderService`

### 3. Создан TelegramQueueConsumer
**Файл**: `apps/back/src/app/modules/queues/consumers/telegram-queue.consumer.ts`

- Аналогично WhatsApp consumer
- Очередь: `crm_telegram_queue`
- Routing key: `telegram.send`
- Таблица: `telegram_messages`

### 4. Зарегистрированы новые consumers
**Файл**: `apps/back/src/app/modules/queues/queue-consumers.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmsMessage,
      SmsCampaign,
      WhatsAppMessage,           // ✅ НОВОЕ
      WhatsAppTemplate,          // ✅ НОВОЕ
      TelegramMessage,           // ✅ НОВОЕ
      TelegramTemplate,          // ✅ НОВОЕ
    ]),
    MessagesModule,
    LeadModule,
  ],
  providers: [
    SmsQueueConsumer,
    WhatsAppQueueConsumer,       // ✅ НОВОЕ
    TelegramQueueConsumer,       // ✅ НОВОЕ
    LeadQueueConsumer,
    WebhookQueueConsumer,
  ],
})
```

## Как это работает

### Текущий flow (после fix):

1. **Фронтенд** отправляет bulk send запрос:
   ```
   POST /api/messages/whatsapp/templates/:id/send-bulk
   Body: { contactIds: [...] }
   ```

2. **WhatsAppTemplateController** вызывает:
   ```typescript
   await this.queueService.queueWhatsAppBulk({
     templateId: id,
     contactIds: dto.contactIds,
     priority: dto.priority,
   });
   ```

3. **MessageQueueService** отправляет в RabbitMQ:
   ```typescript
   await this.client.emit('whatsapp.send', payload).toPromise();
   ```
   где routing key = `whatsapp.send`

4. **WhatsAppQueueConsumer** получает сообщение из `crm_whatsapp_queue`:
   - Загружает шаблон из `WhatsAppTemplate`
   - Рендерит контент с переменными
   - Отправляет через `WhatsAppProviderService`
   - **Сохраняет в `whatsapp_messages`** ✅ (не в `sms_messages`)

5. **MessageAnalyticsService** правильно читает статистику:
   ```typescript
   const whatsappStats = await this.whatsappMessageRepository
     .createQueryBuilder('whatsapp')
     .select('COUNT(*)', 'sent')
     .getRawOne();
   ```

## Тестирование

После перезапуска бэкенда:

1. Проверить наличие очередей в RabbitMQ:
   ```bash
   docker exec crm-rabbitmq-1 rabbitmqctl list_queues
   ```
   Должны быть:
   - `crm_whatsapp_queue`
   - `crm_telegram_queue`

2. Отправить тестовое WhatsApp сообщение через UI

3. Проверить в логах:
   ```
   [WhatsAppQueueConsumer] Processing WhatsApp message: <uuid>
   [WhatsAppQueueConsumer] WhatsApp message sent successfully: <uuid>
   ```

4. Проверить в БД:
   ```sql
   SELECT COUNT(*) FROM whatsapp_messages;  -- должно быть > 0
   SELECT COUNT(*) FROM sms_messages;       -- не должно расти
   ```

5. Проверить аналитику:
   ```bash
   curl http://localhost:3000/api/messages/analytics/channels
   ```
   Должны быть правильные цифры для WhatsApp канала

## Логи для отладки

В `message-queue.service.ts` добавлено логирование:
```typescript
const routingKey = `${notification.channel}.send`;
this.logger.log(`Queueing message ${messageId} to ${routingKey}, channel: ${notification.channel}`);
```

Теперь в логах видно:
```
[MessageQueueService] Queueing message <uuid> to whatsapp.send, channel: whatsapp
[WhatsAppQueueConsumer] Processing WhatsApp message: <uuid>
```

## Известные ограничения

1. **Кампании по-прежнему в `sms_campaigns`**
   - Кампании сохраняются в старую таблицу `sms_campaigns` с полем `channel`
   - Планировалась миграция на `message_campaigns`, но не завершена
   - Текущее решение работает, но требует рефакторинга в будущем

2. **MessageWorkerController не используется**
   - Класс `MessageWorkerController` с `@MessagePattern` декораторами создан, но не активен
   - Используются отдельные consumers через прямое подключение к amqplib
   - Возможна дальнейшая унификация

## Следующие шаги (опционально)

1. Мигрировать с `sms_campaigns` на `message_campaigns` полностью
2. Удалить неиспользуемый `MessageWorkerController`
3. Добавить тесты для новых consumers
4. Добавить retry logic и exponential backoff
5. Добавить метрики для мониторинга очередей
