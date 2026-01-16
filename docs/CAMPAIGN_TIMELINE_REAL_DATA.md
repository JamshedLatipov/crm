# Реализация реальных данных для графика отправок по времени

## Дата: 07.01.2026

## Задача
Заменить моковые данные в графике "График отправок по времени" на реальные данные с бэкенда.

## Реализация

### 1. Backend - Новый эндпоинт

#### Контроллер: `sms-campaign.controller.ts`

Добавлен новый эндпоинт:
```typescript
@Get(':id/stats/timeline')
@ApiOperation({ summary: 'Получить временную статистику кампании' })
@ApiResponse({ status: 200, description: 'Статистика кампании по времени' })
async getTimeline(
  @Param('id') id: string,
  @Query('interval') interval: 'hour' | 'day' = 'hour',
  @Query('hours') hours: string = '24'
) {
  return this.campaignService.getCampaignTimeline(id, interval, parseInt(hours));
}
```

**URL:** `GET /api/messages/campaigns/:id/stats/timeline?interval=hour&hours=24`

#### Параметры:
- `id` - ID кампании (в URL)
- `interval` - Интервал группировки: `hour` или `day` (по умолчанию `hour`)
- `hours` - Количество часов истории (по умолчанию `24`)

#### Ответ:
```json
{
  "timeline": [
    {
      "timestamp": "2026-01-07 10:00:00",
      "sent": 10,
      "delivered": 9,
      "failed": 1
    },
    {
      "timestamp": "2026-01-07 11:00:00",
      "sent": 15,
      "delivered": 14,
      "failed": 1
    }
  ]
}
```

### 2. Backend - Сервис

#### Файл: `message-campaign.service.ts`

Добавлен метод `getCampaignTimeline`:

```typescript
async getCampaignTimeline(
  campaignId: string,
  interval: 'hour' | 'day' = 'hour',
  hours: number = 24
): Promise<{
  timeline: Array<{
    timestamp: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}>
```

#### Логика работы:

1. **Получение кампании:**
   ```typescript
   const campaign = await this.findOne(campaignId);
   const messageRepository = this.getMessageRepository(campaign.channel);
   ```

2. **Определение временного диапазона:**
   ```typescript
   const endDate = new Date();
   const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);
   ```

3. **Формат группировки (PostgreSQL):**
   ```typescript
   // По часам: "2026-01-07 10:00:00"
   dateFormat = "TO_CHAR(message.createdAt, 'YYYY-MM-DD HH24:00:00')";
   
   // По дням: "2026-01-07"
   dateFormat = "TO_CHAR(message.createdAt, 'YYYY-MM-DD')";
   ```

4. **SQL запрос:**
   ```typescript
   const timelineData = await messageRepository
     .createQueryBuilder('message')
     .select(`${dateFormat} as timestamp`)
     .addSelect('message.status', 'status')
     .addSelect('COUNT(*)', 'count')
     .where('message.campaignId = :campaignId', { campaignId })
     .andWhere('message.createdAt >= :startDate', { startDate })
     .andWhere('message.createdAt <= :endDate', { endDate })
     .groupBy(`${dateFormat}`)
     .addGroupBy('message.status')
     .orderBy(`${dateFormat}`, 'ASC')
     .getRawMany();
   ```

5. **Инициализация временных меток:**
   - Создаем все временные метки с нулевыми значениями
   - Заполняем реальными данными из БД

6. **Подсчёт статистики:**
   ```typescript
   if (status === 'delivered') {
     data.delivered = count;
     data.sent += count;
   } else if (status === 'failed') {
     data.failed = count;
     data.sent += count;
   } else if (status === 'sent') {
     data.sent += count;
   }
   ```

### 3. Frontend - Сервис

#### Файл: `notification.service.ts`

Добавлен метод:
```typescript
getCampaignTimeline(
  campaignId: string, 
  interval: 'hour' | 'day' = 'hour', 
  hours: number = 24
): Observable<{
  timeline: Array<{
    timestamp: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}>
```

### 4. Frontend - Компонент

#### Файл: `campaign-stats.component.ts`

#### Изменения:

1. **Загрузка timeline данных:**
   ```typescript
   private loadCampaignStats(campaignId: string): void {
     // ... загрузка основной статистики
     
     // Загружаем данные для линейного графика
     this.loadTimelineData(campaignId);
   }
   ```

2. **Новый метод loadTimelineData:**
   ```typescript
   private loadTimelineData(campaignId: string): void {
     this.notificationService.getCampaignTimeline(campaignId, 'hour', 24).subscribe({
       next: (data) => {
         console.log('Timeline data loaded:', data);
         this.updateLineChart(data.timeline);
       },
       error: (error) => {
         console.error('Error loading timeline data:', error);
         this.updateLineChart([]); // Пустой график при ошибке
       }
     });
   }
   ```

3. **Обновлённый updateLineChart:**
   ```typescript
   private updateLineChart(
     timeline: Array<{ 
       timestamp: string; 
       sent: number; 
       delivered: number; 
       failed: number 
     }>
   ): void {
     // Форматируем метки времени
     const labels = timeline.map(point => {
       const date = new Date(point.timestamp);
       return date.toLocaleTimeString('ru-RU', { 
         hour: '2-digit', 
         minute: '2-digit' 
       });
     });

     const sentData = timeline.map(point => point.sent);
     const deliveredData = timeline.map(point => point.delivered);
     const failedData = timeline.map(point => point.failed);

     this.lineChartData.set({ labels, datasets: [...] });
   }
   ```

## Примеры данных

### Запрос:
```bash
GET /api/messages/campaigns/22268068-e650-4b3d-83df-16bd8cf21575/stats/timeline?interval=hour&hours=24
```

### Ответ:
```json
{
  "timeline": [
    { "timestamp": "2026-01-07 00:00:00", "sent": 0, "delivered": 0, "failed": 0 },
    { "timestamp": "2026-01-07 01:00:00", "sent": 0, "delivered": 0, "failed": 0 },
    { "timestamp": "2026-01-07 02:00:00", "sent": 5, "delivered": 4, "failed": 1 },
    ...
  ]
}
```

### График отображает:
- **X-ось:** Время в формате "10:00", "11:00", "12:00"
- **Y-ось:** Количество сообщений
- **Линии:**
  - 🟣 Отправлено (фиолетовая)
  - 🟢 Доставлено (зелёная)
  - 🟠 Ошибки (оранжевая)

## Особенности реализации

### Backend:

1. **Поддержка разных каналов:**
   - Работает с SMS, WhatsApp, Telegram
   - Автоматически выбирает нужный репозиторий

2. **Инициализация нулями:**
   - Все временные метки инициализируются нулями
   - Даже если нет данных, график показывает весь период

3. **Гибкая группировка:**
   - По часам (hour): "YYYY-MM-DD HH24:00:00"
   - По дням (day): "YYYY-MM-DD"

4. **PostgreSQL специфика:**
   - Использует `TO_CHAR` для форматирования дат
   - Группировка через `GROUP BY`

### Frontend:

1. **Обработка ошибок:**
   - При ошибке показывает пустой график
   - Логирование в консоль

2. **Форматирование времени:**
   - Использует `toLocaleTimeString('ru-RU')`
   - Формат: "10:00", "11:00"

3. **Реактивность:**
   - Использует signals
   - Автоматическое обновление при изменении данных

## Преимущества

✅ **Реальные данные** вместо моков
✅ **Гибкий период** (можно изменить hours)
✅ **Поддержка всех каналов** (SMS, WhatsApp, Telegram, Email)
✅ **Красивая визуализация** с Chart.js
✅ **Обработка пустых данных** (график с нулями)
✅ **Правильный подсчёт** (sent = delivered + failed)

## Тестирование

### 1. Проверка эндпоинта:
```bash
curl -s 'http://localhost:3000/api/messages/campaigns/22268068-e650-4b3d-83df-16bd8cf21575/stats/timeline?interval=hour&hours=24' | jq '.'
```

### 2. Проверка в браузере:
Откройте: http://localhost:4200/messages/campaigns/22268068-e650-4b3d-83df-16bd8cf21575/stats

Ожидаемый результат:
- ✅ График показывает реальные данные из БД
- ✅ Линии соответствуют статусам сообщений
- ✅ X-ось показывает последние 24 часа
- ✅ Hover показывает точные значения

## Будущие улучшения

1. **Фильтры периода:**
   - Dropdown: 24 часа / 7 дней / 30 дней
   - Date range picker

2. **Кэширование:**
   - Redis для часто запрашиваемых данных
   - TTL: 5 минут

3. **Реальное время:**
   - WebSocket обновления
   - Автообновление каждые 30 секунд

4. **Оптимизация:**
   - Материализованные представления (materialized views)
   - Индексы на createdAt + campaignId

5. **Экспорт:**
   - CSV/Excel с временными данными
   - PNG графика
