# Использование date-fns для Форматирования Дат

## Обзор

Интегрирована библиотека **date-fns** с **русской локалью** для корректного отображения дат в человекочитаемом формате.

---

## 📦 Установка

```bash
npm install date-fns
```

---

## 🎯 Используемые Функции

### 1. `format()` - Форматирование даты

**Описание:** Преобразует дату в заданный формат с учетом локали

**Синтаксис:**
```typescript
format(date: Date, formatString: string, options: { locale: Locale })
```

**Примеры форматов:**
- `"d MMMM yyyy"` → "22 октября 2025"
- `"d MMMM yyyy 'в' HH:mm"` → "22 октября 2025 в 15:45"
- `"dd.MM.yyyy"` → "22.10.2025"
- `"EEEE, d MMMM"` → "среда, 22 октября"

### 2. `formatDistanceToNow()` - Относительное время

**Описание:** Показывает сколько времени прошло/осталось относительно текущего момента

**Синтаксис:**
```typescript
formatDistanceToNow(date: Date, options: { addSuffix: boolean, locale: Locale })
```

**Примеры:**
- `addSuffix: true` → "2 часа назад", "через 5 минут"
- `addSuffix: false` → "2 часа", "5 минут"

---

## 💻 Реализация

### task-form.component.ts

```typescript
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export class TaskFormComponent {
  // Форматирование даты в человеческом виде
  formatDate(date: Date | null): string {
    if (!date) return '';
    try {
      return format(date, "d MMMM yyyy 'в' HH:mm", { locale: ru });
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toLocaleString('ru-RU');
    }
  }
}
```

**HTML:**
```html
<span class="deadline-value">{{ formatDate(calculatedDueDate) }}</span>
```

**Результат:** "22 октября 2025 в 15:45"

---

### task-list.component.ts

```typescript
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';

export class TaskListComponent {
  // Форматирование даты (короткий вариант)
  formatDateHuman(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return format(date, "d MMMM yyyy", { locale: ru });
    } catch (error) {
      return dateStr;
    }
  }

  // Форматирование относительного времени
  formatRelativeTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale: ru });
    } catch (error) {
      return '';
    }
  }
}
```

**HTML:**
```html
<div class="date-value">{{ formatDateHuman(task.dueDate) }}</div>
```

**Результат:** "22 октября 2025"

---

### task-detail.component.ts

```typescript
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export class TaskDetailComponent {
  // Форматирование даты с временем
  formatDateHuman(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return format(date, "d MMMM yyyy 'в' HH:mm", { locale: ru });
    } catch (error) {
      return dateStr;
    }
  }

  // Форматирование относительного времени
  formatRelativeTime(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale: ru });
    } catch (error) {
      return '';
    }
  }
}
```

**HTML (дедлайн):**
```html
<div class="due-date-value">{{ formatDateHuman(task()?.dueDate) }}</div>
```

**Результат:** "22 октября 2025 в 15:45"

**HTML (комментарии):**
```html
<span class="comment-date">{{ formatRelativeTime(comment.createdAt) }}</span>
```

**Результат:** "2 часа назад"

---

## 🎨 Примеры Форматов

### Полная дата с временем
```typescript
format(date, "d MMMM yyyy 'в' HH:mm", { locale: ru })
// → "22 октября 2025 в 15:45"
```

### Дата без времени
```typescript
format(date, "d MMMM yyyy", { locale: ru })
// → "22 октября 2025"
```

### День недели и дата
```typescript
format(date, "EEEE, d MMMM", { locale: ru })
// → "среда, 22 октября"
```

### Короткий формат
```typescript
format(date, "dd.MM.yyyy", { locale: ru })
// → "22.10.2025"
```

### Относительное время
```typescript
formatDistanceToNow(date, { addSuffix: true, locale: ru })
// → "2 часа назад"
// → "через 5 минут"
// → "около 1 месяца назад"
```

---

## 📊 Где Используется

### 1. task-form.component

**Компонент:** Форма создания/редактирования задачи  
**Место:** Карточка автоматически рассчитанного дедлайна  
**Формат:** `"d MMMM yyyy 'в' HH:mm"`  
**Пример:** "22 октября 2025 в 15:45"

---

### 2. task-list.component

**Компонент:** Список задач  
**Место:** Колонка "Срок" в таблице  
**Формат:** `"d MMMM yyyy"`  
**Пример:** "22 октября 2025"

---

### 3. task-detail.component

**Компонент:** Детальный просмотр задачи  
**Места:**
1. **Срок выполнения:** `"d MMMM yyyy 'в' HH:mm"` → "22 октября 2025 в 15:45"
2. **Дата создания:** `"d MMMM yyyy 'в' HH:mm"` → "22 октября 2025 в 10:30"
3. **Комментарии:** `formatDistanceToNow()` → "2 часа назад"

---

## 🌍 Локализация

### Русская локаль (ru)

Импортируется из `date-fns/locale`:

```typescript
import { ru } from 'date-fns/locale';
```

**Что локализуется:**
- ✅ Названия месяцев: "январь", "февраль", "октябрь"
- ✅ Дни недели: "понедельник", "среда", "пятница"
- ✅ Относительное время: "назад", "через", "около"
- ✅ Единицы времени: "часа", "минут", "дней", "месяца"

---

## ⚙️ Обработка Ошибок

Все методы обернуты в `try-catch`:

```typescript
formatDate(date: Date | null): string {
  if (!date) return '';
  try {
    return format(date, "d MMMM yyyy 'в' HH:mm", { locale: ru });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toLocaleString('ru-RU'); // Fallback
  }
}
```

**Fallback стратегии:**
- Если `date-fns` не может отформатировать → используется `toLocaleString('ru-RU')`
- Если дата `null/undefined` → возвращается пустая строка
- Ошибки логируются в консоль для отладки

---

## 🎯 Преимущества date-fns

### ✅ vs Angular DatePipe

| Критерий | date-fns | Angular DatePipe |
|----------|----------|------------------|
| **Локализация** | Полная, гибкая | Ограниченная |
| **Размер** | Tree-shakable, ~2KB | Включен в Angular |
| **Форматы** | Более богатые | Базовые |
| **Относительное время** | Встроено (`formatDistanceToNow`) | Требует кастомный pipe |
| **TypeScript** | Полная типизация | Типизировано |
| **Использование** | Методы компонента | Pipe в шаблоне |

### ✅ Преимущества:

- 🎨 **Более читаемые форматы:** "22 октября" вместо "22.10"
- 🌍 **Правильная локализация:** склонения, падежи
- ⏱️ **Относительное время:** "2 часа назад" автоматически
- 🔧 **Гибкость:** любые кастомные форматы
- 📦 **Модульность:** импортируются только нужные функции

---

## 📝 Примеры Использования

### Пример 1: Дедлайн задачи

**Вход:** ISO string "2025-10-22T15:45:00.000Z"  
**Выход:** "22 октября 2025 в 15:45"

```typescript
formatDate(new Date("2025-10-22T15:45:00.000Z"))
```

---

### Пример 2: Список задач

**Вход:** ISO string "2025-10-25T10:00:00.000Z"  
**Выход:** "25 октября 2025"

```typescript
formatDateHuman("2025-10-25T10:00:00.000Z")
```

---

### Пример 3: Комментарий

**Вход:** ISO string "2025-10-22T13:30:00.000Z" (текущее время: 15:30)  
**Выход:** "2 часа назад"

```typescript
formatRelativeTime("2025-10-22T13:30:00.000Z")
```

---

### Пример 4: Будущая дата

**Вход:** ISO string "2025-10-23T10:00:00.000Z" (завтра)  
**Выход:** "через 1 день"

```typescript
formatDistanceToNow(new Date("2025-10-23T10:00:00.000Z"), { 
  addSuffix: true, 
  locale: ru 
})
```

---

## 🧪 Тестирование

### Чеклист:

- [ ] Даты отображаются на русском языке
- [ ] Формат "d MMMM yyyy" работает корректно
- [ ] Формат "d MMMM yyyy 'в' HH:mm" работает корректно
- [ ] Относительное время обновляется корректно
- [ ] Склонения правильные ("2 часа", "5 минут")
- [ ] Fallback на toLocaleString при ошибках
- [ ] Пустые даты обрабатываются корректно
- [ ] Комментарии показывают относительное время
- [ ] Дедлайны показывают полную дату с временем

---

**Версия:** 1.0  
**Дата:** 22 октября 2025  
**Статус:** ✅ Готово
