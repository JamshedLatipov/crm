# Исправление проблемы с переменными в шаблонах

**Дата:** 7 января 2026 г.  
**Ветка:** fix/small-bugs

## Проблема

При редактировании шаблонов (WhatsApp, Telegram, SMS, Email) переменные пропадали. Компоненты заново извлекали переменные только из текстового контента при сохранении, что могло приводить к потере данных из поля `variables`.

**Дополнительная проблема:** Регулярное выражение `/\{\{(\w+)\}\}/g` не находило переменные с точками, такие как `{{contact.name}}` или `{{contact.email}}`, поддерживались только простые переменные вида `{{name}}`.

## Решение

Применены исправления ко всем четырем типам шаблонов:
- ✅ WhatsApp Templates
- ✅ Telegram Templates
- ✅ SMS Templates
- ✅ Email Templates

### Изменения в каждом компоненте

#### 1. Исправлено регулярное выражение для поиска переменных

**Было:**
```typescript
const regex = /\{\{(\w+)\}\}/g; // Находит только {{name}}, НЕ находит {{contact.name}}
```

**Стало:**
```typescript
// Регулярное выражение для поиска переменных вида {{name}} или {{contact.name}}
const regex = /\{\{([\w.]+)\}\}/g; // Теперь находит и {{name}}, и {{contact.name}}
```

Изменение `\w+` на `[\w.]+` позволяет находить переменные с точками (nested properties).

#### 2. Новые сигналы для отслеживания переменных

```typescript
existingVariables = signal<string[]>([]); // Храним переменные из загруженного шаблона
currentContent = signal<string>(''); // Отслеживаем текущий контент
detectedVariables = computed(() => {
  const content = this.currentContent();
  return this.extractVariables(content);
});
```

#### 3. Инициализация начального значения контента

**Критично!** Добавлена инициализация `currentContent` при запуске:

```typescript
ngOnInit() {
  this.initForm();
  
  // Устанавливаем начальное значение
  this.currentContent.set(this.form.get('content')?.value || '');
  
  // Подписываемся на изменения контента для обновления сигнала
  this.form.get('content')?.valueChanges.subscribe((value) => {
    this.currentContent.set(value || '');
  });
  
  // ...
}
```

Без этой инициализации `detectedVariables()` всегда возвращал пустой массив при первой загрузке.

#### 4. Сохранение существующих переменных при загрузке

При загрузке шаблона для редактирования:
```typescript
// Сохраняем существующие переменные из шаблона
if (template.variables && template.variables.length > 0) {
  this.existingVariables.set(template.variables);
}
// Обновляем сигнал контента
this.currentContent.set(template.content);
```

**Для Email Templates** (использует `Record<string, string>`):
```typescript
// Преобразуем Record в массив ключей
if (template.variables && Object.keys(template.variables).length > 0) {
  this.existingVariables.set(Object.keys(template.variables));
}
```

#### 5. Объединение переменных при сохранении

```typescript
// Извлекаем переменные из контента
const extractedVariables = this.extractVariables(content);

// Объединяем существующие и новые переменные (без дубликатов)
const allVariables = [...new Set([
  ...this.existingVariables(), 
  ...extractedVariables
])];

// Используем объединенный список в DTO
const dto = {
  // ...
  variables: allVariables,
  // ...
};
```

#### 6. Визуальное отображение переменных

Добавлена секция, которая показывает все обнаруженные переменные в реальном времени:

```html
@if (detectedVariables().length > 0) {
  <div class="detected-variables">
    <h4>
      <mat-icon>code</mat-icon>
      Обнаруженные переменные в шаблоне:
    </h4>
    <div class="variables-list">
      @for (variable of detectedVariables(); track variable) {
        <mat-chip>{{'{{'}}{{ variable }}{{'}}'}}</mat-chip>
      }
    </div>
  </div>
}
```

#### 7. Стили для отображения переменных

```scss
.detected-variables {
  margin: 16px 0;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  border-left: 4px solid #1976d2;

  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 500;
    color: #333;
    display: flex;
    align-items: center;
    gap: 8px;

    mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #1976d2;
    }
  }

  .variables-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    mat-chip {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      background-color: white;
      border: 1px solid #1976d2;
      color: #1976d2;
      padding: 4px 12px;
      border-radius: 16px;
    }
  }
}
```

## Измененные файлы

### WhatsApp Templates
- `/apps/front/src/app/messages/components/whatsapp-templates/whatsapp-template-form/whatsapp-template-form.component.ts`
- `/apps/front/src/app/messages/components/whatsapp-templates/whatsapp-template-form/whatsapp-template-form.component.html`
- `/apps/front/src/app/messages/components/whatsapp-templates/whatsapp-template-form/whatsapp-template-form.component.scss`

### Telegram Templates
- `/apps/front/src/app/messages/components/telegram-templates/telegram-template-form/telegram-template-form.component.ts`
- `/apps/front/src/app/messages/components/telegram-templates/telegram-template-form/telegram-template-form.component.html`
- `/apps/front/src/app/messages/components/telegram-templates/telegram-template-form/telegram-template-form.component.scss`

### SMS Templates
- `/apps/front/src/app/messages/components/sms-templates/sms-template-form/sms-template-form.component.ts`

### Email Templates
- `/apps/front/src/app/messages/components/email-templates/email-template-form/email-template-form.component.ts`
- `/apps/front/src/app/messages/components/email-templates/email-template-form/email-template-form.component.html`
- `/apps/front/src/app/messages/components/email-templates/email-template-form/email-template-form.component.scss`

## Технические детали

### Использованные технологии
- **Signals**: Реактивные сигналы Angular для отслеживания состояния
- **Computed Signals**: Автоматический пересчет переменных при изменении контента
- **MatChipsModule**: Визуальное отображение переменных в виде чипсов
- **RxJS Subscriptions**: Подписка на изменения контента формы

### Особенности реализации

#### Для компонентов с одним полем контента (WhatsApp, Telegram, SMS)
```typescript
// Подписываемся на изменения одного поля
this.form.get('content')?.valueChanges.subscribe((value) => {
  this.currentContent.set(value || '');
});
```

#### Для Email Templates (несколько полей с контентом)
```typescript
// Подписываемся на изменения нескольких полей
this.form.get('subject')?.valueChanges.subscribe(() => this.updateContentSignal());
this.form.get('htmlContent')?.valueChanges.subscribe(() => this.updateContentSignal());
this.form.get('textContent')?.valueChanges.subscribe(() => this.updateContentSignal());

// Объединяем все поля
updateContentSignal() {
  const subject = this.form.get('subject')?.value || '';
  const htmlContent = this.form.get('htmlContent')?.value || '';
  const textContent = this.form.get('textContent')?.value || '';
  this.currentContent.set(subject + ' ' + htmlContent + ' ' + textContent);
}
```

## Результат

Теперь переменные:
- ✅ **Сохраняются при редактировании** - не теряются из исходного шаблона
- ✅ **Отображаются в реальном времени** - пользователь видит все переменные
- ✅ **Автоматически обновляются** - при изменении контента
- ✅ **Объединяются корректно** - новые + существующие без дубликатов
- ✅ **Визуально выделены** - красивое отображение с использованием Material Chips

## Тестирование

### Что проверить:
1. Создать новый шаблон с переменными `{{name}}`, `{{email}}`
2. Сохранить шаблон
3. Открыть шаблон на редактирование
4. Изменить другие поля (название, категорию)
5. Сохранить шаблон
6. Проверить, что переменные сохранились
7. Добавить новую переменную `{{phone}}`
8. Проверить, что все три переменные сохранились

### Ожидаемый результат:
- Все переменные отображаются в разделе "Обнаруженные переменные"
- При редактировании не теряются старые переменные
- Новые переменные добавляются к существующим
- Дубликаты автоматически удаляются

## Компиляция

Все компоненты скомпилированы без ошибок:
- ✅ SMS Template Form
- ✅ Telegram Template Form  
- ✅ WhatsApp Template Form
- ✅ Email Template Form
