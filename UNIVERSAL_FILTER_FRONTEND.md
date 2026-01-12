# Универсальная система фильтрации - Frontend

Дата: 12 января 2026 г.

## Обзор

Создана универсальная система фильтрации для фронтенда, которая может быть переиспользована в модулях Contacts, Leads, Companies и Deals.

## Созданные файлы

### 1. Interfaces (`shared/interfaces/universal-filter.interface.ts`)

**Типы:**
- `FilterOperator` - доступные операторы фильтрации
- `UniversalFilter` - универсальный фильтр для статических и кастомных полей
- `BaseFilterState` - базовое состояние фильтров
- `BaseAdvancedSearchRequest` - базовый запрос с пагинацией
- `BaseAdvancedSearchResponse<T>` - типизированный ответ
- `FilterFieldDefinition` - определение поля для конфигурации фильтров
- `OperatorDefinition` - определение оператора для UI

### 2. Service (`shared/services/universal-filter.service.ts`)

**Методы:**

**Операторы и метаданные:**
- `operators: OperatorDefinition[]` - все доступные операторы с метаданными
- `getOperatorsForFieldType(fieldType)` - получить операторы для типа поля
- `getOperatorDefinition(operator)` - получить определение оператора
- `getOperatorLabel(operator)` - получить русское название оператора

**Работа с полями:**
- `isSelectField(field)` - проверить, нужен ли select для поля
- `getSelectOptions(field)` - получить опции для select
- `getFieldTypeHint(fieldType)` - получить подсказку типа поля

**Валидация:**
- `isValidFilterValue(operator, value)` - валидация значения фильтра
- `createDefaultFilter(fieldType, field)` - создать фильтр по умолчанию
- `countActiveFilters(filterState)` - подсчёт активных фильтров

### 3. Universal Dialog Component

**Файлы:**
- `shared/dialogs/universal-filters-dialog/universal-filters-dialog.component.ts`
- `shared/dialogs/universal-filters-dialog/universal-filters-dialog.component.html`
- `shared/dialogs/universal-filters-dialog/universal-filters-dialog.component.scss`

**Возможности:**
- Поиск и фильтр по статусу
- Табы для статических и кастомных полей
- Динамическое добавление/удаление фильтров
- Автоматическое определение типа input (text/select)
- Поддержка всех операторов
- Адаптивный дизайн

## Использование

### Пример для Contacts

```typescript
import { UniversalFiltersDialogComponent } from '../../shared/dialogs/universal-filters-dialog/universal-filters-dialog.component';
import { UniversalFilterService } from '../../shared/services/universal-filter.service';
import { FilterFieldDefinition, BaseFilterState } from '../../shared/interfaces/universal-filter.interface';

@Component({
  // ...
})
export class ContactsComponent {
  private dialog = inject(MatDialog);
  private filterService = inject(UniversalFilterService);

  filterState = signal<BaseFilterState>({
    search: undefined,
    isActive: true,
    filters: [],
  });

  // Определите статические поля
  private staticFields: FilterFieldDefinition[] = [
    {
      name: 'type',
      label: 'Тип контакта',
      type: 'select',
      selectOptions: [
        { value: 'person', label: 'Физическое лицо' },
        { value: 'company', label: 'Компания' },
      ],
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
    },
    {
      name: 'phone',
      label: 'Телефон',
      type: 'phone',
    },
    // ... другие поля
  ];

  // Кастомные поля получаются из API
  customFields = signal<FilterFieldDefinition[]>([]);

  ngOnInit() {
    this.loadCustomFields();
  }

  loadCustomFields() {
    this.customFieldsService
      .getFieldDefinitions('contact')
      .subscribe((defs) => {
        this.customFields.set(
          defs.map((def) => ({
            name: def.name,
            label: def.label,
            type: def.type,
            selectOptions: def.selectOptions?.map((opt) => ({
              label: opt,
              value: opt,
            })),
          }))
        );
      });
  }

  openFiltersDialog() {
    const dialogRef = this.dialog.open(UniversalFiltersDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        title: 'Фильтры и поиск контактов',
        staticFields: this.staticFields,
        customFields: this.customFields(),
        initialState: this.filterState(),
        showSearch: true,
        showStatus: true,
      },
    });

    dialogRef.afterClosed().subscribe((result: BaseFilterState | undefined) => {
      if (result) {
        this.filterState.set(result);
        this.loadData();
      }
    });
  }

  loadData() {
    const state = this.filterState();
    
    if (state.filters.length > 0 || state.search) {
      // Используем advanced search
      this.contactsService
        .searchContactsWithFilters({
          ...state,
          page: this.currentPage(),
          pageSize: this.pageSize(),
        })
        .subscribe((response) => {
          this.contacts.set(response.data);
          this.totalContacts.set(response.total);
        });
    } else {
      // Используем обычный список
      this.contactsService.listContacts(state.isActive).subscribe(/*...*/);
    }
  }

  // Методы для работы с чипсами фильтров
  getFilterLabel(filter: UniversalFilter): string {
    return `${filter.fieldLabel}: ${this.filterService.getOperatorLabel(filter.operator)} ${filter.value}`;
  }

  removeFilter(filter: UniversalFilter) {
    this.filterState.update((state) => ({
      ...state,
      filters: state.filters.filter((f) => f !== filter),
    }));
    this.loadData();
  }

  clearAllFilters() {
    this.filterState.set({
      search: undefined,
      isActive: true,
      filters: [],
    });
    this.loadData();
  }

  getTotalActiveFilters(): number {
    return this.filterService.countActiveFilters(this.filterState());
  }
}
```

### HTML Template для чипсов

```html
<!-- Кнопка открытия диалога -->
<button
  mat-raised-button
  color="primary"
  (click)="openFiltersDialog()"
  class="filter-button"
>
  <mat-icon>filter_list</mat-icon>
  Фильтры и поиск
  @if (getTotalActiveFilters() > 0) {
    <span class="badge">{{ getTotalActiveFilters() }}</span>
  }
</button>

<!-- Активные фильтры как чипсы -->
@if (filterState().search || filterState().filters.length > 0) {
  <div class="active-filters">
    <h3>Активные фильтры:</h3>
    <mat-chip-set>
      @if (filterState().search) {
        <mat-chip class="search-chip">
          Поиск: "{{ filterState().search }}"
          <button matChipRemove (click)="removeSearch()">
            <mat-icon>cancel</mat-icon>
          </button>
        </mat-chip>
      }

      @for (filter of filterState().filters; track filter) {
        <mat-chip class="filter-chip">
          {{ getFilterLabel(filter) }}
          <button matChipRemove (click)="removeFilter(filter)">
            <mat-icon>cancel</mat-icon>
          </button>
        </mat-chip>
      }
    </mat-chip-set>

    <button mat-button color="warn" (click)="clearAllFilters()">
      Очистить все
    </button>
  </div>
}
```

## Миграция существующих компонентов

### Шаг 1: Обновить интерфейсы

Вместо собственных интерфейсов используйте:
```typescript
import {
  UniversalFilter,
  BaseFilterState,
  FilterFieldDefinition,
} from '../../shared/interfaces/universal-filter.interface';

// Расширьте BaseFilterState если нужно
export interface ContactsFilterState extends BaseFilterState {
  // Дополнительные поля специфичные для контактов
}
```

### Шаг 2: Заменить filters-dialog компонент

Удалите старый `filters-dialog.component.ts/html/scss` и используйте `UniversalFiltersDialogComponent`.

### Шаг 3: Конвертировать определения полей

```typescript
// Старый формат
staticFields = [
  { name: 'email', label: 'Email', type: 'text' },
];

// Новый формат (с типизацией)
staticFields: FilterFieldDefinition[] = [
  { name: 'email', label: 'Email', type: 'email' },
];
```

### Шаг 4: Обновить сервис запросов

```typescript
// Добавьте метод в сервис
searchContactsWithFilters(
  request: BaseAdvancedSearchRequest
): Observable<BaseAdvancedSearchResponse<Contact>> {
  return this.http.post<BaseAdvancedSearchResponse<Contact>>(
    `${this.apiUrl}/advanced-search`,
    request
  );
}
```

## Преимущества

### ✅ Переиспользование кода
- Один компонент диалога для всех сущностей
- Единообразный UX во всех модулях
- Меньше дублирования кода

### ✅ Типобезопасность
- TypeScript интерфейсы для всех структур
- Автокомплит в IDE
- Меньше ошибок при разработке

### ✅ Гибкость
- Легко добавить новые операторы
- Кастомизация через `FilterFieldDefinition`
- Опциональные секции (поиск, статус)

### ✅ Поддерживаемость
- Изменения в одном месте
- Централизованная логика
- Легче писать тесты

## Операторы

### Текстовые поля
- **Равно** - точное совпадение
- **Не равно** - не совпадает
- **Содержит** - подстрока внутри
- **Не содержит** - подстроки нет
- **Начинается с** - префикс
- **Заканчивается на** - суффикс

### Числовые поля и даты
- **Больше** - `>`
- **Меньше** - `<`
- **Между** - диапазон (требует 2 значения)

### Списки и массивы
- **Входит в список** - проверка вхождения
- **Не входит в список** - проверка НЕвхождения

### Существование
- **Существует** - поле заполнено (не NULL/undefined)

## Типы полей

- `text` - текст
- `number` - число
- `date` - дата
- `boolean` - да/нет
- `select` - выпадающий список (одно значение)
- `multiselect` - множественный выбор
- `email` - email адрес
- `phone` - телефон
- `url` - ссылка
- `textarea` - многострочный текст

## Готовность к интеграции

- ✅ **Interfaces** - готовы
- ✅ **Service** - готов
- ✅ **Dialog Component** - готов
- ⏳ **Contacts** - требуется миграция
- ⏳ **Leads** - ожидает интеграции
- ⏳ **Companies** - ожидает интеграции
- ⏳ **Deals** - ожидает интеграции

## Дальнейшие шаги

1. **Мигрировать Contacts** на универсальную систему
2. **Интегрировать в Leads**
3. **Интегрировать в Companies**
4. **Интегрировать в Deals**
5. **Написать unit тесты** для сервиса
6. **Документировать** edge cases и best practices

---

**Автор:** GitHub Copilot  
**Дата:** 12 января 2026 г.  
**Ветка:** feat/contacts-costom-fields
