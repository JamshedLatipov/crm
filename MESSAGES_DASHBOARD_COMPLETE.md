# Messages Dashboard - Главная страница центра сообщений

## Дата: 7 января 2026 г.

## Концепция

Dashboard - это **точка входа** в центр сообщений, ориентированная на быстрый доступ к функциям и общее представление о системе.

**Детальная аналитика** находится на отдельной странице `/messages/analytics` с графиками и подробными отчётами.

## Структура Dashboard

### 1. Быстрая сводка (Quick Stats)
Три основных показателя:
- **Всего отправлено** - общее количество сообщений
- **Доставляемость** - процент успешной доставки
- **В очереди** - сообщения ожидающие отправки

### 2. Основные функции (Main Actions)
Крупные карточки для быстрого доступа:
- **Кампании** - создание и управление рассылками
- **Шаблоны** - быстрые ссылки на SMS, Email, WhatsApp, Telegram
- **Аналитика** - переход к детальной статистике
- **Сегменты** - управление группами контактов
- **Настройки** - конфигурация каналов

### 3. Быстрый старт (Quick Start Guide)
Инструкция из 4 шагов:
1. Создайте шаблон
2. Настройте сегмент
3. Запустите кампанию
4. Отслеживайте результаты

## Что было реализовано

### Файлы:

**Компонент:**
- `apps/front/src/app/messages/components/dashboard/dashboard.component.ts`

**Шаблон:**
- `apps/front/src/app/messages/components/dashboard/dashboard.component.html`

**Стили:**
- `apps/front/src/app/messages/components/dashboard/dashboard.component.scss`

**Сервис:**
- `apps/front/src/app/messages/services/analytics.service.ts` (для получения сводки)

### Технические детали:

**Компонент (TypeScript):**
```typescript
- Минимальная логика
- Загрузка только общей статистики (total, delivered, pending, deliveryRate)
- Angular signals для состояния
- Обработка ошибок
```

**Шаблон (HTML):**
```html
- Три карточки со сводкой
- Пять action-карточек с навигацией
- Info-карточка с инструкцией из 4 шагов
- Loading state с mat-spinner
```

**Стили (SCSS):**
```scss
- Градиентные иконки для каждой карточки
- Hover эффекты с подъёмом карточки
- Адаптивный grid layout
- Цветовое кодирование по типу (campaigns, templates, analytics, etc.)
```

## Отличия от Analytics страницы

| Характеристика | Dashboard | Analytics |
|----------------|-----------|-----------|
| **Цель** | Быстрый старт и навигация | Детальный анализ |
| **Статистика** | Минимальная (3 показателя) | Полная (все метрики) |
| **Графики** | Нет | Да (линейные графики) |
| **Каналы** | Нет детализации | Детальная статистика |
| **Кампании** | Нет | Топ-10 по эффективности |
| **Фильтры** | Нет | Да (по периодам) |
| **Назначение** | Точка входа | Анализ данных |

## Навигация в системе

```
Dashboard (/)
├── Campaigns (/campaigns)
│   ├── List
│   ├── New
│   └── Stats
├── Templates
│   ├── SMS (/sms-templates)
│   ├── Email (/email-templates)
│   ├── WhatsApp (/whatsapp-templates)
│   └── Telegram (/telegram-templates)
├── Analytics (/analytics) ← Детальная статистика
├── Segments (/segments)
└── Settings (/settings)
```

## API интеграция

Dashboard использует только один эндпоинт:

```typescript
GET /api/messages/analytics/dashboard

Response:
{
  total: number;          // Всего отправлено
  delivered: number;      // Доставлено
  failed: number;         // Ошибок
  pending: number;        // В очереди
  deliveryRate: number;   // Процент доставки
}
```

## UI/UX решения

### 1. Цветовая схема карточек:
- **Campaigns** (фиолетовый): `#667eea → #764ba2`
- **Templates** (оранжевый): `#f59e0b → #d97706`
- **Analytics** (зелёный): `#10b981 → #059669`
- **Segments** (голубой): `#06b6d4 → #0891b2`
- **Settings** (пурпурный): `#8b5cf6 → #7c3aed`

### 2. Интерактивность:
- Hover эффект с подъёмом карточки (-4px)
- Увеличение тени при наведении
- Анимация стрелки на action-карточках
- Border-top с цветом по типу

### 3. Адаптивность:
- Mobile: 1 колонка
- Tablet: 2-3 колонки
- Desktop: 3+ колонок
- Grid с `auto-fit` и `minmax()`

## Как использовать

### Запуск:
```bash
npm run start:back   # Backend на порту 3000
npm run start:front  # Frontend на порту 4200
```

### Открыть:
```
http://localhost:4200/messages/dashboard
```

### Типичный workflow:
1. Пользователь открывает Dashboard
2. Видит краткую сводку (3 показателя)
3. Выбирает нужное действие из основных функций
4. Или следует инструкции "Быстрый старт"

## Следующие шаги

### Dashboard:
- ✅ Минимальная сводка реализована
- ✅ Навигационные карточки созданы
- ✅ Быстрый старт добавлен
- ⏳ Добавить "недавние кампании" (3-5 шт)
- ⏳ Добавить "быстрые действия" (отправить SMS, Email)

### Analytics (уже существует):
- ✅ Детальная статистика по каналам
- ✅ Графики отправок
- ✅ Топ кампаний
- ✅ Фильтры по периодам

## Технологический стек

- **Framework**: Angular 20 (standalone)
- **State**: Angular Signals
- **HTTP**: HttpClient с interceptors
- **UI**: Angular Material
- **Styles**: SCSS + Custom gradients
- **Icons**: Material Icons

## Соответствие проекту

✅ Standalone components
✅ Angular signals
✅ Semantic naming
✅ Component folder structure (ts, html, scss в отдельной папке)
✅ Service injection pattern
✅ Environment configuration
✅ Material Design
✅ Responsive layout

## Performance

- **Initial Load**: ~100-200ms (только одна сводка)
- **API Call**: 1 запрос (dashboard stats)
- **Render**: Быстрый (нет тяжёлых графиков)
- **Bundle Size**: Минимальный (базовые Material компоненты)

## Сравнение подходов

### Было (старый вариант):
❌ Дублирование аналитики
❌ Тяжёлая загрузка (статистика по каналам)
❌ Путаница между Dashboard и Analytics
❌ Слишком много информации сразу

### Стало (текущий вариант):
✅ Чёткое разделение: Dashboard = навигация, Analytics = данные
✅ Быстрая загрузка (только 3 показателя)
✅ Понятный purpose каждой страницы
✅ Фокус на действиях, а не на данных

---

**Status:** ✅ COMPLETED
**Type:** Landing/Hub Page
**Focus:** Navigation & Quick Access
**Analytics:** Moved to `/messages/analytics`
