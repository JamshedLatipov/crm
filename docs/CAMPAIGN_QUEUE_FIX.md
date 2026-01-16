# Campaign Queue Routing Fix - 7 января 2026

## Проблема
WhatsApp и Telegram кампании отправляли сообщения через SMS очередь (`crm_sms_queue`), что приводило к:
- Сохранению всех сообщений в таблицу `sms_messages` вместо `whatsapp_messages`/`telegram_messages`
- Неправильной статистике в аналитике (WhatsApp сообщения считались как SMS)
- Использованию неправильных провайдеров для отправки

## Корневая причина
Метод `SmsCampaignService.queueCampaignMessages()` использовал `QueueProducerService.queueSmsBatch()`, который **всегда** отправлял сообщения в SMS очередь, игнорируя канал кампании.

```typescript
// СТАРЫЙ КОД (НЕПРАВИЛЬНО):
await this.queueProducer.queueSmsBatch(campaignId, messageIds);
// ❌ Всегда отправляет в crm_sms_queue
```

## Решение
Изменён метод `queueCampaignMessages` для использования `MessageQueueService.queueNotification()`, который:
1. Определяет правильную очередь по каналу кампании
2. Отправляет в `crm_whatsapp_queue`, `crm_telegram_queue` или `crm_sms_queue`
3. Правильные consumers обрабатывают сообщения и сохраняют в нужные таблицы

```typescript
// НОВЫЙ КОД (ПРАВИЛЬНО):
await this.messageQueueService.queueNotification({
  channel: campaign.channel as MessageChannel,  // 🎯 Использует канал кампании
  templateId: campaign.templateId,
  recipient: { phoneNumber: message.phoneNumber },
  priority: 'normal',
  maxRetries: 3,
  metadata: { messageId: message.id, campaignId: campaign.id },
});
```

## Изменённые файлы

### 1. `/apps/back/src/app/modules/messages/services/sms-campaign.service.ts`

**Изменения:**
- Добавлен `MessageQueueService` в конструктор
- Изменён метод `queueCampaignMessages()`:
  - Загружает кампанию для получения `channel`
  - Использует `messageQueueService.queueNotification()` вместо `queueProducer.queueSmsBatch()`
  - Отправляет каждое сообщение индивидуально с правильным каналом

```typescript
constructor(
  // ... существующие зависимости
  @Optional() private queueProducer?: QueueProducerService,
  @Optional() private messageQueueService?: MessageQueueService,  // ✅ ДОБАВЛЕНО
) {}

private async queueCampaignMessages(campaignId: string): Promise<void> {
  if (!this.messageQueueService) {  // ✅ Проверяем MessageQueueService
    this.logger.warn('Message queue service not available, falling back to sync processing');
    return this.processCampaignMessages(campaignId);
  }

  // ✅ Получаем кампанию для channel
  const campaign = await this.campaignRepository.findOne({
    where: { id: campaignId },
    select: ['id', 'channel', 'templateId'],
  });

  // ✅ Отправляем через правильный канал
  for (const message of pendingMessages) {
    await this.messageQueueService.queueNotification({
      channel: campaign.channel as MessageChannel,  // 🎯 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ
      templateId: campaign.templateId,
      recipient: { phoneNumber: message.phoneNumber },
      // ...
    });
  }
}
```

## Проверка работы

### 1. Проверка consumers
```bash
docker exec crm-rabbitmq-1 rabbitmqctl list_consumers
```

Должны быть активны все 3 consumer:
```
crm_whatsapp_queue  ... prefetch_count: 5  active: true
crm_telegram_queue  ... prefetch_count: 5  active: true
crm_sms_queue      ... prefetch_count: 10 active: true
```

### 2. Отправка тестового WhatsApp сообщения

1. Создайте WhatsApp кампанию через UI
2. Отправьте сообщения
3. Проверьте логи backend:

```bash
# Должны увидеть:
[MessageQueueService] Queueing message ... to queue crm_whatsapp_queue, channel: whatsapp
[WhatsAppQueueConsumer] Processing WhatsApp message: ...
[WhatsAppProviderService] Sending WhatsApp message to +...
```

### 3. Проверка базы данных

```sql
-- Должны увидеть записи в whatsapp_messages
SELECT COUNT(*) FROM whatsapp_messages;

-- WhatsApp кампании не должны создавать записи в sms_messages
SELECT COUNT(*) FROM sms_messages WHERE "campaignId" IN (
  SELECT id FROM sms_campaigns WHERE channel = 'whatsapp'
);
-- ожидается: 0
```

### 4. Проверка аналитики

```bash
curl http://localhost:3000/api/messages/analytics/channels | jq '.'
```

WhatsApp сообщения должны отображаться в канале "WhatsApp", а не "SMS":
```json
[
  {
    "name": "WhatsApp",
    "sent": 2,      // ✅ Увеличивается для WhatsApp
    "delivered": 0,
    "failed": 0
  },
  {
    "name": "SMS",
    "sent": 10,     // ✅ НЕ увеличивается для WhatsApp
    "delivered": 0,
    "failed": 10
  }
]
```

## Архитектура потока сообщений

### До исправления ❌
```
SmsCampaignService
  → queueSmsBatch()
  → crm_sms_queue (ВСЕГДА!)
  → SmsQueueConsumer
  → sms_messages table (НЕПРАВИЛЬНО для WhatsApp)
```

### После исправления ✅
```
SmsCampaignService
  → queueNotification(channel: whatsapp)
  → MessageQueueService.getQueueNameByChannel()
  → crm_whatsapp_queue (ПРАВИЛЬНО!)
  → WhatsAppQueueConsumer
  → whatsapp_messages table (✅ ПРАВИЛЬНО)
```

## Следующие шаги

1. ✅ Перезапустить backend для применения изменений
2. ✅ Отправить тестовое WhatsApp сообщение
3. ✅ Проверить логи на наличие "crm_whatsapp_queue"
4. ✅ Проверить, что запись появилась в whatsapp_messages
5. ✅ Проверить аналитику

## Связанные файлы

- `apps/back/src/app/modules/messages/services/sms-campaign.service.ts` - главное изменение
- `apps/back/src/app/modules/messages/services/message-queue.service.ts` - правильная маршрутизация
- `apps/back/src/app/modules/queues/consumers/whatsapp-queue.consumer.ts` - consumer для WhatsApp
- `apps/back/src/app/modules/queues/consumers/telegram-queue.consumer.ts` - consumer для Telegram
- `WHATSAPP_CHANNEL_ATTRIBUTION_FIX.md` - документация предыдущих исправлений

## Автор
GitHub Copilot
Дата: 7 января 2026
