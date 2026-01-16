# Реализация статистики кампаний

## Дата: 07.01.2026

## URL
http://localhost:4200/messages/campaigns/11bbd3dd-20dc-4f4c-a8e7-98f97251e44b/stats

## Что было сделано

### 1. Backend (уже реализовано)
✅ Эндпоинт `GET /messages/campaigns/:id/stats` уже существует
- Контроллер: `apps/back/src/app/modules/messages/controllers/sms-campaign.controller.ts`
- Сервис: `apps/back/src/app/modules/messages/services/message-campaign.service.ts`
- Метод: `getCampaignStats(campaignId: string)`

Возвращаемые данные:
```typescript
{
  campaign: MessageCampaign,
  messagesByStatus: {
    [status: string]: number
  }
}
```

### 2. Frontend - Сервис

**Файл:** `apps/front/src/app/messages/services/notification.service.ts`

Добавлен метод:
```typescript
getCampaignStats(campaignId: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/campaigns/${campaignId}/stats`);
}
```

### 3. Frontend - Компонент

**Файл:** `apps/front/src/app/messages/components/campaigns/campaign-stats/campaign-stats.component.ts`

Изменения:
- ✅ Добавлен импорт `NotificationService`
- ✅ Добавлен импорт `MatProgressSpinnerModule` для индикатора загрузки
- ✅ Добавлен сигнал `loading` для отслеживания состояния загрузки
- ✅ Добавлен сигнал `campaign` для хранения данных кампании
- ✅ Обновлен сигнал `stats` с правильной структурой данных
- ✅ Добавлен метод `loadCampaignStats()` для загрузки данных с бэкенда
- ✅ Добавлен `computed` `deliveryRatePercent()` для расчета процента доставляемости
- ✅ Добавлен `computed` `failureRatePercent()` для расчета процента ошибок
- ✅ Удален TODO комментарий

Статистика рассчитывается на основе данных:
```typescript
const messagesByStatus = data.messagesByStatus || {};
const sent = (messagesByStatus['sent'] || 0) + 
             (messagesByStatus['delivered'] || 0) + 
             (messagesByStatus['failed'] || 0);
const delivered = messagesByStatus['delivered'] || 0;
const failed = messagesByStatus['failed'] || 0;
const pending = messagesByStatus['pending'] || 0;
const total = data.campaign.totalRecipients || 0;
const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
```

### 4. Frontend - Шаблон

**Файл:** `apps/front/src/app/messages/components/campaigns/campaign-stats/campaign-stats.component.html`

Изменения:
- ✅ Добавлен индикатор загрузки (`@if (loading())`)
- ✅ Обновлен путь для кнопки "К списку" с `/notifications/campaigns` на `/messages/campaigns`
- ✅ Использование реальных данных из `campaign()` сигнала:
  - Название кампании: `campaign()?.name`
  - Канал: `campaign()?.channel?.toUpperCase()`
  - Статус: `campaign()?.status`
- ✅ Добавлены новые поля:
  - Статус кампании
  - Ожидает отправки (pending)
- ✅ Использование computed значений:
  - `deliveryRatePercent()` для отображения процента доставки
  - `failureRatePercent()` для отображения процента ошибок

### 5. Frontend - Стили

**Файл:** `apps/front/src/app/messages/components/campaigns/campaign-stats/campaign-stats.component.scss`

Добавлены стили для индикатора загрузки:
```scss
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 24px;
}
```

## Функционал

### Отображаемые метрики
1. **Отправлено** - количество отправленных сообщений (без pending)
2. **Доставлено** - количество доставленных сообщений с процентом
3. **Ошибки** - количество неудачных отправок с процентом
4. **Доставляемость** - общий процент доставляемости

### Прогресс отправки
- Визуальный прогресс-бар
- Отображение "X из Y" сообщений
- Процент выполнения

### Детали кампании
- Название кампании
- Канал доставки (SMS, EMAIL, WHATSAPP, TELEGRAM) - в uppercase
- Дата запуска
- Дата завершения
- Статус кампании (с цветовым бейджем)
  - Draft - серый
  - Scheduled - синий
  - Active/Sending - зелёный
  - Paused - жёлтый
  - Completed - зелёный
  - Failed - красный
  - Cancelled - серый
- Количество ожидающих отправки
- Описание кампании (если есть)
- Название шаблона (если есть)
- Название сегмента (если есть)

### Графики (TODO)
- График отправок по времени (placeholder)
- Круговая диаграмма распределения статусов (placeholder)

## Состояния UI

1. **Загрузка** - отображается спиннер с текстом "Загрузка статистики..."
2. **Данные загружены** - отображается полная статистика
3. **Ошибка** - логируется в консоль (TODO: добавить UI для отображения ошибок)

## Маршрутизация

Маршрут настроен в `apps/front/src/app/messages/messages.routes.ts`:
```typescript
{
  path: 'campaigns/:id/stats',
  loadComponent: () =>
    import('./components/campaigns/campaign-stats/campaign-stats.component').then(
      (m) => m.CampaignStatsComponent
    ),
}
```

## Следующие шаги (TODO)

1. ✅ Реализовать экспорт статистики (кнопка уже есть, нужен функционал)
2. ✅ Добавить реальные графики (Chart.js или ngx-charts)
3. ✅ Добавить обработку ошибок с отображением в UI
4. ✅ Добавить автообновление статистики для активных кампаний
5. ✅ Добавить детальную таблицу сообщений
6. ✅ Добавить фильтрацию по статусам
7. ✅ Добавить экспорт в CSV/Excel

## Тестирование

Для тестирования:
1. Запустите бэкенд: `npm run start:back`
2. Запустите фронтенд: `npm run start:front`
3. Перейдите по URL: http://localhost:4200/messages/campaigns/{campaign-id}/stats
4. Проверьте, что:
   - Отображается индикатор загрузки
   - После загрузки отображается статистика
   - Все метрики корректно рассчитываются
   - Прогресс-бар работает
   - Детали кампании отображаются правильно

## Примечания

- Все данные загружаются динамически с бэкенда
- Компонент использует signals для реактивности
- Поддержка всех каналов доставки (SMS, EMAIL, WHATSAPP, TELEGRAM)
- Responsive дизайн с grid layout
- Анимации при hover на карточках статистики
