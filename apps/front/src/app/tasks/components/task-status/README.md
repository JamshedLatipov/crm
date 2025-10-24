# TaskStatusComponent

Универсальный standalone компонент для отображения статуса задачи с визуальной индикацией. Дизайн соответствует компоненту `DealStatusComponent` для единообразия интерфейса.

## Использование

### В таблице задач (small размер)

```typescript
<app-task-status 
  [status]="task.status" 
  [showIndicators]="true" 
  size="small">
</app-task-status>
```

### В детальной странице задачи (medium/large размер)

```typescript
<app-task-status 
  [status]="task.status" 
  [showIndicators]="false" 
  size="medium">
</app-task-status>
```

## Входные параметры

### `status` (required)

Тип: `'pending' | 'in_progress' | 'done' | 'overdue'`

Статус задачи, определяет цвет, иконку и текст.

### `size` (optional, default: 'medium')

Тип: `'small' | 'medium' | 'large'`

Размер чипа:
- `small` - компактный для таблиц (28px высота)
- `medium` - стандартный (36px высота)
- `large` - крупный для заголовков (44px высота)

### `showIndicators` (optional, default: false)

Тип: `boolean`

Показывать ли дополнительные индикаторы (например, иконку warning для просроченных задач).

## Визуальные состояния

### 1. **Pending** (В ожидании)
- **Цвет фона**: `#fff7ed` (светло-оранжевый)
- **Цвет границы**: `#f59e0b` (оранжевый)
- **Цвет текста**: `#b45309` (темно-оранжевый)
- **Иконка**: `pending` (часы)

### 2. **In Progress** (В работе)
- **Цвет фона**: `#e8f0ff` (светло-синий)
- **Цвет границы**: `#3b82f6` (синий)
- **Цвет текста**: `#2563eb` (темно-синий)
- **Иконка**: `play_circle` (play)
- **Эффект**: Пульсирующий круг вокруг иконки

### 3. **Done** (Завершено)
- **Цвет фона**: `#ecfdf5` (светло-зеленый)
- **Цвет границы**: `#10b981` (зеленый)
- **Цвет текста**: `#047857` (темно-зеленый)
- **Иконка**: `check_circle` (галочка)

### 4. **Overdue** (Просрочено)
- **Цвет фона**: `#fff1f2` (светло-красный)
- **Цвет границы**: `#ef4444` (красный)
- **Цвет текста**: `#b91c1c` (темно-красный)
- **Иконка**: `warning` (предупреждение)
- **Эффект**: Пульсирующая граница (анимация)
- **Индикатор**: Дополнительный warning badge (если `showIndicators=true`)

## Анимации

### Pulse (для In Progress)
Пульсирующий круг вокруг иконки play, показывающий активность:
```scss
@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0; }
  100% { transform: scale(0.8); opacity: 0; }
}
```

### Pulse Border (для Overdue)
Пульсирующая тень границы для привлечения внимания:
```scss
@keyframes pulse-border {
  0%, 100% { box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2); }
  50% { box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4); }
}
```

### Hover эффект
При наведении чип немного приподнимается:
```scss
transform: translateY(-1px);
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
```

## Адаптивность

- **Desktop**: Полноразмерные чипы с hover эффектами
- **Tablet**: Стандартные размеры
- **Mobile** (< 768px): Уменьшенные отступы и размеры

## Темная тема

Компонент автоматически адаптируется к темной теме через `:host-context(.dark)`:

- **Pending**: `#422006` фон, `#fbbf24` текст
- **In Progress**: `#1e3a8a` фон, `#93c5fd` текст
- **Done**: `#14532d` фон, `#6ee7b7` текст
- **Overdue**: `#7f1d1d` фон, `#fca5a5` текст

## Примеры использования

### Компактный вариант для таблицы

```html
<app-task-status 
  [status]="'in_progress'" 
  size="small">
</app-task-status>
```

### С индикаторами для просроченной задачи

```html
<app-task-status 
  [status]="'overdue'" 
  [showIndicators]="true" 
  size="medium">
</app-task-status>
```

### Крупный вариант для карточки

```html
<app-task-status 
  [status]="'done'" 
  size="large">
</app-task-status>
```

## Сравнение с DealStatusComponent

| Свойство | TaskStatusComponent | DealStatusComponent |
|----------|---------------------|---------------------|
| Статусы | pending, in_progress, done, overdue | open, won, lost |
| Пульсация | In Progress | Open |
| Индикаторы | Overdue warning | Overdue, HighValue, Hot |
| Цветовая схема | Оранжевый, Синий, Зеленый, Красный | Синий, Зеленый, Красный |

## Стилизация

Компонент использует inline styles для базовых цветов и SCSS для анимаций и эффектов. Это позволяет:
- Легко настраивать цвета через `@Input` параметры
- Поддерживать темную тему
- Использовать CSS переменные для адаптации

## Зависимости

- `@angular/common` - CommonModule
- `@angular/material/icon` - MatIconModule
- `@angular/material/chips` - MatChipsModule
- `@angular/material/tooltip` - MatTooltipModule

## Импорт

```typescript
import { TaskStatusComponent } from './components/task-status/task-status.component';

@Component({
  // ...
  imports: [TaskStatusComponent]
})
```

## История изменений

### v1.0.0 (24.10.2025)
- ✅ Первая версия компонента
- ✅ Соответствие дизайну DealStatusComponent
- ✅ Поддержка 4 статусов задач
- ✅ 3 размера (small, medium, large)
- ✅ Анимации (pulse, pulse-border, hover)
- ✅ Темная тема
- ✅ Адаптивный дизайн
