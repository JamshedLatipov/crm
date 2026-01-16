# Реализация дополнительных полей для Leads, Deals и Companies

## Дата: 12 января 2026 г.

## Описание
Расширена система дополнительных полей (custom fields), ранее доступная только для контактов, на сущности: **Leads**, **Deals** и **Companies**.

## Изменения в Backend

### 1. Обновлены Entity

#### Lead Entity (`apps/back/src/app/modules/leads/lead.entity.ts`)
- Изменен тип поля `customFields` с `Record<string, string | number | boolean>` на `Record<string, unknown>`
- Изменен тип колонки с `json` на `jsonb` для лучшей производительности

#### Deal Entity (`apps/back/src/app/modules/deals/deal.entity.ts`)
- Добавлено новое поле `customFields?: Record<string, unknown>`
- Тип колонки: `jsonb`

#### Company Entity (`apps/back/src/app/modules/companies/entities/company.entity.ts`)
- Добавлено новое поле `customFields?: Record<string, unknown>`
- Тип колонки: `jsonb`

### 2. Обновлены DTO

#### Leads
- `CreateLeadDto` и `UpdateLeadDto` - изменен тип `customFields` на `Record<string, unknown>`

#### Deals
- `CreateDealDto` - добавлено поле `customFields?: Record<string, unknown>`
- `UpdateDealDto` - добавлено поле `customFields?: Record<string, unknown>`

#### Companies
- `CreateCompanyDto` - уже содержало поле `customFields?: Record<string, unknown>`
- `UpdateCompanyDto` - наследует от `CreateCompanyDto` через `PartialType`

### 3. Обновлены Modules

#### Lead Module (`apps/back/src/app/modules/leads/lead.module.ts`)
- Импортирован `CustomFieldsModule`

#### Deals Module (`apps/back/src/app/modules/deals/deals.module.ts`)
- Импортирован `CustomFieldsModule`

#### Companies Module (`apps/back/src/app/modules/companies/companies.module.ts`)
- Уже содержал импорт `CustomFieldsModule`

### 4. Обновлены Services с валидацией

#### Lead Service (`apps/back/src/app/modules/leads/lead.service.ts`)
- Импортирован `CustomFieldsService` и `BadRequestException`
- Добавлена валидация в методе `create()`:
  ```typescript
  if (data.customFields) {
    const validation = await this.customFieldsService.validateCustomFields('lead', data.customFields);
    if (!validation.isValid) {
      const errorMessages = Object.entries(validation.errors)
        .map(([field, errs]) => `${field}: ${errs.join(', ')}`)
        .join('; ');
      throw new BadRequestException(`Custom fields validation failed: ${errorMessages}`);
    }
  }
  ```
- Добавлена аналогичная валидация в методе `update()`

#### Deals Service (`apps/back/src/app/modules/deals/deals.service.ts`)
- Импортирован `CustomFieldsService` и `BadRequestException`
- Добавлена валидация в методе `createDeal()`
- Добавлена валидация в методе `updateDeal()`
- Добавлено поле `customFields` в `dealPayload` при создании

#### Companies Service (`apps/back/src/app/modules/companies/services/companies.service.ts`)
- Уже содержал импорт `CustomFieldsService`
- Валидация уже была реализована в методе `create()`
- Валидация уже была реализована в методе `update()`

## Система Custom Fields

### Определение полей
Все дополнительные поля определяются в таблице `custom_field_definitions` через сущность `CustomFieldDefinition`:

```typescript
@Entity('custom_field_definitions')
export class CustomFieldDefinition {
  id: string;
  entityType: 'contact' | 'lead' | 'deal' | 'company';
  name: string; // Внутренний ключ (например, "customer_type")
  label: string; // Отображаемое название (например, "Тип клиента")
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'email' | 'phone' | 'url' | 'textarea';
  validationRules?: ValidationRule[];
  selectOptions?: SelectOption[];
  displayConfig: DisplayConfig;
  isActive: boolean;
  sortOrder: number;
  defaultValue?: string;
}
```

### Типы полей
- **text** - Текстовое поле
- **number** - Числовое поле
- **date** - Дата
- **boolean** - Логическое значение
- **select** - Выбор из списка (один вариант)
- **multiselect** - Выбор из списка (несколько вариантов)
- **email** - Email адрес
- **phone** - Телефон
- **url** - URL адрес
- **textarea** - Многострочный текст

### Правила валидации
- **required** - Обязательное поле
- **minLength/maxLength** - Минимальная/максимальная длина строки
- **min/max** - Минимальное/максимальное значение числа
- **pattern** - Соответствие регулярному выражению
- **email** - Валидация email
- **url** - Валидация URL
- **phone** - Валидация телефона

### API Endpoints
Управление определениями полей через `CustomFieldsController`:
- `GET /custom-fields` - Список всех определений
- `GET /custom-fields/entity/:entityType` - Определения для конкретной сущности
- `POST /custom-fields` - Создать определение
- `PATCH /custom-fields/:id` - Обновить определение
- `DELETE /custom-fields/:id` - Удалить определение

## Примеры использования

### Создание Lead с дополнительными полями
```typescript
POST /leads
{
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "customFields": {
    "customer_type": "vip",
    "budget": 50000,
    "preferred_contact": "email"
  }
}
```

### Создание Deal с дополнительными полями
```typescript
POST /deals
{
  "title": "Новая сделка",
  "amount": 100000,
  "currency": "TJS",
  "customFields": {
    "contract_type": "annual",
    "payment_terms": "30_days",
    "special_requirements": "Требуется предоплата"
  }
}
```

### Создание Company с дополнительными полями
```typescript
POST /companies
{
  "name": "ООО Компания",
  "inn": "1234567890",
  "customFields": {
    "rating": 5,
    "partnership_level": "gold",
    "annual_contract": true
  }
}
```

## Миграция данных
Не требуется, так как:
1. Поле `customFields` в Lead уже существовало (просто изменен тип)
2. Поля `customFields` в Deal и Company добавлены как nullable
3. TypeORM с `synchronize: true` автоматически создаст колонки при следующем запуске

## Проверка

### 1. Запустить сервисы
```bash
npm run start:services
npm run start:back
```

### 2. Проверить создание определений полей
```bash
# Создать определение для Lead
POST /custom-fields
{
  "entityType": "lead",
  "name": "lead_score",
  "label": "Оценка лида",
  "fieldType": "number",
  "validationRules": [
    { "type": "required" },
    { "type": "min", "value": 0 },
    { "type": "max", "value": 100 }
  ],
  "displayConfig": {
    "label": "Оценка лида",
    "description": "Оценка качества лида от 0 до 100"
  }
}
```

### 3. Тестировать валидацию
Создать lead с невалидными данными - должна вернуться ошибка 400.

## Статус
✅ **Завершено** - Дополнительные поля реализованы для всех сущностей (Contact, Lead, Deal, Company)

## Следующие шаги (опционально)
1. Добавить UI для управления custom fields на фронтенде
2. Добавить поиск и фильтрацию по custom fields
3. Добавить импорт/экспорт определений полей
4. Добавить шаблоны наборов полей для разных отраслей
