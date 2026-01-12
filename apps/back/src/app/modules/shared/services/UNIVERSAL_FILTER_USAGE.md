# Universal Filter Service

Универсальный сервис для применения фильтров к TypeORM query builders. Поддерживает как статические поля сущностей, так и кастомные поля в JSONB колонках.

## Использование

### 1. В модуле

Импортируйте `SharedModule`:

```typescript
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    // ... другие импорты
    SharedModule,
  ],
  // ...
})
export class YourModule {}
```

### 2. В сервисе

Инжектируйте `UniversalFilterService` и определите маппинг статических полей:

```typescript
import { UniversalFilterService } from '../shared/services/universal-filter.service';

@Injectable()
export class YourService {
  // Маппинг полей фронтенда на колонки базы данных
  private readonly staticFieldsMap: Record<string, string> = {
    name: 'entity.name',
    email: 'entity.email',
    createdAt: 'entity.createdAt',
    // ... другие поля
  };

  constructor(
    @InjectRepository(YourEntity)
    private readonly repository: Repository<YourEntity>,
    private readonly universalFilterService: UniversalFilterService,
  ) {}

  async searchWithFilters(dto: AdvancedSearchDto): Promise<{ data: YourEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.relation', 'relation');

    // Применяем фильтры
    if (dto.filters && dto.filters.length > 0) {
      this.universalFilterService.applyFilters(
        qb,
        dto.filters,
        'entity',              // алиас сущности в запросе
        this.staticFieldsMap,  // маппинг статических полей
        'customFields'         // название JSONB колонки (опционально, по умолчанию 'customFields')
      );
    }

    const total = await qb.getCount();
    const data = await qb.getMany();

    return { data, total };
  }
}
```

### 3. DTO

Используйте базовый DTO или расширьте его:

```typescript
import { BaseAdvancedSearchDto } from '../../shared/dto/universal-filter.dto';

export class AdvancedSearchDto extends BaseAdvancedSearchDto {
  // Можно добавить специфичные для сущности параметры
}

// Реэкспортируйте для удобства
export { UniversalFilterDto } from '../../shared/dto/universal-filter.dto';
```

### 4. Контроллер

```typescript
import { AdvancedSearchDto } from './dto/advanced-search.dto';

@Post('advanced-search')
async advancedSearch(@Body() dto: AdvancedSearchDto) {
  return this.service.searchWithFilters(dto);
}
```

## Поддерживаемые операторы

### Текстовые поля
- `equals` - точное совпадение
- `not_equals` - не равно
- `contains` - содержит подстроку
- `not_contains` - не содержит подстроку
- `starts_with` - начинается с
- `ends_with` - заканчивается на

### Числовые и даты
- `greater` - больше
- `less` - меньше
- `between` - между двумя значениями (value должен быть массивом из 2 элементов)

### Списки
- `in` - входит в список (value должен быть массивом)
- `not_in` - не входит в список (value должен быть массивом)

### Существование
- `exists` - поле существует и не NULL

## Примеры фильтров

### Статическое поле (текст)
```json
{
  "fieldType": "static",
  "fieldName": "email",
  "fieldLabel": "Email",
  "operator": "contains",
  "value": "@example.com"
}
```

### Статическое поле (число)
```json
{
  "fieldType": "static",
  "fieldName": "age",
  "fieldLabel": "Возраст",
  "operator": "greater",
  "value": 18
}
```

### Кастомное поле (select)
```json
{
  "fieldType": "custom",
  "fieldName": "customer_type",
  "fieldLabel": "Тип клиента",
  "operator": "equals",
  "value": "vip"
}
```

### Кастомное поле (дата между)
```json
{
  "fieldType": "custom",
  "fieldName": "registration_date",
  "fieldLabel": "Дата регистрации",
  "operator": "between",
  "value": ["2024-01-01", "2024-12-31"]
}
```

## Полный пример запроса

```json
{
  "search": "john",
  "isActive": true,
  "filters": [
    {
      "fieldType": "static",
      "fieldName": "email",
      "fieldLabel": "Email",
      "operator": "contains",
      "value": "@example.com"
    },
    {
      "fieldType": "custom",
      "fieldName": "customer_type",
      "fieldLabel": "Тип клиента",
      "operator": "equals",
      "value": "vip"
    }
  ],
  "page": 1,
  "pageSize": 50
}
```

## Интеграция в другие модули

Сервис готов к использованию в:
- ✅ **Контакты** (contacts) - уже интегрировано
- ⏳ **Лиды** (leads) - требуется интеграция
- ⏳ **Компании** (companies) - требуется интеграция
- ⏳ **Сделки** (deals) - требуется интеграция

### Пример для Leads

```typescript
// leads.service.ts
private readonly staticFieldsMap: Record<string, string> = {
  status: 'lead.status',
  source: 'lead.source',
  email: 'lead.email',
  phone: 'lead.phone',
  assignedTo: 'lead.assignedTo',
  createdAt: 'lead.createdAt',
};

async searchLeadsWithFilters(dto: LeadAdvancedSearchDto): Promise<{ data: Lead[]; total: number }> {
  const qb = this.leadRepository
    .createQueryBuilder('lead')
    .leftJoinAndSelect('lead.company', 'company');

  if (dto.filters && dto.filters.length > 0) {
    this.universalFilterService.applyFilters(
      qb,
      dto.filters,
      'lead',
      this.staticFieldsMap
    );
  }

  // ... пагинация и возврат результатов
}
```

## Важные особенности

1. **Регистр PostgreSQL**: Колонка `customFields` заключена в двойные кавычки для сохранения регистра
2. **JSONB операторы**: Используется `->>` для извлечения текстового значения, `?` для проверки существования ключа
3. **Приведение типов**: Для числовых операций с JSONB используется `::numeric`
4. **Уникальность параметров**: Каждый фильтр получает уникальный префикс для параметров (`filter0`, `filter1`, ...)
5. **Валидация**: DTO использует class-validator для проверки типов и значений

## Расширение

Для добавления нового оператора:

1. Добавьте его в валидацию в `universal-filter.dto.ts`
2. Реализуйте логику в `applyOperator()` и `applyCustomFieldFilter()` методах `UniversalFilterService`
