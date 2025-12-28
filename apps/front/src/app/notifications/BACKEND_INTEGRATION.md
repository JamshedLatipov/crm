# Интеграция с бэкендом - Notifications Module

## Обзор

Все компоненты модуля notifications интегрированы с бэкендом через сервисы:
- **CampaignService** - управление кампаниями
- **SmsTemplateService** - управление SMS шаблонами
- **EmailTemplateService** - управление Email шаблонами

## Реализованные функции

### 1. Campaign Management

#### campaign-list.component.ts
- ✅ Загрузка списка кампаний из API
- ✅ Запуск/приостановка кампаний
- ✅ Удаление кампаний
- ✅ Отображение статуса и прогресса
- ✅ Реактивное состояние через signals

**API endpoints:**
- `GET /api/sms/campaigns` - получить список кампаний
- `POST /api/sms/campaigns/:id/start` - запустить кампанию
- `POST /api/sms/campaigns/:id/pause` - приостановить кампанию
- `DELETE /api/sms/campaigns/:id` - удалить кампанию

#### campaign-form.component.ts
- ✅ Создание новой кампании
- ✅ Редактирование существующей кампании
- ✅ Загрузка данных при редактировании
- ✅ Валидация формы
- ✅ Loading states

**API endpoints:**
- `GET /api/sms/campaigns/:id` - получить кампанию по ID
- `POST /api/sms/campaigns` - создать кампанию
- `PATCH /api/sms/campaigns/:id` - обновить кампанию

### 2. SMS Template Management

#### sms-template-list.component.ts
- ✅ Загрузка списка шаблонов из API
- ✅ Удаление шаблонов
- ✅ Отображение переменных и статуса
- ✅ Реактивное состояние через signals

**API endpoints:**
- `GET /api/sms/templates` - получить список шаблонов (с пагинацией)
- `DELETE /api/sms/templates/:id` - удалить шаблон

#### sms-template-form.component.ts
- ✅ Создание нового шаблона
- ✅ Редактирование существующего шаблона
- ✅ Автоматическое обнаружение переменных
- ✅ Подсчет символов
- ✅ Валидация контента
- ✅ Loading states

**API endpoints:**
- `GET /api/sms/templates/:id` - получить шаблон по ID
- `POST /api/sms/templates` - создать шаблон
- `PUT /api/sms/templates/:id` - обновить шаблон

## Архитектура

### Signals-based State Management

Все сервисы используют Angular signals для реактивного управления состоянием:

```typescript
// Пример из CampaignService
campaigns = signal<Campaign[]>([]);
isLoading = signal(false);
error = signal<string | null>(null);
```

Компоненты подписываются на эти signals:

```typescript
// В компоненте
loading = this.campaignService.isLoading;
campaigns = this.campaignService.campaigns;
```

### Error Handling

Все API вызовы обрабатывают ошибки:

```typescript
operation.subscribe({
  next: () => {
    this.snackBar.open('Успешно', 'Закрыть', { duration: 3000 });
  },
  error: (error) => {
    this.snackBar.open(
      error.error?.message || 'Ошибка операции',
      'Закрыть',
      { duration: 5000 }
    );
  }
});
```

### Loading States

Все формы и списки отображают loading состояние:

```typescript
@if (loading()) {
  <div class="loading-container">
    <mat-spinner diameter="40"></mat-spinner>
  </div>
} @else {
  <!-- Контент -->
}
```

## Оставшиеся задачи

### Email Templates
- ⏳ email-template-list.component.ts - интеграция с EmailTemplateService
- ⏳ email-template-form.component.ts - создание/редактирование

### Segments
- ⏳ segment-list.component.ts - интеграция с SegmentService
- ⏳ segment-form.component.ts - создание/редактирование

### Campaign Form Improvements
- ⏳ Добавить выбор шаблона (dropdown с preview)
- ⏳ Добавить выбор сегмента (dropdown с статистикой)
- ⏳ Добавить настройки отправки (скорость, retry и т.д.)

### Analytics & Stats
- ⏳ Интеграция dashboard.component.ts с реальными метриками
- ⏳ Реализация analytics-list.component.ts
- ⏳ Добавить детальную статистику кампаний

## API Endpoints Reference

### Campaigns
```
GET    /api/sms/campaigns          - список кампаний (пагинация)
GET    /api/sms/campaigns/:id      - одна кампания
POST   /api/sms/campaigns          - создать кампанию
PATCH  /api/sms/campaigns/:id      - обновить кампанию
DELETE /api/sms/campaigns/:id      - удалить кампанию
POST   /api/sms/campaigns/:id/start - запустить
POST   /api/sms/campaigns/:id/pause - приостановить
POST   /api/sms/campaigns/:id/resume - возобновить
POST   /api/sms/campaigns/:id/cancel - отменить
GET    /api/sms/campaigns/:id/stats - статистика
```

### SMS Templates
```
GET    /api/sms/templates          - список шаблонов (пагинация)
GET    /api/sms/templates/:id      - один шаблон
POST   /api/sms/templates          - создать шаблон
PUT    /api/sms/templates/:id      - обновить шаблон
DELETE /api/sms/templates/:id      - удалить шаблон
POST   /api/sms/templates/:id/duplicate - дублировать
POST   /api/sms/templates/validate - валидация контента
POST   /api/sms/templates/test     - тестовая отправка
GET    /api/sms/templates/popular  - популярные шаблоны
```

### Email Templates
```
GET    /api/email-templates        - список шаблонов
GET    /api/email-templates/:id    - один шаблон
POST   /api/email-templates        - создать шаблон
PUT    /api/email-templates/:id    - обновить шаблон
DELETE /api/email-templates/:id    - удалить шаблон
```

## Используемые технологии

- **Angular 18+**: Standalone components, signals
- **RxJS**: Для асинхронных операций
- **Material Design**: UI компоненты
- **HttpClient**: Для API вызовов
- **MatSnackBar**: Для уведомлений
- **MatDialog**: Для модальных окон (планируется)

## Best Practices

1. **Используйте signals** для реактивного состояния
2. **Обрабатывайте ошибки** в каждом API вызове
3. **Показывайте loading states** для лучшего UX
4. **Валидируйте формы** перед отправкой
5. **Используйте TypeScript типы** из notification.models.ts
6. **Показывайте snackbar уведомления** для обратной связи

## Тестирование

Для тестирования интеграции:

1. Запустите backend: `npm run start:back`
2. Запустите frontend: `npm run start:front`
3. Откройте `/notifications/campaigns` для списка кампаний
4. Откройте `/notifications/sms-templates` для списка SMS шаблонов
5. Попробуйте создать/редактировать/удалить записи

## Troubleshooting

### Ошибка CORS
Если возникают CORS ошибки, проверьте настройки backend proxy в `proxy.conf.json`.

### 404 Not Found
Убедитесь, что backend запущен и API endpoints доступны.

### Ошибки валидации
Проверьте соответствие DTO интерфейсов frontend и backend.

### Loading бесконечный
Проверьте Network tab в DevTools для деталей ошибки запроса.
