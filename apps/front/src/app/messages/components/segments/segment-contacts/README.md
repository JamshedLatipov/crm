# Segment Contacts Component

## Описание
Компонент для просмотра списка контактов, входящих в определённый сегмент.

## Функциональность

### Основные возможности
- ✅ Просмотр списка контактов сегмента
- ✅ Информация о сегменте (фильтры, логика, тип)
- ✅ Пагинация контактов
- ✅ Адаптивная таблица с контактами
- ✅ Ссылки для звонка и email
- ✅ Статусы контактов с цветовой индикацией
- ✅ Возврат к списку сегментов

### Отображаемые поля контактов
- **Имя** - имя контакта
- **Email** - с кликабельной ссылкой mailto:
- **Телефон** - с кликабельной ссылкой tel:
- **Статус** - цветной чип со статусом
- **Дата создания** - форматированная дата

### Информация о сегменте
- Количество фильтров
- Логика объединения (AND/OR)
- Тип сегмента (Динамический/Статический)
- Описание сегмента

### Дизайн

#### Используемые компоненты
- `PageLayoutComponent` - базовый layout
- `CrmTableComponent` - таблица с данными
- Material Design: Button, Icon, Chips, Spinner, Tooltip

#### Цветовая схема статусов
- **Success (зелёный)**: active
- **Warn (красный)**: inactive
- **Primary (синий)**: new
- **Default (серый)**: остальные

#### Стили
- Карточки с информацией о сегменте
- Градиент при hover
- Адаптивная grid сетка
- Empty state для пустого списка
- Стильная пагинация

### API Integration

#### Загрузка сегмента
```typescript
GET /api/sms/segments/:id
Response: Segment
```

#### Загрузка контактов
```typescript
GET /api/sms/segments/:id/contacts?page=1&limit=20
Response: PaginatedResponse<Contact>
```

### Маршрутизация
```
/messages/segments/:id/contacts
```

### Навигация

#### Из списка сегментов
```html
<button [routerLink]="['/messages/segments', segment.id, 'contacts']">
  <mat-icon>people</mat-icon>
</button>
```

#### Возврат к списку
```typescript
goBack() {
  this.router.navigate(['/messages/segments']);
}
```

### Signals
- `segmentId` - ID текущего сегмента
- `segment` - данные сегмента
- `contacts` - список контактов
- `loading` - индикатор загрузки
- `totalContacts` - общее количество контактов
- `currentPage` - текущая страница
- `totalPages` - computed, общее количество страниц

### Пагинация
- Размер страницы: 20 контактов
- Навигация: кнопки "назад" / "вперёд"
- Отображение текущей страницы и общего числа

### Особенности реализации

#### Форматирование даты
```typescript
formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ru-RU');
}
```

#### Цветовая схема статусов
```typescript
getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'active': 'success',
    'inactive': 'warn',
    'new': 'primary'
  };
  return colors[status] || 'default';
}
```

### Empty State
Отображается когда в сегменте нет контактов:
- Иконка people_outline
- Заголовок "Нет контактов"
- Описание "В этом сегменте пока нет контактов"

### Примеры использования

#### Просмотр контактов из списка
```typescript
// В segment-list.component.html
<button [routerLink]="['/messages/segments', segment.id, 'contacts']">
  Просмотр контактов
</button>
```

#### Прямая навигация
```typescript
this.router.navigate(['/messages/segments', segmentId, 'contacts']);
```

### Зависимости
- `SegmentService` - загрузка сегмента и контактов
- `Router` - навигация
- `ActivatedRoute` - получение ID из URL
- `MatSnackBar` - уведомления

### TODO / Улучшения
- [ ] Добавить фильтрацию контактов
- [ ] Добавить поиск по имени/email/телефону
- [ ] Добавить сортировку колонок
- [ ] Добавить экспорт контактов (CSV/XLSX)
- [ ] Добавить массовые действия (выбор нескольких контактов)
- [ ] Добавить детальную карточку контакта при клике
