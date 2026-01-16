# План разработки отчетов по звонкам

## Анализ текущих таблиц

### Основные источники данных:
1. **call_logs** - основные логи звонков с метаданными
2. **cdr** - детальные записи звонков от Asterisk (CDR)
3. **call_summaries** - агрегированная информация о звонках
4. **queue_log** - логи работы очередей Asterisk
5. **ivr_logs** - логи взаимодействия с IVR
6. **queues** - конфигурация очередей

### Связи с бизнес-сущностями:
- call_summaries.leadId → leads
- call_summaries.dealId → deals
- call_summaries.contactId → contacts
- call_logs.createdBy → users

---

## Приоритетная разработка отчетов

### Этап 1: Базовые отчеты операторов (MVP)
**Цель:** Дать менеджерам базовую аналитику по операторам

#### 1.1 Отчет "Производительность операторов"
**Таблица:** call_summaries
**Метрики:**
- Количество звонков по агенту (agent)
- Среднее время разговора (talkTime)
- Среднее время ожидания (waitTime)
- Количество отвеченных/пропущенных (status)
- Фильтры: период, направление (direction), очередь

**API Endpoint:** `GET /api/analytics/calls/agent-performance`
**Компонент:** `apps/front/src/app/analytics/reports/agent-performance/`

#### 1.2 Отчет "Общая статистика звонков"
**Таблица:** call_summaries, cdr
**Метрики:**
- Всего звонков (по направлениям: inbound/outbound/internal)
- Распределение по статусам (ANSWERED, NO ANSWER, ABANDON)
- Средняя длительность разговора
- График звонков по времени (почасово/дни)
- Фильтры: период, очередь, агент, направление

**API Endpoint:** `GET /api/analytics/calls/overview`
**Компонент:** `apps/front/src/app/analytics/reports/calls-overview/`

---

### Этап 2: Отчеты по качеству (SLA) ✅
**Цель:** Контроль качества обслуживания

#### 2.1 Отчет "SLA метрики" ✅
**Таблица:** call_summaries
**Метрики:**
- % звонков с нарушением SLA (slaViolated)
- Среднее время до первого ответа (firstResponseTime)
- % брошенных звонков (status='ABANDON')
- Среднее время ожидания в очереди
- Тренд по дням/неделям

**API Endpoint:** `GET /api/analytics/calls/sla` ✅
**Компонент:** `apps/front/src/app/analytics/reports/sla-metrics/` ✅

#### 2.2 Отчет "Анализ брошенных звонков" ✅
**Таблица:** call_summaries, queue_log
**Метрики:**
- Брошенные звонки по очередям
- Время доброса (abandonTime)
- Динамика по периодам
- Причины (время ожидания превысило лимит)

**API Endpoint:** `GET /api/analytics/calls/abandoned` ✅
**Компонент:** `apps/front/src/app/analytics/reports/abandoned-calls/` ✅

---

### Этап 3: Отчеты по очередям и IVR
**Цель:** Оптимизация маршрутизации звонков

#### 3.1 Отчет "Эффективность очередей" ✅
**Таблица:** call_summaries, queue_log, queues
**Метрики:**
- Звонки по очередям
- Среднее время ожидания в каждой очереди
- % брошенных по очередям
- Количество агентов в очереди
- События очереди (ENTERQUEUE, CONNECT, etc.)

**API Endpoint:** `GET /api/analytics/calls/queue-performance` ✅
**Компонент:** `apps/front/src/app/analytics/reports/queue-performance/` ✅

#### 3.2 Отчет "Анализ IVR" ✅
**Таблица:** ivr_logs, call_summaries
**Метрики:**
- Популярные пути в IVR (ivrPath)
- Узлы с максимальным временем
- DTMF выборы пользователей
- Точки выхода из IVR
- Воронка IVR (где клиенты бросают)

**API Endpoint:** `GET /api/analytics/calls/ivr-analysis` ✅
**Компонент:** `apps/front/src/app/analytics/reports/ivr-analysis/` ✅

---

### Этап 4: Бизнес-отчеты (ROI)
**Цель:** Связать звонки с бизнес-результатами

#### 4.1 Отчет "Конверсия звонков" ✅
**Таблица:** call_summaries + leads + deals
**Метрики:**
- Звонки → Лиды (конверсия %)
- Звонки → Сделки (конверсия %)
- Средний чек сделок после звонка
- ROI звонков
- Эффективность по агентам

**API Endpoint:** `GET /api/analytics/calls/conversion` ✅
**Компонент:** `apps/front/src/app/analytics/reports/call-conversion/` ✅

#### 4.2 Отчет "История взаимодействий"
**Таблица:** call_summaries + contacts + leads + deals
**Метрики:**
- Все звонки по контакту/лиду/сделке
- Хронология взаимодействий
- Записи разговоров (recordingUrl)
- Заметки операторов

**API Endpoint:** `GET /api/analytics/calls/interaction-history`
**Компонент:** `apps/front/src/app/analytics/reports/interaction-history/`

---

## Техническая архитектура

### Backend структура:

```
apps/back/src/app/modules/
  analytics/
    analytics.module.ts
    controllers/
      calls-analytics.controller.ts
    services/
      agent-performance.service.ts
      calls-overview.service.ts
      sla-metrics.service.ts
      queue-performance.service.ts
      ivr-analysis.service.ts
      conversion.service.ts
    dto/
      calls-analytics.dto.ts
      date-range.dto.ts
      filters.dto.ts
```

### Frontend структура:

```
apps/front/src/app/
  analytics/
    analytics.routes.ts
    pages/
      analytics-dashboard/
    reports/
      agent-performance/
        agent-performance.component.ts
        agent-performance.component.html
        agent-performance.component.scss
      calls-overview/
      sla-metrics/
      queue-performance/
      ivr-analysis/
      call-conversion/
    shared/
      components/
        date-range-picker/
        report-filters/
        chart-wrapper/
        export-button/
      services/
        analytics-api.service.ts
      models/
        analytics.models.ts
```

---

## DTO и типы данных

### Общие DTO:

```typescript
// Date range filter
interface DateRangeDto {
  startDate: Date;
  endDate: Date;
  timezone?: string;
}

// Common filters
interface CallFiltersDto extends DateRangeDto {
  agents?: string[];
  queues?: string[];
  directions?: ('inbound' | 'outbound' | 'internal')[];
  statuses?: string[];
  minDuration?: number;
  maxDuration?: number;
}

// Agent performance response
interface AgentPerformanceDto {
  agent: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgTalkTime: number;
  avgWaitTime: number;
  totalTalkTime: number;
  conversionRate?: number;
}

// Calls overview response
interface CallsOverviewDto {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  internalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  abandonedCalls: number;
  avgDuration: number;
  avgWaitTime: number;
  callsByHour: { hour: number; count: number }[];
  callsByDay: { date: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
}

// SLA metrics response
interface SlaMetricsDto {
  totalCalls: number;
  slaCompliantCalls: number;
  slaViolatedCalls: number;
  slaComplianceRate: number;
  avgFirstResponseTime: number;
  abandonedCallsCount: number;
  abandonRate: number;
  avgAbandonTime: number;
  trend: { date: string; complianceRate: number }[];
}
```

---

## План реализации (пошаговый)

### Шаг 1: Подготовка модуля Analytics (Backend) ✅
- [x] Создать модуль `analytics` в backend
- [x] Создать базовые DTO для фильтров
- [x] Настроить Swagger документацию
- [x] Добавить проверки прав доступа (только admin/manager)

### Шаг 2: API "Производительность операторов" ✅
- [x] Создать service с запросом к call_summaries
- [x] Группировка по agent
- [x] Агрегация метрик (count, avg, sum)
- [x] Создать controller endpoint
- [ ] Добавить тесты

### Шаг 3: API "Общая статистика звонков" ✅
- [x] Создать service с запросом к call_summaries + cdr
- [x] Группировка по направлениям, статусам
- [x] Временные группировки (по часам/дням)
- [x] Создать controller endpoint
- [ ] Добавить тесты

### Шаг 4: Frontend - структура модуля Analytics ✅
- [x] Создать модуль analytics с роутингом
- [x] Создать главный компонент дашборда
- [x] Создать сервис для API запросов
- [x] Создать shared компоненты (фильтры, графики)

### Шаг 5: Frontend - отчет "Производительность операторов" ✅
- [x] Создать компонент с таблицей агентов
- [x] Добавить фильтры (даты, очереди)
- [x] Визуализация (графики Chart.js/Apache ECharts)
- [x] Экспорт в Excel/CSV

### Шаг 6: Frontend - отчет "Общая статистика" ✅
- [x] Создать компонент с KPI-карточками
- [x] Графики распределения звонков
- [x] Временные графики (линейные)
- [x] Pie charts для статусов

### Шаг 7-12: Остальные отчеты
- Повторить паттерн для каждого отчета

---

## Используемые библиотеки

### Backend:
- TypeORM для запросов
- class-validator для DTO
- @nestjs/swagger для документации
- date-fns для работы с датами

### Frontend:
- Angular Material для UI
- Apache ECharts для графиков (уже используется в проекте)
- date-fns для работы с датами
- RxJS для асинхронности
- ExcelJS для экспорта

---

## Приоритет на первую итерацию:

1. **Производительность операторов** (самый востребованный)
2. **Общая статистика звонков** (быстрый overview)

Начинаем?
