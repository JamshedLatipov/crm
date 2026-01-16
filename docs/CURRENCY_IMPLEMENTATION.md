# Динамическая валюта в CRM

## ✅ Реализовано

Система теперь поддерживает динамическую настройку валюты через UI без необходимости изменения кода.

### Что добавлено:

#### 1. **Backend (NestJS)**
- ✅ Категория `CURRENCY` в `SettingCategory` enum
- ✅ Настройки по умолчанию:
  - `DEFAULT_CURRENCY` (по умолчанию: 'RUB')
  - `CURRENCY_SYMBOL` (по умолчанию: '₽')
- ✅ API endpoints для управления валютой через `/messages/settings`

#### 2. **Frontend Services**
- ✅ **CurrencyService** (`apps/front/src/app/services/currency.service.ts`)
  - Глобальный сервис для кэширования настроек валюты
  - Автоматическая загрузка при инициализации
  - Метод `reload()` для принудительного обновления
  - Signals для реактивного доступа: `currencySymbol()`, `currencyCode()`

#### 3. **Frontend Pipes**
- ✅ **CurrencySymbolPipe** (`apps/front/src/app/shared/pipes/currency-symbol.pipe.ts`)
  - Использование: `{{ 'label' | currencySymbol }}`
  - Результат: "label ₽" (или другой символ из настроек)

- ✅ **CurrencyFormatPipe** (`apps/front/src/app/shared/pipes/currency-format.pipe.ts`)
  - Использование: `{{ 100.50 | currencyFormat }}`
  - Результат: "100.50 ₽" (или другой символ из настроек)

#### 4. **Интеграция в компоненты**
- ✅ `campaign-form.component` - динамическое отображение стоимости
- ✅ `campaign-wizard.component` - динамическое отображение стоимости
- ✅ `pages/settings` - labels с динамической валютой

#### 5. **Поддерживаемые валюты**
- RUB (₽) - Российский рубль
- USD ($) - Доллар США
- EUR (€) - Евро
- TJS (SM) - Таджикский сомони
- KZT (₸) - Казахский тенге
- KGS (с) - Киргизский сом
- UZS (so'm) - Узбекский сум

## 📝 Использование

### Для пользователей:

1. **Изменение валюты:**
   ```
   1. Откройте /settings
   2. Перейдите на вкладку "Валюта"
   3. Измените "Код валюты" и "Символ валюты"
   4. Нажмите "Сохранить"
   5. Обновите страницу - валюта изменится во всей системе!
   ```

2. **Примеры настройки:**
   - Для рублей: Код=`RUB`, Символ=`₽`
   - Для долларов: Код=`USD`, Символ=`$`
   - Для евро: Код=`EUR`, Символ=`€`
   - Для сомони: Код=`TJS`, Символ=`SM`
   - Для тенге: Код=`KZT`, Символ=`₸`
   - Для сома: Код=`KGS`, Символ=`с`
   - Для сума: Код=`UZS`, Символ=`so'm`

### Для разработчиков:

1. **Использование в новых компонентах:**

```typescript
// В TypeScript файле
import { CurrencyService } from '@crm/front/services/currency.service';
import { CurrencyFormatPipe } from '@crm/front/shared/pipes/currency-format.pipe';

@Component({
  // ...
  imports: [CurrencyFormatPipe],
})
export class MyComponent {
  constructor(public currencyService: CurrencyService) {}
  
  // Получить символ валюты
  getSymbol() {
    return this.currencyService.getSymbol(); // '₽'
  }
  
  // Получить код валюты
  getCode() {
    return this.currencyService.getCode(); // 'RUB'
  }
}
```

```html
<!-- В HTML шаблоне -->

<!-- Вариант 1: Только символ -->
<span>{{ '' | currencySymbol }}</span> <!-- ₽ -->

<!-- Вариант 2: Label + символ -->
<span>{{ 'Цена' | currencySymbol }}</span> <!-- Цена ₽ -->

<!-- Вариант 3: Форматирование суммы -->
<span>{{ 100.50 | currencyFormat }}</span> <!-- 100.50 ₽ -->

<!-- Вариант 4: Сумма без символа -->
<span>{{ 100.50 | currencyFormat:false }}</span> <!-- 100.50 -->
```

2. **Обновление после изменения настроек:**

```typescript
// После сохранения настроек валюты
this.currencyService.reload();
```

## 🔧 Технические детали

### Архитектура:

```
┌─────────────────────────────────────────┐
│  Backend (NestJS)                       │
│  - SettingCategory.CURRENCY             │
│  - DEFAULT_CURRENCY, CURRENCY_SYMBOL    │
└─────────────────────────────────────────┘
                    ↓
                   API
                    ↓
┌─────────────────────────────────────────┐
│  CurrencyService (Frontend)             │
│  - Загрузка настроек при инициализации  │
│  - Кэширование в signals                │
│  - Реактивное обновление                │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Pipes                                  │
│  - CurrencySymbolPipe                   │
│  - CurrencyFormatPipe                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  UI Components                          │
│  - campaign-form                        │
│  - campaign-wizard                      │
│  - settings page                        │
└─────────────────────────────────────────┘
```

### Преимущества:

1. ✅ **Централизованное управление** - одно место для изменения валюты
2. ✅ **Реактивность** - автоматическое обновление при изменении
3. ✅ **Переиспользуемость** - pipes можно использовать в любом компоненте
4. ✅ **Кэширование** - минимум запросов к API
5. ✅ **Типобезопасность** - TypeScript проверяет использование
6. ✅ **Расширяемость** - легко добавить новые валюты

## 🚀 Следующие шаги

Если нужно добавить валюту в другие части системы:

1. Импортируйте `CurrencyFormatPipe` или `CurrencySymbolPipe`
2. Добавьте pipe в imports компонента
3. Используйте в шаблоне: `{{ value | currencyFormat }}`

Готово! 🎉
