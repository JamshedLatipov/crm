# Task Board Component

## Описание
Компонент доски задач (Board View) с функциональностью drag-and-drop для управления задачами. Задачи организованы в колонки по статусам и могут перемещаться между ними путем перетаскивания.

## Структура

### Основные компоненты:

1. **task-board.component.ts** - главный компонент доски
   - Управление состоянием задач
   - Обработка drag & drop событий
   - Фильтрация и поиск задач
   - Статистика по задачам

2. **task-board-column.component.ts** - компонент колонки
   - Отображение задач определенного статуса
   - Drop zone для перетаскивания
   - Действия с колонкой

3. **task-board-card.component.ts** - карточка задачи
   - Компактное отображение задачи
   - Индикатор приоритета
   - Быстрые действия (редактировать, удалить)
   - Связанные сущности (lead, deal, call)

## Функционал

### Drag & Drop
- Перетаскивание задач между колонками
- Автоматическое обновление статуса при перемещении
- Визуальная обратная связь (preview, placeholder)
- Сохранение на бэкенде

### Колонки статусов
По умолчанию 3 колонки:
- **К выполнению** (pending) - серая
- **В работе** (in_progress) - синяя
- **Завершено** (done) - зеленая

### Фильтрация
- Поиск по названию и описанию
- Фильтр по исполнителю (опционально)
- Сброс всех фильтров

### Статистика
- Общее количество задач
- Количество по каждому статусу
- Обновляется динамически

## Использование

### Навигация
```typescript
// Переход на доску
router.navigate(['/tasks/board']);

// Из списка задач
<button mat-stroked-button routerLink="/tasks/board">
  <mat-icon>dashboard</mat-icon>
  Board View
</button>
```

### Создание задачи
```typescript
taskModalService.openCreateTask().subscribe(result => {
  if (result) {
    // Задача создана
  }
});
```

### Редактирование задачи
```typescript
taskModalService.openEditTask(taskId).subscribe(result => {
  if (result) {
    // Задача обновлена
  }
});
```

## API требования

### Endpoints
- `GET /tasks` - список задач с пагинацией и фильтрами
- `PATCH /tasks/:id` - обновление задачи (включая статус)
- `DELETE /tasks/:id` - удаление задачи

### TaskDto
```typescript
interface TaskDto {
  id?: number;
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignedToId?: number;
  assignedTo?: any;
  leadId?: number;
  dealId?: string;
  taskTypeId?: number;
  taskType?: any;
  callLogId?: string;
}
```

## Стилизация

### Цветовая схема статусов
- pending: `#94a3b8` (slate)
- in_progress: `#3b82f6` (blue)
- done: `#10b981` (green)

### Приоритеты
- urgent: `#ef4444` (red)
- high: `#f97316` (orange)
- medium: `#eab308` (yellow)
- low: `#3b82f6` (blue)

## Responsive дизайн
- Desktop: колонки в ряд с горизонтальным скроллом
- Mobile: колонки вертикально (один столбец)

## Зависимости
- `@angular/cdk/drag-drop` - drag & drop функциональность
- `@angular/material` - UI компоненты
- Angular signals - управление состоянием

## Будущие улучшения
- [ ] Кастомизация колонок
- [ ] Сохранение порядка задач внутри колонки
- [ ] Массовые операции
- [ ] Архивирование задач
- [ ] Фильтр по дате создания
- [ ] Группировка по исполнителю
- [ ] Экспорт в различные форматы
