# Исправление отображения значений в дополнительных полях

Дата: 12 января 2026 г.

## 🐛 Проблема

При фильтрации по дополнительным полям с типом `select`, значения отображались как `[object Object]` вместо читаемых названий.

## 🔍 Причина

В модели `CustomFieldDefinition` поле `selectOptions` имеет тип `SelectOption[]`, где:

```typescript
export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}
```

Когда мы преобразовывали эти опции для универсального компонента фильтров, использовался код:

```typescript
// ❌ Неправильно
selectOptions: def.selectOptions?.map(opt => ({
  label: String(opt),  // [object Object]
  value: String(opt),  // [object Object]
}))
```

`String(opt)` для объекта возвращает `"[object Object]"`.

## ✅ Решение

Добавлена проверка типа и правильное извлечение полей:

```typescript
// ✅ Правильно
selectOptions: def.selectOptions?.map(opt => {
  // Если opt это объект SelectOption, берем label и value
  if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
    return {
      label: opt.label,
      value: opt.value,
    };
  }
  // Если opt это строка, используем ее как label и value
  return {
    label: String(opt),
    value: String(opt),
  };
})
```

## 📝 Изменённый файл

**`apps/front/src/app/contacts/contacts.component.ts`**

### Метод `openFiltersDialog()`

#### Было:
```typescript
const customFields: FilterFieldDefinition[] = this.customFieldDefinitions().map(def => ({
  name: def.name,
  label: def.label,
  type: def.fieldType as FilterFieldDefinition['type'],
  selectOptions: def.selectOptions?.map(opt => ({
    label: String(opt),
    value: String(opt),
  })),
}));
```

#### Стало:
```typescript
const customFields: FilterFieldDefinition[] = this.customFieldDefinitions().map(def => ({
  name: def.name,
  label: def.label,
  type: def.fieldType as FilterFieldDefinition['type'],
  selectOptions: def.selectOptions?.map(opt => {
    // Если opt это объект SelectOption, берем label и value
    if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
      return {
        label: opt.label,
        value: opt.value,
      };
    }
    // Если opt это строка, используем ее как label и value
    return {
      label: String(opt),
      value: String(opt),
    };
  }),
}));
```

## 🎯 Преимущества решения

1. **Type-safe**: Проверка типа через `typeof` и `in`
2. **Обратная совместимость**: Поддержка как объектов `SelectOption`, так и строк
3. **Правильное отображение**: Используется `opt.label` для отображения, `opt.value` для значения
4. **Цвет сохраняется**: Хотя в универсальном компоненте не используется, структура данных корректна

## 🧪 Тестирование

Теперь при фильтрации по дополнительным полям типа `select`:

### Было:
```
Значение: [object Object] ❌
```

### Стало:
```
Значение: Опция 1 ✅
Значение: Опция 2 ✅
Значение: Опция 3 ✅
```

## 📊 Примеры использования

### Пример 1: SelectOption объекты (основной случай)
```typescript
selectOptions: [
  { value: 'hot', label: 'Горячий', color: '#ff0000' },
  { value: 'warm', label: 'Тёплый', color: '#ff9900' },
  { value: 'cold', label: 'Холодный', color: '#0099ff' }
]

// Преобразуется в:
[
  { label: 'Горячий', value: 'hot' },
  { label: 'Тёплый', value: 'warm' },
  { label: 'Холодный', value: 'cold' }
]
```

### Пример 2: Строковые значения (обратная совместимость)
```typescript
selectOptions: ['Вариант 1', 'Вариант 2', 'Вариант 3']

// Преобразуется в:
[
  { label: 'Вариант 1', value: 'Вариант 1' },
  { label: 'Вариант 2', value: 'Вариант 2' },
  { label: 'Вариант 3', value: 'Вариант 3' }
]
```

## 🔄 Связанные компоненты

Это исправление применимо ко всем местам, где используются `CustomFieldDefinition` с `selectOptions`:

1. ✅ **Contacts** - исправлено
2. ⏳ **Leads** - нужно применить то же исправление при миграции
3. ⏳ **Companies** - нужно применить то же исправление при миграции
4. ⏳ **Deals** - нужно применить то же исправление при миграции

## 💡 Рекомендации

При миграции других модулей на универсальную систему фильтров, использовать ту же логику преобразования:

```typescript
// Универсальный helper для преобразования SelectOption
function convertSelectOptions(options?: SelectOption[]): Array<{label: string, value: string}> {
  return options?.map(opt => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
      return { label: opt.label, value: opt.value };
    }
    return { label: String(opt), value: String(opt) };
  }) || [];
}
```

---

**Автор:** GitHub Copilot  
**Дата:** 12 января 2026 г.  
**Ветка:** feat/contacts-costom-fields

**Статус:** ✅ Исправлено, готово к тестированию
