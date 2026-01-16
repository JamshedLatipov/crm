# Настройки стоимости кампаний

## ✅ РЕАЛИЗОВАНО ПОЛНОСТЬЮ

### Инициализация настроек

**ВАЖНО:** При первом запуске или после сброса БД необходимо инициализировать настройки по умолчанию:

```bash
curl -X POST http://localhost:3000/api/messages/settings/initialize-defaults
```

Этот endpoint создаст все настройки по умолчанию, включая стоимость для каждого канала.

### Backend интеграция - ЗАВЕРШЕНА

#### 1. Настройки добавлены в базу данных ✅

В `apps/back/src/app/modules/messages/services/setting.service.ts` добавлены настройки по умолчанию:

```typescript
// Campaign Cost Settings
{ key: 'SMS_COST_PER_MESSAGE', value: process.env.SMS_COST_PER_MESSAGE || '1.50', category: SettingCategory.CAMPAIGN, description: 'Стоимость отправки одного SMS сообщения в рублях' },
{ key: 'EMAIL_COST_PER_MESSAGE', value: process.env.EMAIL_COST_PER_MESSAGE || '0.05', category: SettingCategory.CAMPAIGN, description: 'Стоимость отправки одного Email сообщения в рублях' },
{ key: 'WHATSAPP_COST_PER_MESSAGE', value: process.env.WHATSAPP_COST_PER_MESSAGE || '0.80', category: SettingCategory.CAMPAIGN, description: 'Стоимость отправки одного WhatsApp сообщения в рублях' },
{ key: 'TELEGRAM_COST_PER_MESSAGE', value: process.env.TELEGRAM_COST_PER_MESSAGE || '0.00', category: SettingCategory.CAMPAIGN, description: 'Стоимость отправки одного Telegram сообщения в рублях (обычно бесплатно)' },
```

**Публичные endpoints** (не требуют авторизации):
- `POST /api/messages/settings/initialize-defaults` - инициализация настроек
- `GET /api/messages/settings/key/{key}` - получение настройки по ключу

#### 2. API метод в SettingService ✅

В `apps/front/src/app/messages/services/setting.service.ts` добавлен метод:

```typescript
/**
 * Получить стоимость отправки сообщения для указанного канала
 * @param channel - Канал отправки (sms, email, whatsapp, telegram)
 * @returns Observable с числовым значением стоимости
 */
getCostPerMessage(channel: string): Observable<number> {
  const key = `${channel.toUpperCase()}_COST_PER_MESSAGE`;
  return this.findByKey(key).pipe(
    map(setting => setting?.value ? parseFloat(setting.value) : 0),
    catchError(() => of(0))
  );
}
```

#### 3. Интеграция в CampaignFormComponent ✅

В `apps/front/src/app/messages/components/campaigns/campaign-form/campaign-form.component.ts`:

- ✅ Добавлен inject `SettingService`
- ✅ Создан signal `channelCost` для хранения текущей стоимости
- ✅ Добавлен метод `loadCostForChannel(channel: string)` для загрузки стоимости
- ✅ Метод вызывается при инициализации компонента
- ✅ Метод вызывается при смене канала через `onChannelChange()`
- ✅ Метод вызывается при загрузке существующей кампании
- ✅ `estimatedCost` computed property теперь использует `this.channelCost()` вместо захардкоженного значения

### Как это работает

1. **При создании новой кампании:**
   - Загружается стоимость для канала по умолчанию (SMS) при инициализации
   - При смене канала автоматически загружается новая стоимость

2. **При редактировании кампании:**
   - Загружается стоимость для канала этой кампании после загрузки данных

3. **Расчет стоимости:**
   - `estimatedCost` автоматически пересчитывается при изменении:
     - Количества получателей (через выбор сегмента)
     - Канала отправки (через смену канала)

### Настройки по умолчанию

- **SMS:** 1.50 ₽ за сообщение
- **Email:** 0.05 ₽ за сообщение  
- **WhatsApp:** 0.80 ₽ за сообщение
- **Telegram:** 0.00 ₽ за сообщение (бесплатно)

Эти значения можно переопределить через переменные окружения:
- `SMS_COST_PER_MESSAGE`
- `EMAIL_COST_PER_MESSAGE`
- `WHATSAPP_COST_PER_MESSAGE`
- `TELEGRAM_COST_PER_MESSAGE`

### Изменение настроек через UI

Для изменения стоимости через интерфейс используйте страницу настроек:

**Расположение:** `/settings` (доступ через кнопку шестеренки в сайдбаре)

**Компонент:** `apps/front/src/app/pages/settings/settings.component.ts`

### Структура страницы настроек

### Frontend
- **Компонент:** `apps/front/src/app/pages/settings/settings.component.ts`
- **Шаблон:** `apps/front/src/app/pages/settings/settings.component.html`
- **Стили:** `apps/front/src/app/pages/settings/settings.component.scss`
- **Маршруты:** `apps/front/src/app/app.routes.ts` (добавлен `/settings`)
- **Сайдбар:** `apps/front/src/app/sidebar/` (добавлен routerLink на кнопку шестеренки)

### Backend
- **Entity:** `apps/back/src/app/modules/messages/entities/setting.entity.ts`
- **Service:** `apps/back/src/app/modules/messages/services/setting.service.ts`
- **Controller:** `apps/back/src/app/modules/messages/controllers/setting.controller.ts`

## Скриншоты интерфейса

### Доступ к настройкам
1. Откройте приложение
2. Найдите кнопку шестеренки внизу сайдбара (рядом с кнопкой выхода)
3. Нажмите на неё для перехода на страницу `/settings`

### Вкладка "Цены кампаний"
- Поля для ввода стоимости SMS, Email, WhatsApp, Telegram
- Кнопка "Сохранить цены"
- Кнопка "Сбросить" для возврата к значениям по умолчанию

### Вкладка "Общие настройки"
- Поля для информации о компании
- Часовой пояс

## Использование в коде

### Backend (NestJS)

Добавьте метод в `SettingService` для получения стоимости по каналу:

```typescript
async getCostPerMessage(channel: string): Promise<number> {
  const key = `${channel.toLowerCase()}.cost_per_message`;
  const setting = await this.findByKey(key);
  return setting ? parseFloat(setting.value) : 0;
}
```

### Frontend (Angular)

1. Добавьте метод в `SettingService`:
```typescript
getCostPerMessage(channel: string): Observable<number> {
  const key = `${channel.toLowerCase()}.cost_per_message`;
  return this.getByKey(key).pipe(
    map(setting => parseFloat(setting?.value || '0'))
  );
}
```

2. Используйте в компоненте кампании:
```typescript
private loadCostSettings() {
  const channel = this.form.get('channel')?.value;
  this.settingService.getCostPerMessage(channel).subscribe(cost => {
    this.costPerMessage.set(cost);
  });
}
```

## Интерфейс для изменения настроек

В разделе "Настройки" → "Кампании" должны быть поля для редактирования:
- SMS: стоимость за сообщение
- Email: стоимость за сообщение
- WhatsApp: стоимость за сообщение
- Telegram: стоимость за сообщение

## Расчет стоимости кампании

```typescript
estimatedCost = computed(() => {
  const recipients = parseInt(this.estimatedRecipients().replace(/\s/g, '')) || 0;
  const costPerMessage = this.costPerMessage() || 0;
  return (recipients * costPerMessage).toFixed(2);
});
```

Где `this.costPerMessage()` - это значение, загруженное из настроек для текущего выбранного канала.
