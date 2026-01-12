# Рефакторинг: Универсальная система фильтрации

Дата: 12 января 2026 г.

## Проблема

Логика фильтрации контактов была реализована непосредственно в `ContactsService`, что затрудняло её переиспользование в других модулях (Leads, Companies, Deals), которые также имеют кастомные поля.

## Решение

Создана универсальная система фильтрации, вынесенная в `SharedModule` для переиспользования во всех модулях.

## Реализованные изменения

### 1. Создан универсальный DTO (`shared/dto/universal-filter.dto.ts`)

**UniversalFilterDto** - описывает один фильтр:
```typescript
{
  fieldType: 'static' | 'custom',
  fieldName: string,
  fieldLabel: string,
  operator: 'equals' | 'contains' | 'greater' | ...,
  value: string | number | boolean | array
}
```

**BaseAdvancedSearchDto** - базовый DTO для расширенного поиска:
```typescript
{
  search?: string,
  isActive?: boolean,
  filters?: UniversalFilterDto[],
  page?: number,
  pageSize?: number
}
```

### 2. Создан универсальный сервис (`shared/services/universal-filter.service.ts`)

**UniversalFilterService** предоставляет методы:

- `applyFilter()` - применяет один фильтр к query builder
- `applyFilters()` - применяет массив фильтров
- `applyStaticFieldFilter()` - обрабатывает статические поля
- `applyCustomFieldFilter()` - обрабатывает JSONB кастомные поля
- `applyOperator()` - применяет оператор сравнения

**Поддерживаемые операторы:**
- Текст: `equals`, `not_equals`, `contains`, `not_contains`, `starts_with`, `ends_with`
- Числа/даты: `greater`, `less`, `between`
- Массивы: `in`, `not_in`
- Существование: `exists`

### 3. Обновлён SharedModule

```typescript
@Module({
  providers: [AssignmentService, TimezoneService, UniversalFilterService],
  exports: [AssignmentService, TimezoneService, UniversalFilterService]
})
```

### 4. Рефакторинг ContactsModule

**DTO** (`contacts/dto/advanced-search.dto.ts`):
```typescript
export class AdvancedSearchDto extends BaseAdvancedSearchDto {}
export { UniversalFilterDto } from '../../shared/dto/universal-filter.dto';
```

**Service** (`contacts/contacts.service.ts`):
- Добавлен `staticFieldsMap` для маппинга полей
- Инжектирован `UniversalFilterService`
- Удалены дублирующие методы `applyUniversalFilter`, `applyStaticFieldFilter`, `applyCustomFieldFilter`
- Использование: `this.universalFilterService.applyFilters(qb, filters, 'contact', this.staticFieldsMap)`

**Module** (`contacts/contacts.module.ts`):
```typescript
imports: [
  // ... другие импорты
  SharedModule,
]
```

## Преимущества

### ✅ Переиспользование
- Один сервис для всех модулей с кастомными полями
- Единообразная логика фильтрации

### ✅ Поддерживаемость
- Изменения в одном месте применяются ко всем модулям
- Легче добавлять новые операторы

### ✅ Тестируемость
- Сервис можно тестировать независимо
- Меньше дублирования в тестах

### ✅ Масштабируемость
- Быстрая интеграция в новые модули
- Готовая документация

## Файлы

### Созданы
- `apps/back/src/app/modules/shared/dto/universal-filter.dto.ts` - универсальные DTO
- `apps/back/src/app/modules/shared/services/universal-filter.service.ts` - сервис фильтрации
- `apps/back/src/app/modules/shared/services/UNIVERSAL_FILTER_USAGE.md` - документация по использованию

### Изменены
- `apps/back/src/app/modules/shared/shared.module.ts` - экспорт сервиса
- `apps/back/src/app/modules/shared/README.md` - обновлена документация
- `apps/back/src/app/modules/contacts/dto/advanced-search.dto.ts` - использует базовый DTO
- `apps/back/src/app/modules/contacts/contacts.module.ts` - импорт SharedModule
- `apps/back/src/app/modules/contacts/contacts.service.ts` - использует UniversalFilterService

## Готово к интеграции

Система готова к использованию в:
- ✅ **Контакты** (contacts) - интегрировано
- ⏳ **Лиды** (leads) - ожидает интеграции
- ⏳ **Компании** (companies) - ожидает интеграции
- ⏳ **Сделки** (deals) - ожидает интеграции

## Примеры использования

### Базовое использование в сервисе

```typescript
@Injectable()
export class LeadsService {
  private readonly staticFieldsMap: Record<string, string> = {
    status: 'lead.status',
    source: 'lead.source',
    email: 'lead.email',
  };

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    private readonly universalFilterService: UniversalFilterService,
  ) {}

  async searchWithFilters(dto: LeadAdvancedSearchDto) {
    const qb = this.leadRepository.createQueryBuilder('lead');
    
    if (dto.filters?.length) {
      this.universalFilterService.applyFilters(
        qb,
        dto.filters,
        'lead',
        this.staticFieldsMap
      );
    }
    
    return qb.getMany();
  }
}
```

### Запрос с фронтенда

```typescript
const filters: UniversalFilter[] = [
  {
    fieldType: 'static',
    fieldName: 'email',
    fieldLabel: 'Email',
    operator: 'contains',
    value: '@example.com'
  },
  {
    fieldType: 'custom',
    fieldName: 'customer_type',
    fieldLabel: 'Тип клиента',
    operator: 'equals',
    value: 'vip'
  }
];

this.http.post('/contacts/advanced-search', {
  search: 'john',
  isActive: true,
  filters,
  page: 1,
  pageSize: 50
});
```

## Технические детали

### PostgreSQL особенности
- Используются двойные кавычки для сохранения регистра: `"customFields"`
- JSONB операторы: `->>` для извлечения текста, `?` для проверки существования
- Приведение типов: `::numeric` для числовых операций с JSONB

### Безопасность
- Все значения параметризованы (защита от SQL injection)
- Уникальные префиксы параметров для каждого фильтра
- Валидация через class-validator в DTO

### Производительность
- Индексы на часто фильтруемые колонки
- GIN индексы для JSONB колонок с кастомными полями
- Пагинация для больших результатов

## Дальнейшие шаги

1. **Интеграция в Leads:**
   - Создать `LeadAdvancedSearchDto extends BaseAdvancedSearchDto`
   - Определить `staticFieldsMap` для лидов
   - Добавить endpoint `POST /leads/advanced-search`

2. **Интеграция в Companies:**
   - Аналогично лидам

3. **Интеграция в Deals:**
   - Аналогично лидам

4. **Оптимизация:**
   - Добавить индексы на часто фильтруемые кастомные поля
   - Кэширование определений кастомных полей

## Тестирование

Проверено:
- ✅ Фильтрация по статическим полям (email, phone, type, source)
- ✅ Фильтрация по кастомным полям (select, text, number)
- ✅ Комбинированные фильтры (статика + кастомные)
- ✅ Поиск + фильтры
- ✅ Пагинация с фильтрами
- ✅ Исправлена ошибка с регистром PostgreSQL

Требуется:
- ⏳ Unit тесты для UniversalFilterService
- ⏳ E2E тесты для advanced-search endpoints
- ⏳ Тесты производительности на больших датасетах

## Документация

Полная документация доступна в:
- `apps/back/src/app/modules/shared/services/UNIVERSAL_FILTER_USAGE.md` - детальное руководство
- `apps/back/src/app/modules/shared/README.md` - обзор shared модуля

---

**Автор:** GitHub Copilot  
**Дата:** 12 января 2026 г.  
**Ветка:** feat/contacts-costom-fields
