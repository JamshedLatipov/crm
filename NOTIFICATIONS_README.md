# 🔔 Система уведомлений CRM

## Установка и использование

### NotificationBellComponent добавлен в проект!

Компонент уведомлений уже интегрирован в sidebar приложения. Вы можете увидеть колокольчик с уведомлениями в правом верхнем углу sidebar.

## Варианты размещения

### 1. В Sidebar (текущий)
NotificationBellComponent уже добавлен в `SidebarComponent` в header секции рядом с логотипом.

### 2. В отдельном Header (опционально)
Создан `HeaderComponent` который можно использовать вместо размещения в sidebar.

Для использования раскомментируйте в `app.html`:
```html
<app-header></app-header>
```

И добавьте HeaderComponent в imports в `app.ts`.

## Компоненты

### NotificationBellComponent
- **Расположение**: `apps/front/src/app/components/notification-bell/`
- **Функции**:
  - Отображение количества непрочитанных уведомлений
  - Выпадающее меню с списком уведомлений
  - Отметка как прочитанное
  - Автообновление каждые 30 секунд
  - Цветовая индикация приоритета

### NotificationService (Frontend)
- **Расположение**: `apps/front/src/app/services/notification.service.ts`
- **Функции**:
  - Загрузка уведомлений
  - Реактивное состояние на Angular signals
  - Автоматический polling
  - Управление прочитанными/непрочитанными

## Backend API

### Эндпоинты
- `GET /api/notifications` - получить уведомления
- `GET /api/notifications/unread-count` - количество непрочитанных
- `PATCH /api/notifications/:id/read` - отметить как прочитанное
- `PATCH /api/notifications/mark-all-read` - отметить все как прочитанные

### Автоматические уведомления

Система автоматически создает уведомления при:
- Изменении скора лида (увеличение/уменьшение)
- Смене температуры лида (cold → warm → hot)
- Достижении пороговых значений скоров
- Создании/изменении сделок

## Настройка

### Правила уведомлений
Можно создать собственные правила через API:
```
POST /api/notification-rules
```

### Каналы доставки
- IN_APP (в приложении) - работает по умолчанию
- EMAIL - требует настройки SMTP
- PUSH - требует настройки push-сервиса
- SMS - требует SMS-провайдера

## Стилизация

Компонент использует Material Design и CSS переменные:
- `--primary-color` - основной цвет
- `--warning-color` - цвет предупреждений
- `--text-primary` - основной текст
- `--divider-color` - разделители

## Тестирование

Для тестирования уведомлений используйте эндпоинты:
```
POST /api/notification-rules/test/lead-score-change
POST /api/notification-rules/test/deal-created
```

## Расширение

Для добавления новых типов уведомлений:
1. Добавьте тип в `NotificationType` enum
2. Обновите правила в `NotificationRuleService`
3. Добавьте иконку в `getNotificationIcon()`