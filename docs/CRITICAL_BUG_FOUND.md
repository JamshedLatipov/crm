# КРИТИЧЕСКАЯ ОШИБКА: prepareCampaignMessages() создаёт все сообщения в sms_messages

**Date:** 7 января 2026, 05:42  
**Status:** 🔴 КРИТИЧЕСКИЙ БАГ НАЙДЕН

## Проблема

### Тест показал реальную проблему:
1. Создал WhatsApp кампанию (ID: `8f37b79d-62ee-48d4-a547-cc9dcc3eb8b1`)
2. Запустил кампанию через API
3. Проверил базу данных:
   - `whatsapp_messages`: **0** ❌
   - `sms_messages` (новые за 5 минут от WhatsApp кампаний): **4** ❌
   - Сообщения имеют статус **pending** (не обработаны)
   - RabbitMQ очереди **пустые** (сообщения вообще не попали в очередь)

### Root Cause

**SmsCampaignService.prepareCampaignMessages()** всегда использует `this.messageRepository` (SmsMessage repository), независимо от канала кампании!

```typescript
// apps/back/src/app/modules/messages/services/sms-campaign.service.ts
// Строка ~261

// ❌ ПРОБЛЕМА: всегда использует SmsMessage repository
return this.messageRepository.create({
  campaign,
  contact: { id: contact.contactId } as any,
  phoneNumber: contact.phoneNumber,
  content,
  status: MessageStatus.PENDING,
  segmentsCount: this.calculateSegments(content),
});
```

## Почему предыдущие исправления не сработали

Мы исправили **queueCampaignMessages()**, **startCampaign()** и **resumeCampaign()**, но:

1. **prepareCampaignMessages()** вызывается **РАНЬШЕ** - при создании кампании (`create()`)
2. Он создаёт записи в **sms_messages** таблице
3. Затем **queueCampaignMessages()** пытается отправить эти сообщения в правильную очередь
4. Но **WhatsAppQueueConsumer** ищет сообщения в `whatsapp_messages` таблице!
5. **SmsQueueConsumer** обрабатывает сообщения из `sms_messages`, но у них `campaignId` от WhatsApp кампании!

## Архитектурная проблема

В проекте **две параллельные системы**:

### Старая система (используется):
- **SmsCampaign** entity → `sms_campaigns` table
- **SmsMessage** entity → `sms_messages` table
- **SmsCampaignService** - единый сервис для всех каналов
- Поле `channel` добавлено в SmsCampaign для поддержки WhatsApp/Telegram
- **ПРОБЛЕМА:** Все сообщения сохраняются в `sms_messages` независимо от канала

### Новая система (не используется):
- **MessageCampaign** entity → `message_campaigns` table (0 записей в БД)
- **WhatsAppMessage** entity → `whatsapp_messages` table
- **TelegramMessage** entity → `telegram_messages` table

## Решение

### Вариант 1: Исправить SmsCampaignService (БЫСТРО)

Добавить репозитории для WhatsApp и Telegram, использовать правильный в `prepareCampaignMessages()`:

```typescript
constructor(
  @InjectRepository(SmsCampaign)
  private campaignRepository: Repository<SmsCampaign>,
  @InjectRepository(SmsMessage)
  private smsMessageRepository: Repository<SmsMessage>,
  @InjectRepository(WhatsAppMessage)
  private whatsappMessageRepository: Repository<WhatsAppMessage>,
  @InjectRepository(TelegramMessage)
  private telegramMessageRepository: Repository<TelegramMessage>,
  // ...
) {}

private async prepareCampaignMessages(campaignId: string): Promise<void> {
  const campaign = await this.findOne(campaignId);
  // ...
  
  // Выбираем правильный репозиторий
  let messageRepository: Repository<any>;
  switch (campaign.channel) {
    case MessageChannel.SMS:
      messageRepository = this.smsMessageRepository;
      break;
    case MessageChannel.WHATSAPP:
      messageRepository = this.whatsappMessageRepository;
      break;
    case MessageChannel.TELEGRAM:
      messageRepository = this.telegramMessageRepository;
      break;
    default:
      throw new Error(`Unsupported channel: ${campaign.channel}`);
  }

  const messages = phoneNumbers.map((contact) => {
    return messageRepository.create({
      campaign: { id: campaign.id } as any, // Для WhatsApp/Telegram нужен MessageCampaign!
      contact: { id: contact.contactId } as any,
      phoneNumber: contact.phoneNumber,
      content: template.content,
      status: MessageStatus.PENDING,
    });
  });

  await messageRepository.save(messages);
}
```

**ПРОБЛЕМА:** WhatsAppMessage/TelegramMessage ждут `MessageCampaign`, а не `SmsCampaign`!

### Вариант 2: Миграция на MessageCampaign (ПРАВИЛЬНО, НО ДОЛГО)

1. Создать **MessageCampaignService**
2. Мигрировать данные из `sms_campaigns` → `message_campaigns`
3. Обновить фронтенд для работы с новым API
4. Удалить SmsCampaignService

### Вариант 3: Хак через промежуточную таблицу (КОСТЫЛЬ)

Создать view или использовать JSON metadata для связи SmsCampaign с правильной таблицей сообщений.

## Рекомендация

**Срочно реализовать Вариант 1**, но с модификацией:

1. Изменить WhatsAppMessage.campaign чтобы он принимал SmsCampaign:
   ```typescript
   @ManyToOne(() => SmsCampaign, { nullable: true })
   @JoinColumn({ name: 'campaignId' })
   campaign: SmsCampaign;
   ```

2. Аналогично для TelegramMessage

3. Исправить prepareCampaignMessages() для использования правильных репозиториев

4. **ВАЖНО:** Также исправить все методы, которые читают/обновляют сообщения:
   - `processCampaignMessages()`
   - `sendMessage()`
   - `checkCampaignCompletion()`
   - `getCampaignStats()`

## Impact

### Текущая ситуация:
- ❌ Все WhatsApp сообщения идут в `sms_messages`
- ❌ Аналитика показывает WhatsApp как SMS
- ❌ WhatsAppQueueConsumer не обрабатывает сообщения (ищет в пустой таблице)
- ❌ Счётчики кампаний некорректные

### После исправления:
- ✅ SMS → `sms_messages`
- ✅ WhatsApp → `whatsapp_messages`
- ✅ Telegram → `telegram_messages`
- ✅ Правильная аналитика
- ✅ Правильная обработка через consumers

## Next Steps

1. **URGENT:** Остановить все WhatsApp/Telegram кампании
2. Реализовать Вариант 1 с модификацией
3. Протестировать на новой кампании
4. Мигрировать старые данные (опционально)

---

**Вывод:** Мы исправили **queueing**, но не исправили **создание сообщений**. Это более глубокая проблема, требующая изменения entities и repositories.
