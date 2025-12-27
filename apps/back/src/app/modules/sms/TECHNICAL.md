# SMS Center - Техническая документация

## Обзор архитектуры

SMS-центр построен на основе модульной архитектуры NestJS с использованием TypeORM для работы с базой данных PostgreSQL.

## Компоненты системы

### 1. Entities (Сущности)

#### SmsTemplate
- **Назначение**: Хранение шаблонов СМС-сообщений
- **Ключевые поля**:
  - `content` - текст с переменными в формате `{{variable}}`
  - `variables` - массив названий переменных
  - `category` - категория (marketing, transactional, etc.)
  - `usageCount`, `deliveryRate`, `responseRate` - статистика

#### SmsSegment
- **Назначение**: Сегментация контактов по динамическим фильтрам
- **Ключевые поля**:
  - `filters` - JSONB массив условий фильтрации
  - `filterLogic` - AND/OR логика объединения
  - `isDynamic` - автоматический пересчёт
  - `contactsCount` - кэшированное количество

#### SmsCampaign
- **Назначение**: Управление рассылками
- **Типы**:
  - `immediate` - мгновенная отправка
  - `scheduled` - по расписанию
  - `triggered` - по событиям
  - `recurring` - периодические
- **Статусы**: draft → scheduled → sending → completed/paused/cancelled
- **Метрики**: totalRecipients, sentCount, deliveredCount, failedCount, totalCost

#### SmsMessage
- **Назначение**: Хранение отдельных сообщений
- **Ключевые поля**:
  - `status` - pending → queued → sent → delivered/failed
  - `metadata` - JSONB с информацией от провайдера
  - `cost` - стоимость отправки
  - `segmentsCount` - количество SMS-сегментов

#### SmsAnalytics
- **Назначение**: Агрегированная аналитика
- **Метрики**: sent, delivered, failed, cost, response_rate
- **Группировка**: по дням, кампаниям, пользователям

### 2. Services (Сервисы)

#### SmsProviderService
**Интеграция с SMS-провайдерами**

```typescript
// Поддерживаемые провайдеры
- SMS.RU (https://sms.ru)
- SMSC.RU (https://smsc.ru)
- Twilio (https://twilio.com)

// Методы
sendSms(phoneNumber, message): Promise<SendSmsResult>
getMessageStatus(providerId): Promise<{status, deliveredAt}>
checkBalance(): Promise<{balance, currency}>
validatePhoneNumber(phoneNumber): boolean
calculateSegments(message): number
```

**Особенности**:
- Автоматический подсчёт стоимости
- Определение количества SMS-сегментов (160/70 символов)
- Обработка ошибок с детальными кодами

#### SmsTemplateService
**Управление шаблонами**

```typescript
// Ключевые методы
create(dto, user): Promise<SmsTemplate>
renderTemplate(template, variables): string
extractVariables(content): string[]
validateTemplate(templateId, variables): Promise<ValidationResult>
duplicate(id, user): Promise<SmsTemplate>
getPopular(limit): Promise<SmsTemplate[]>
```

**Особенности**:
- Автоматическое извлечение переменных из текста
- Валидация перед отправкой
- Подсчёт статистики использования

#### SmsSegmentService
**Сегментация контактов**

```typescript
// Операторы фильтрации
- equals, not_equals
- contains, not_contains
- greater, less
- between
- in, not_in

// Методы
create(dto, user): Promise<SmsSegment>
getSegmentContacts(segmentId, options): Promise<{contacts, total}>
getSegmentPhoneNumbers(segmentId): Promise<PhoneNumber[]>
recalculateSegment(segmentId): Promise<number>
previewSegment(filters, logic, limit): Promise<Preview>
```

**Особенности**:
- Построение динамических SQL-запросов
- Кэширование результатов
- Поддержка сложных фильтров с AND/OR

#### SmsCampaignService
**Управление кампаниями**

```typescript
// Жизненный цикл кампании
create() → prepareCampaignMessages() → startCampaign() → 
  processCampaignMessages() → checkCampaignCompletion()

// Управление
startCampaign(id): Promise<SmsCampaign>
pauseCampaign(id): Promise<SmsCampaign>
resumeCampaign(id): Promise<SmsCampaign>
cancelCampaign(id): Promise<SmsCampaign>

// Cron-задачи
@Cron(EVERY_MINUTE) processScheduledCampaigns()
```

**Особенности**:
- Контроль скорости отправки (throttling)
- Автоматические повторы при ошибках
- Асинхронная обработка с возможностью паузы
- Автозапуск по расписанию

#### SmsAnalyticsService
**Аналитика и отчёты**

```typescript
// Дашборд
getDashboardStats(dateRange): Promise<DashboardStats>

// Детальная аналитика
getCampaignPerformance(dateRange): Promise<CampaignPerformance[]>
getMessageStatsByDay(dateRange): Promise<DailyStats[]>
getMessageStatsByHour(dateRange): Promise<HourlyStats[]>
getTopFailedNumbers(limit): Promise<FailedNumber[]>

// Сравнение и экспорт
compareCampaigns(campaignIds): Promise<Comparison[]>
exportCampaignReport(campaignId): Promise<Report>
```

### 3. Controllers (REST API)

#### SmsTemplateController
- `POST /sms/templates` - создание
- `GET /sms/templates` - список с фильтрацией
- `GET /sms/templates/popular` - популярные
- `PUT /sms/templates/:id` - обновление
- `DELETE /sms/templates/:id` - удаление
- `POST /sms/templates/:id/duplicate` - дублирование
- `POST /sms/templates/:id/validate` - валидация
- `POST /sms/templates/test` - тестовая отправка

#### SmsCampaignController
- Полный CRUD для кампаний
- `POST /sms/campaigns/:id/start|pause|resume|cancel` - управление
- `GET /sms/campaigns/:id/stats` - статистика

#### SmsSegmentController
- Полный CRUD для сегментов
- `GET /sms/segments/:id/contacts` - контакты сегмента
- `GET /sms/segments/:id/phone-numbers` - номера телефонов
- `POST /sms/segments/:id/recalculate` - пересчёт
- `POST /sms/segments/preview` - предпросмотр

#### SmsAnalyticsController
- Множество эндпоинтов для различных срезов аналитики
- Поддержка фильтрации по датам
- Экспорт в различных форматах

### 4. Migrations (Миграции БД)

**Порядок выполнения**:
1. `1703700000001-CreateSmsTemplatesTable.ts`
2. `1703700000002-CreateSmsSegmentsTable.ts`
3. `1703700000003-CreateSmsCampaignsTable.ts`
4. `1703700000004-CreateSmsMessagesTable.ts`
5. `1703700000005-CreateSmsAnalyticsTable.ts`

**Индексы** созданы для оптимизации:
- Поиск по статусам
- Фильтрация по датам
- Связи Foreign Keys
- JSONB фильтры для сегментов

## Процесс отправки СМС

```
1. Создание кампании
   ↓
2. Выбор шаблона и сегмента
   ↓
3. prepareCampaignMessages()
   - Получение контактов из сегмента
   - Рендеринг шаблона для каждого
   - Создание записей SmsMessage со статусом PENDING
   ↓
4. startCampaign()
   - Изменение статуса на SENDING
   - Запуск processCampaignMessages()
   ↓
5. processCampaignMessages() [Async Loop]
   - Получение PENDING сообщений (батчами по 100)
   - Для каждого:
     * Изменение статуса на QUEUED
     * Вызов providerService.sendSms()
     * Обновление статуса (SENT/FAILED)
     * Обновление счётчиков кампании
     * Задержка согласно sendingSpeed
   - Проверка статуса кампании (паузa/отмена)
   ↓
6. checkCampaignCompletion()
   - Если pendingCount === 0
   - Изменение статуса на COMPLETED
```

## Конфигурация

### Environment Variables

```bash
# Основные
SMS_PROVIDER=smsru|smsc|twilio
SMS_API_KEY=your_key
SMS_SENDER=YourCompany

# SMS.RU
SMS_API_URL=https://sms.ru/sms/send

# SMSC.RU
SMSC_LOGIN=login
SMSC_PASSWORD=password

# Twilio
TWILIO_ACCOUNT_SID=sid
TWILIO_AUTH_TOKEN=token
TWILIO_PHONE_NUMBER=+1234567890
```

### Module Configuration

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmsTemplate, SmsCampaign, SmsMessage,
      SmsSegment, SmsAnalytics, Contact, Lead
    ]),
    ConfigModule,
    ScheduleModule.forRoot(), // Для Cron-задач
  ],
  // ...
})
export class SmsModule {}
```

## Оптимизация и производительность

### Индексы БД
- Составные индексы для частых запросов
- Индексы на JSONB полях
- Индексы на временные метки

### Батчинг
- Обработка сообщений блоками по 100
- Пагинация при получении контактов сегментов

### Кэширование
- Количество контактов в сегментах
- Статистика шаблонов

### Throttling
- Контролируемая скорость отправки (сообщений/минуту)
- Настраивается для каждой кампании

## Безопасность

### Валидация
- class-validator для всех DTO
- Валидация номеров телефонов
- Проверка переменных шаблонов

### Авторизация
- JWT через @ApiBearerAuth()
- Guards на всех эндпоинтах
- Привязка к пользователю (createdBy)

### Санитизация
- Очистка номеров телефонов
- Экранирование в SQL-запросах через QueryBuilder

## Мониторинг

### Метрики
- Общее количество отправленных/доставленных
- Процент доставки (delivery rate)
- Стоимость рассылок
- Топ неудачных номеров

### Логирование
- Logger в каждом сервисе
- Детальные ошибки с stack trace
- INFO/ERROR уровни

### Alerts
- Низкий процент доставки
- Превышение бюджета
- Ошибки провайдера

## Расширяемость

### Добавление нового провайдера

```typescript
// В sms-provider.service.ts
private async sendViaNewProvider(
  phoneNumber: string,
  message: string
): Promise<SendSmsResult> {
  // Реализация интеграции
}

// В методе sendSms()
switch (this.config.provider) {
  case 'newprovider':
    return await this.sendViaNewProvider(phoneNumber, message);
  // ...
}
```

### Новые типы сегментов

```typescript
// В sms-segment.service.ts
private buildContactQuery(filters, logic) {
  // Добавить новые операторы в switch
  case 'new_operator':
    condition = `...`;
    break;
}
```

### Дополнительные каналы

```typescript
// Можно расширить на WhatsApp, Telegram, etc.
// Создать аналогичные модули с общими интерфейсами
```

## Тестирование

### Unit-тесты
```bash
npm run test apps/back/src/app/modules/sms
```

### E2E-тесты
```bash
npm run test:e2e -- --grep "SMS"
```

### Тестовая отправка
```typescript
POST /sms/templates/test
{
  "templateId": "uuid",
  "phoneNumber": "+79991234567",
  "variables": {}
}
```

## Troubleshooting

### Проблема: Сообщения зависают в PENDING

**Причины**:
1. Кампания не запущена (статус DRAFT)
2. Ошибка в processCampaignMessages()
3. Недостаточно прав

**Решение**:
```typescript
// Проверить статус
GET /sms/campaigns/:id

// Запустить вручную
POST /sms/campaigns/:id/start

// Проверить логи
docker logs crm-back | grep SMS
```

### Проблема: Низкая скорость отправки

**Причины**:
1. Низкое значение sendingSpeed
2. Ограничения провайдера

**Решение**:
```typescript
// Увеличить скорость
PUT /sms/campaigns/:id
{
  "settings": {
    "sendingSpeed": 200 // было 60
  }
}
```

### Проблема: Ошибки провайдера

**Решение**:
```typescript
// Проверить баланс
const balance = await smsProvider.checkBalance();

// Проверить настройки
console.log(process.env.SMS_API_KEY);

// Топ ошибок
GET /sms/analytics/failed/top?limit=10
```

## Производственное развёртывание

### Checklist
- [ ] Настроены переменные окружения
- [ ] Выполнены миграции БД
- [ ] Проверен баланс провайдера
- [ ] Протестирована отправка на реальный номер
- [ ] Настроен мониторинг и алерты
- [ ] Включено логирование
- [ ] Проверены лимиты провайдера

### Рекомендации
- Начните с небольших тестовых кампаний
- Мониторьте процент доставки
- Регулярно проверяйте баланс
- Анализируйте статистику по часам для оптимального времени отправки
- Используйте динамические сегменты для актуальности данных

## Метрики успеха

- **Delivery Rate** > 95%
- **Response Rate** > 5% (для маркетинговых)
- **Cost per Message** < 2 руб.
- **Campaign Completion Time** < целевого времени
- **Failed Messages** < 5%

## Заключение

SMS-центр предоставляет полный набор инструментов для профессиональных массовых рассылок с гибкой настройкой, детальной аналитикой и поддержкой множества провайдеров.
