# SMS Center - Примеры использования

## Быстрый старт

### 1. Создание первого шаблона

```bash
curl -X POST http://localhost:3000/api/sms/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Добро пожаловать",
    "content": "Привет, {{firstName}}! Рады видеть вас в {{company}}",
    "category": "welcome",
    "variables": ["firstName", "company"]
  }'
```

### 2. Создание сегмента "Новые лиды"

```bash
curl -X POST http://localhost:3000/api/sms/segments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Новые лиды за последнюю неделю",
    "filters": [
      {
        "field": "createdAt",
        "operator": "greater",
        "value": "2024-12-20"
      },
      {
        "field": "status",
        "operator": "equals",
        "value": "new"
      }
    ],
    "filterLogic": "AND",
    "isDynamic": true
  }'
```

### 3. Запуск кампании

```bash
# Создать кампанию
CAMPAIGN_ID=$(curl -X POST http://localhost:3000/api/sms/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Рассылка новым лидам",
    "templateId": "TEMPLATE_UUID",
    "segmentId": "SEGMENT_UUID",
    "type": "immediate"
  }' | jq -r '.id')

# Подготовить сообщения
curl -X POST "http://localhost:3000/api/sms/campaigns/$CAMPAIGN_ID/prepare" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Запустить
curl -X POST "http://localhost:3000/api/sms/campaigns/$CAMPAIGN_ID/start" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Сценарии использования

### Сценарий 1: Приветственная SMS новым клиентам

```typescript
// 1. Создаём шаблон приветствия
const template = await fetch('/api/sms/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Приветствие нового клиента',
    content: 'Здравствуйте, {{firstName}}! Спасибо за выбор нашей компании. Ваш персональный менеджер: {{managerName}}',
    category: 'welcome',
    variables: ['firstName', 'managerName']
  })
});

// 2. Создаём triggered кампанию
const campaign = await fetch('/api/sms/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Автоприветствие',
    templateId: template.id,
    type: 'triggered',
    settings: {
      sendingSpeed: 30
    }
  })
});

// 3. В коде при создании нового клиента:
async function onNewCustomer(customer) {
  await fetch('/api/sms/send/single', {
    method: 'POST',
    body: JSON.stringify({
      phoneNumber: customer.phone,
      templateId: template.id,
      variables: {
        firstName: customer.firstName,
        managerName: customer.manager.name
      },
      contactId: customer.id
    })
  });
}
```

### Сценарий 2: Еженедельная рассылка спецпредложений

```typescript
// Создаём сегмент активных клиентов
const activeCustomers = await fetch('/api/sms/segments', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Активные клиенты',
    filters: [
      { field: 'lastPurchaseDate', operator: 'greater', value: '2024-11-01' },
      { field: 'status', operator: 'equals', value: 'active' },
      { field: 'emailSubscribed', operator: 'equals', value: true }
    ],
    filterLogic: 'AND',
    isDynamic: true
  })
});

// Создаём recurring кампанию
const campaign = await fetch('/api/sms/campaigns', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Еженедельные спецпредложения',
    templateId: 'PROMO_TEMPLATE_ID',
    segmentId: activeCustomers.id,
    type: 'recurring',
    scheduledAt: '2024-12-28T10:00:00Z', // Пятница 10:00
    settings: {
      sendingSpeed: 100,
      scheduleTime: '10:00',
      timezone: 'Europe/Moscow'
    }
  })
});
```

### Сценарий 3: Напоминание о неоплаченных счетах

```typescript
// Сегмент клиентов с просроченными счетами
const overdueInvoices = await fetch('/api/sms/segments', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Просроченные счета',
    filters: [
      { field: 'invoiceStatus', operator: 'equals', value: 'overdue' },
      { field: 'daysOverdue', operator: 'greater', value: 3 }
    ],
    filterLogic: 'AND'
  })
});

// Шаблон напоминания
const template = await fetch('/api/sms/templates', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Напоминание об оплате',
    content: 'Уважаемый {{firstName}}, напоминаем о счёте №{{invoiceNumber}} на сумму {{amount}} руб. Просьба оплатить в ближайшее время.',
    category: 'reminder',
    variables: ['firstName', 'invoiceNumber', 'amount']
  })
});

// Запускаем кампанию
const campaign = await fetch('/api/sms/campaigns', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Напоминание о счетах',
    templateId: template.id,
    segmentId: overdueInvoices.id,
    type: 'immediate'
  })
});
```

### Сценарий 4: A/B тестирование шаблонов

```typescript
// Создаём два варианта шаблона
const templateA = await createTemplate({
  name: 'Вариант A - короткий',
  content: 'Скидка 20% до конца недели! {{link}}'
});

const templateB = await createTemplate({
  name: 'Вариант B - подробный',
  content: 'Специальное предложение для вас! Скидка 20% на все товары до воскресенья. Подробности: {{link}}'
});

// Делим сегмент на две части
const segmentA = await createSegment({
  name: 'Группа A (50%)',
  filters: [
    { field: 'id', operator: 'in', value: firstHalfIds }
  ]
});

const segmentB = await createSegment({
  name: 'Группа B (50%)',
  filters: [
    { field: 'id', operator: 'in', value: secondHalfIds }
  ]
});

// Запускаем две кампании
const campaignA = await createAndStartCampaign(templateA.id, segmentA.id);
const campaignB = await createAndStartCampaign(templateB.id, segmentB.id);

// Через некоторое время сравниваем результаты
const comparison = await fetch(
  `/api/sms/analytics/campaigns/compare?campaignIds=${campaignA.id},${campaignB.id}`
);
```

### Сценарий 5: Сложная сегментация

```typescript
// Сегмент: VIP клиенты из Москвы с покупками > 100К
const vipMoscow = await fetch('/api/sms/segments', {
  method: 'POST',
  body: JSON.stringify({
    name: 'VIP Москва 100K+',
    filters: [
      { field: 'city', operator: 'equals', value: 'Москва' },
      { field: 'totalPurchases', operator: 'greater', value: 100000 },
      { field: 'status', operator: 'equals', value: 'vip' },
      { field: 'phone', operator: 'not_equals', value: null }
    ],
    filterLogic: 'AND',
    isDynamic: true
  })
});

// Предпросмотр перед созданием
const preview = await fetch('/api/sms/segments/preview', {
  method: 'POST',
  body: JSON.stringify({
    filters: vipMoscow.filters,
    filterLogic: 'AND'
  })
});

console.log(`Будет отправлено ${preview.total} сообщений`);
```

## Интеграция в код приложения

### Пример: отправка SMS при создании лида

```typescript
// lead.service.ts
import { Injectable } from '@nestjs/common';
import { SmsProviderService } from '../sms/services/sms-provider.service';
import { SmsTemplateService } from '../sms/services/sms-template.service';

@Injectable()
export class LeadService {
  constructor(
    private smsProvider: SmsProviderService,
    private smsTemplate: SmsTemplateService
  ) {}

  async createLead(createLeadDto: CreateLeadDto) {
    const lead = await this.leadRepository.save(createLeadDto);

    // Автоматически отправляем SMS
    try {
      const template = await this.smsTemplate.findOne('WELCOME_TEMPLATE_ID');
      const message = this.smsTemplate.renderTemplate(template, {
        firstName: lead.name,
        company: 'Наша Компания'
      });

      await this.smsProvider.sendSms(lead.phone, message);
    } catch (error) {
      console.error('Failed to send welcome SMS:', error);
    }

    return lead;
  }
}
```

### Пример: мониторинг кампании

```typescript
// Получение статистики кампании в реальном времени
async function monitorCampaign(campaignId: string) {
  const stats = await fetch(`/api/sms/campaigns/${campaignId}/stats`);
  
  console.log(`
    Кампания: ${stats.campaign.name}
    Статус: ${stats.campaign.status}
    Отправлено: ${stats.campaign.sentCount}/${stats.campaign.totalRecipients}
    Доставлено: ${stats.campaign.deliveredCount}
    Ошибок: ${stats.campaign.failedCount}
    Процент доставки: ${stats.deliveryRate.toFixed(2)}%
    Общая стоимость: ${stats.campaign.totalCost} руб.
  `);

  return stats;
}

// Запускаем мониторинг каждые 30 секунд
setInterval(() => monitorCampaign('CAMPAIGN_ID'), 30000);
```

### Пример: экспорт отчёта

```typescript
async function exportCampaignReport(campaignId: string) {
  const report = await fetch(`/api/sms/analytics/campaigns/${campaignId}/export`);
  
  // Сохраняем в CSV
  const csv = [
    'Телефон,Статус,Стоимость,Дата отправки,Дата доставки',
    ...report.messages.map(m => 
      `${m.phoneNumber},${m.status},${m.cost},${m.sentAt},${m.deliveredAt}`
    )
  ].join('\n');

  fs.writeFileSync(`campaign_${campaignId}_report.csv`, csv);
  
  console.log('Отчёт сохранён!');
  console.log(`Итого: ${report.summary.totalMessages} сообщений`);
  console.log(`Доставлено: ${report.summary.deliveryRate}%`);
  console.log(`Стоимость: ${report.summary.totalCost} руб.`);
}
```

## Лучшие практики

### 1. Тестируйте перед массовой отправкой

```typescript
// Всегда тестируйте шаблон перед запуском
await fetch('/api/sms/templates/test', {
  method: 'POST',
  body: JSON.stringify({
    templateId: 'YOUR_TEMPLATE_ID',
    phoneNumber: '+79991234567', // Ваш номер
    variables: {
      firstName: 'Тест',
      company: 'Тестовая Компания'
    }
  })
});
```

### 2. Используйте динамические сегменты

```typescript
// Сегмент автоматически обновляется
const segment = await createSegment({
  name: 'Активные за месяц',
  isDynamic: true,
  filters: [...]
});

// Пересчёт происходит автоматически перед запуском кампании
```

### 3. Контролируйте скорость отправки

```typescript
// Не перегружайте провайдера
const campaign = await createCampaign({
  name: 'Массовая рассылка',
  settings: {
    sendingSpeed: 60, // 60 сообщений в минуту
    retryFailedMessages: true,
    maxRetries: 3
  }
});
```

### 4. Мониторьте неудачные отправки

```typescript
// Регулярно проверяйте проблемные номера
const failedNumbers = await fetch('/api/sms/analytics/failed/top?limit=20');

// Удаляйте их из базы или помечайте как недействительные
for (const failed of failedNumbers) {
  if (failed.failedCount > 5) {
    await markPhoneAsInvalid(failed.phoneNumber);
  }
}
```

### 5. Анализируйте лучшее время отправки

```typescript
// Смотрите статистику по часам
const hourlyStats = await fetch('/api/sms/analytics/messages/by-hour');

// Находим часы с лучшей доставкой
const bestHours = hourlyStats
  .filter(h => h.deliveryRate > 95)
  .map(h => h.hour);

console.log(`Лучшее время для отправки: ${bestHours.join(', ')} часов`);
```

## Устранение неполадок

### Проблема: Сообщения не отправляются

```typescript
// 1. Проверьте баланс провайдера
const balance = await smsProvider.checkBalance();
console.log(`Баланс: ${balance.balance} ${balance.currency}`);

// 2. Проверьте статус кампании
const campaign = await fetch(`/api/sms/campaigns/${campaignId}`);
console.log(`Статус: ${campaign.status}`);

// 3. Проверьте логи ошибок
const failedMessages = await fetch(
  `/api/sms/messages?campaignId=${campaignId}&status=failed`
);
```

### Проблема: Низкий процент доставки

```typescript
// Анализируем причины
const stats = await fetch(`/api/sms/campaigns/${campaignId}/stats`);

if (stats.deliveryRate < 90) {
  console.log('Проверьте:');
  console.log('1. Корректность номеров телефонов');
  console.log('2. Настройки провайдера');
  console.log('3. Топ неудачных номеров');
  
  const topFailed = await fetch('/api/sms/analytics/failed/top');
  console.table(topFailed);
}
```

## Заключение

SMS-центр предоставляет мощные инструменты для управления массовыми рассылками. Следуйте лучшим практикам, тестируйте перед запуском и анализируйте результаты для постоянного улучшения эффективности ваших кампаний!
