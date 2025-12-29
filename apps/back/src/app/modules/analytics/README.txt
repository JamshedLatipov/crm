# Модуль аналитики звонков

Модуль для создания отчетов и аналитики по звонкам в CRM системе.

## Структура

### Backend (`apps/back/src/app/modules/analytics/`)

- **controllers/** - REST API контроллеры
  - `calls-analytics.controller.ts` - Эндпоинты для аналитики звонков
  
- **services/** - Бизнес-логика
  - `agent-performance.service.ts` - Производительность операторов
  - `calls-overview.service.ts` - Общая статистика звонков
  
- **dto/** - Data Transfer Objects
  - `date-range.dto.ts` - Фильтр по датам
  - `call-filters.dto.ts` - Фильтры для звонков
  - `agent-performance.dto.ts` - Модель данных производительности
  - `calls-overview.dto.ts` - Модель общей статистики

### Frontend (`apps/front/src/app/analytics/`)

- **pages/** - Страницы
  - `analytics-dashboard/` - Главная страница с табами
  
- **reports/** - Компоненты отчетов
  - `agent-performance/` - Отчет по операторам
  - `calls-overview/` - Общая статистика звонков
  
- **shared/components/** - Общие компоненты
  - `report-filters/` - Компонент фильтров
  
- **services/** - Сервисы
  - `analytics-api.service.ts` - API клиент
  
- **models/** - TypeScript модели
  - `analytics.models.ts` - Интерфейсы данных

## Реализованные отчеты

### 1. Производительность операторов
**URL:** `/analytics` (вкладка "Производительность операторов")
**API:** `GET /api/analytics/calls/agent-performance`

**Метрики:**
- Всего звонков по оператору
- Количество отвеченных звонков
- Количество пропущенных звонков
- Среднее время разговора
- Среднее время ожидания
- Общее время в разговоре

**Фильтры:**
- Период (даты начала/окончания)
- Направления звонков (входящие/исходящие/внутренние)
- Статусы звонков
- Минимальная/максимальная длительность

**Функции:**
- Экспорт в CSV
- Сортировка по колонкам
- Форматирование времени

### 2. Общая статистика звонков
**URL:** `/analytics` (вкладка "Общая статистика")
**API:** `GET /api/analytics/calls/overview`

**KPI карточки:**
- Всего звонков
- Отвечено (с процентом)
- Пропущено
- Брошено
- Средняя длительность
- Среднее время ожидания

**Графики:**
- Pie chart: Распределение по направлениям (входящие/исходящие/внутренние)
- Pie chart: Распределение по статусам
- Line chart: Динамика звонков по дням
- Bar chart: Почасовое распределение (0-23 часа)

**Фильтры:** (те же что и для операторов)

## Использование

### Навигация
Откройте меню "Аналитика" → "Аналитика звонков"

### Фильтрация данных
1. Выберите период (по умолчанию последние 30 дней)
2. Выберите направления звонков (опционально)
3. Выберите статусы (опционально)
4. Нажмите "Применить"

### Экспорт данных
Для отчета по операторам доступен экспорт в CSV через кнопку "Экспорт CSV"

## Технический стек

### Backend
- NestJS
- TypeORM для запросов к БД
- PostgreSQL (таблица `call_summaries`)
- Swagger для документации API

### Frontend
- Angular 20 (standalone components)
- Angular Material для UI
- ng2-charts (Chart.js) для графиков
- RxJS для реактивности
- Signals для управления состоянием

## Источники данных

Основная таблица: `call_summaries`

**Доступные поля:**
- `uniqueId` - уникальный ID звонка
- `startedAt`, `endedAt`, `answeredAt` - временные метки
- `duration`, `talkTime`, `waitTime` - длительности
- `caller`, `destination` - номера
- `status` - статус (ANSWERED, NO ANSWER, ABANDON, etc.)
- `queue` - очередь
- `agent` - оператор
- `direction` - направление (inbound/outbound/internal)
- `leadId`, `dealId`, `contactId` - связи с CRM

## Разработка

### Добавление нового отчета

1. **Backend:**
```typescript
// services/new-report.service.ts
@Injectable()
export class NewReportService {
  async getReport(filters: CallFiltersDto): Promise<ReportDto> {
    // Implement query logic
  }
}

// controllers/calls-analytics.controller.ts
@Get('new-report')
async getNewReport(@Query() filters: CallFiltersDto) {
  return this.newReportService.getReport(filters);
}
```

2. **Frontend:**
```typescript
// reports/new-report/new-report.component.ts
@Component({
  selector: 'app-new-report',
  standalone: true,
  // ...
})
export class NewReportComponent { }
```

3. Добавить в дашборд:
```typescript
// pages/analytics-dashboard/analytics-dashboard.component.ts
<mat-tab>
  <ng-template mat-tab-label>
    <mat-icon>icon_name</mat-icon>
    <span>New Report</span>
  </ng-template>
  <app-new-report></app-new-report>
</mat-tab>
```

## Roadmap

Планируемые отчеты (см. CALL_REPORTS_PLAN.txt):

- SLA метрики
- Анализ брошенных звонков
- Эффективность очередей
- Анализ IVR путей
- Конверсия звонков в лиды/сделки
- История взаимодействий

## API Endpoints

### GET /api/analytics/calls/agent-performance
Производительность операторов

**Query параметры:** CallFiltersDto
**Response:** AgentPerformanceResponseDto

**Пример:**
```
GET /api/analytics/calls/agent-performance?startDate=2024-01-01&endDate=2024-01-31
```

### GET /api/analytics/calls/overview
Общая статистика звонков

**Query параметры:** CallFiltersDto
**Response:** CallsOverviewDto

**Пример:**
```
GET /api/analytics/calls/overview?directions=inbound&directions=outbound
```

## Права доступа

Все эндпоинты требуют аутентификацию и роли:
- `admin`
- `manager`

## Тестирование

### Backend
```bash
npm run test:back
```

### Frontend
```bash
npm run test:front
```

## Контакты

При возникновении вопросов или проблем обращайтесь к команде разработки.
