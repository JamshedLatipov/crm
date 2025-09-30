# Lead Status & Priority Components

Компоненты для отображения статуса и приоритета лидов с современным дизайном.

## LeadStatusComponent

### Импорт
```typescript
import { LeadStatusComponent } from '../lead-status/lead-status.component';
```

### Использование
```html
<!-- Базовое использование -->
<app-lead-status [status]="lead.status"></app-lead-status>

<!-- С настройками размера -->
<app-lead-status 
  [status]="lead.status" 
  size="large"
  [showIcon]="true">
</app-lead-status>

<!-- В header контексте (прозрачный фон) -->
<div class="header-context">
  <app-lead-status [status]="lead.status" size="large"></app-lead-status>
</div>

<!-- В светлом контексте (карточки) -->
<div class="light-context">
  <app-lead-status [status]="lead.status" size="medium"></app-lead-status>
</div>

<!-- В списках (компактный размер) -->
<div class="list-context">
  <app-lead-status [status]="lead.status" size="small"></app-lead-status>
</div>
```

### Параметры
- `status` (обязательный): `LeadStatus` - статус лида
- `size` (опциональный): `'small' | 'medium' | 'large'` - размер компонента (по умолчанию: 'medium')
- `showIcon` (опциональный): `boolean` - показывать ли цветовой индикатор (по умолчанию: true)

### Статусы
- `new` - Новый (зеленый)
- `contacted` - Контакт установлен (синий)
- `qualified` - Квалифицирован (желтый)
- `proposal_sent` - Предложение отправлено (фиолетовый)
- `negotiating` - Переговоры (оранжевый)
- `converted` - Конвертирован (зеленый)
- `rejected` - Отклонен (красный)
- `lost` - Потерян (серый)

## LeadPriorityComponent

### Импорт
```typescript
import { LeadPriorityComponent } from '../lead-priority/lead-priority.component';
```

### Использование
```html
<!-- Базовое использование -->
<app-lead-priority [priority]="lead.priority"></app-lead-priority>

<!-- С настройками размера -->
<app-lead-priority 
  [priority]="lead.priority" 
  size="large"
  [showIcon]="true">
</app-lead-priority>

<!-- В светлом контексте -->
<div class="light-context">
  <app-lead-priority [priority]="lead.priority" size="medium"></app-lead-priority>
</div>
```

### Параметры
- `priority` (обязательный): `LeadPriority` - приоритет лида
- `size` (опциональный): `'small' | 'medium' | 'large'` - размер компонента (по умолчанию: 'medium')
- `showIcon` (опциональный): `boolean` - показывать ли цветовой индикатор (по умолчанию: true)

### Приоритеты
- `low` - Низкий (зеленый)
- `medium` - Средний (оранжевый)
- `high` - Высокий (красный)
- `urgent` - Срочный (розовый с пульсацией)

## Особенности дизайна

### Адаптивность
- Компоненты автоматически адаптируются к контексту использования
- Поддержка hover-эффектов и анимаций
- Респонсивный дизайн для мобильных устройств

### Цветовая схема
- Градиентные фоны для лучшей визуализации
- Цветовые индикаторы для быстрого распознавания
- Поддержка разных контекстов (header, light, list)

### Анимации
- Плавные переходы при hover
- Пульсирующая анимация для срочного приоритета
- Эффекты тени и трансформации