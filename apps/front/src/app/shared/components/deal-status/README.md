# Deal Status Component

Компонент для отображения статуса сделки с современным дизайном и анимациями.

## Использование

```typescript
import { DealStatusComponent } from '../../shared/components';

// В шаблоне:
<app-deal-status 
  [status]="deal.status"
  [showIndicators]="true"
  [isOverdue]="isOverdue()"
  [isHighValue]="(deal.amount || 0) > 100000"
  size="medium">
</app-deal-status>
```

## Параметры

### Обязательные

- `status: DealStatus` - статус сделки (`'open' | 'won' | 'lost'`)

### Опциональные

- `size: 'small' | 'medium' | 'large'` - размер компонента (по умолчанию: `'medium'`)
- `showIndicators: boolean` - показывать дополнительные индикаторы (по умолчанию: `false`)
- `isOverdue: boolean` - сделка просрочена (по умолчанию: `false`)
- `isHighValue: boolean` - крупная сделка (по умолчанию: `false`)
- `isHot: boolean` - горячая сделка (по умолчанию: `false`)

## Статусы

### Open (Открыта)
- **Цвет**: Синий градиент
- **Иконка**: `radio_button_unchecked`
- **Анимация**: Пульсирующий эффект
- **Использование**: Активная сделка в процессе

### Won (Выиграна)
- **Цвет**: Зеленый градиент
- **Иконка**: `check_circle`
- **Анимация**: Блики (shimmer effect)
- **Использование**: Успешно закрытая сделка

### Lost (Проиграна)
- **Цвет**: Красный градиент
- **Иконка**: `cancel`
- **Анимация**: Статичный
- **Использование**: Неуспешно закрытая сделка

## Размеры

### Small
- **Высота**: 28px
- **Иконка**: 16x16px
- **Использование**: В списках, карточках

### Medium (по умолчанию)
- **Высота**: 36px
- **Иконка**: 18x18px
- **Использование**: Основной интерфейс

### Large
- **Высота**: 44px
- **Иконка**: 20x20px
- **Использование**: Детальные страницы, заголовки

## Индикаторы

### Overdue (Просроченная)
- **Иконка**: `warning`
- **Цвет**: Желтый
- **Условие**: `isOverdue=true`

### High Value (Крупная сделка)
- **Иконка**: `star`
- **Цвет**: Оранжевый
- **Условие**: `isHighValue=true`

### Hot (Горячая сделка)
- **Иконка**: `local_fire_department`
- **Цвет**: Красный
- **Условие**: `isHot=true`

## Темы

Компонент поддерживает автоматическое переключение между светлой и темной темами на основе CSS-класса `.dark` на родительском элементе.

### Светлая тема
- Яркие цвета с градиентами
- Светлые фоны
- Контрастные тексты

### Темная тема
- Приглушенные цвета
- Темные фоны
- Адаптированная контрастность

## Адаптивность

Компонент автоматически адаптируется под мобильные устройства:

- На экранах < 768px размеры уменьшаются
- Индикаторы становятся компактнее
- Анимации оптимизируются для производительности

## Примеры использования

### В карточке сделки (Deal Card)
```html
<app-deal-status 
  [status]="deal.status"
  [showIndicators]="true"
  [isOverdue]="isOverdue()"
  [isHighValue]="(deal.amount || 0) > 50000"
  size="small">
</app-deal-status>
```

### В детальной странице (Deal Detail)
```html
<app-deal-status 
  [status]="deal.status"
  [showIndicators]="true"
  [isOverdue]="isOverdue()"
  [isHighValue]="(deal.amount || 0) > 100000"
  size="large">
</app-deal-status>
```

### Простое отображение
```html
<app-deal-status [status]="deal.status"></app-deal-status>
```

## CSS Переменные

Компонент использует CSS переменные для темизации:

```css
:root {
  --primary-color: #3b82f6;
  /* Другие переменные темы */
}
```

## Зависимости

- Angular Material Icons (`MatIconModule`)
- Angular Material Chips (`MatChipsModule`)
- Angular Material Tooltip (`MatTooltipModule`)

## Файловая структура

```
shared/components/deal-status/
├── deal-status.component.ts    # Основной компонент
└── README.md                  # Документация
```

## Экспорт

Компонент экспортируется через `shared/components/index.ts`:

```typescript
export * from './deal-status/deal-status.component';
```