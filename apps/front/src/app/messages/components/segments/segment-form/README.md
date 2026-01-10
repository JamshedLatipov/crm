# Segment Form Component

## Описание
Компонент для создания и редактирования сегментов контактов. Предназначен для таргетированных маркетинговых кампаний.

## Функциональность

### Основные возможности
- ✅ Создание нового сегмента
- ✅ Редактирование существующего сегмента
- ✅ Динамическое добавление/удаление фильтров
- ✅ Выбор логики фильтров (AND/OR)
- ✅ Поддержка динамических сегментов
- ✅ Превью сегмента перед сохранением
- ✅ Валидация формы
- ✅ Интеграция с SegmentService

### Поля формы

#### Основная информация
- **Название** (обязательно, минимум 3 символа)
- **Описание** (опционально)
- **Логика фильтров** (AND/OR)
- **Динамический сегмент** (toggle)

#### Фильтры контактов
Каждый фильтр содержит:
- **Поле**: name, email, phone, status, createdAt, lastContactedAt, tags
- **Оператор**: equals, notEquals, contains, notContains, startsWith, endsWith, greater, less, between, in, notIn
- **Значение**: текстовое поле для ввода значения

### Дизайн

#### Используемые компоненты
- `PageLayoutComponent` - базовый layout с заголовком и действиями
- Material Design компоненты: Card, Form Field, Input, Select, Button, Icon, Chips, Toggle, Divider, Spinner

#### Стили
- Градиентная карточка превью (фиолетовый градиент)
- Адаптивный grid для фильтров
- Анимации при hover
- Empty state для пустого списка фильтров
- Информационная карточка для динамических сегментов

#### Адаптивность
- Desktop: 4 колонки в фильтрах
- Tablet (≤1024px): 2 колонки
- Mobile (≤640px): 1 колонка

### API Integration

#### Создание сегмента
```typescript
POST /api/sms/segments
Body: CreateSegmentDto
```

#### Обновление сегмента
```typescript
PUT /api/sms/segments/:id
Body: Partial<CreateSegmentDto>
```

#### Загрузка сегмента
```typescript
GET /api/sms/segments/:id
Response: Segment
```

### Signals
- `templateId` - ID редактируемого сегмента (null для нового)
- `loading` - индикатор загрузки данных

### Особенности реализации

#### Динамические фильтры
Используется FormArray для управления динамическим списком фильтров:
```typescript
get filters(): FormArray {
  return this.form.get('filters') as FormArray;
}

addFilter() {
  const filterGroup = this.fb.group({
    field: ['', Validators.required],
    operator: ['equals', Validators.required],
    value: ['', Validators.required]
  });
  this.filters.push(filterGroup);
}
```

#### Превью сегмента
Отображает визуальное представление условий фильтрации:
- Название сегмента
- Логика объединения (AND/OR)
- Список всех фильтров с читаемыми названиями
- Бейдж "Динамический" при необходимости

#### Валидация
- Название: обязательно, минимум 3 символа
- Фильтры: все поля обязательны при добавлении фильтра
- Форма блокирует кнопку "Сохранить" при невалидных данных

### Примеры использования

#### Навигация к созданию
```typescript
this.router.navigate(['/messages/segments/new']);
```

#### Навигация к редактированию
```typescript
this.router.navigate(['/messages/segments', segmentId]);
```

### Зависимости
- `SegmentService` - работа с API
- `FormBuilder` - построение реактивных форм
- `Router` - навигация
- `ActivatedRoute` - получение ID из URL
- `MatSnackBar` - уведомления

### TODO / Улучшения
- [ ] Добавить предпросмотр количества контактов
- [ ] Добавить валидацию специфичную для типа поля
- [ ] Добавить автосохранение в черновики
- [ ] Добавить историю изменений
- [ ] Добавить экспорт/импорт фильтров
