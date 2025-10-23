# Исправление отображения просроченных дедлайнов

## Проблема
Когда дедлайн проходил (становился просроченным), задача неправильно отображалась в зоне предупреждения/напоминания вместо состояния "Просрочено".

## Причина
При проверке зон (SLA, предупреждение, напоминание) не было проверки, что дедлайн еще не прошел. 

**Пример:**
```typescript
// Было
if (settings.warningBeforeDeadline && diffMinutes < settings.warningBeforeDeadline) {
  return 'due-date-warning-zone';
}

// Если дедлайн прошел 10 минут назад:
// diffMinutes = -10
// settings.warningBeforeDeadline = 120 (2 часа)
// -10 < 120 = true ❌ (неправильно срабатывает!)
```

## Решение
Добавлена проверка `diffMinutes > 0` - дедлайн еще не прошел:

```typescript
// Стало
if (settings.warningBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.warningBeforeDeadline) {
  return 'due-date-warning-zone';
}

// Если дедлайн прошел 10 минут назад:
// diffMinutes = -10
// diffMinutes > 0 = false ❌ (не срабатывает, идем дальше)
// Переходим к стандартной логике: diffDays < 0 → 'due-date-overdue' ✅
```

## Затронутые методы

### 1. getDueDateClass()
Определяет CSS класс для визуализации дедлайна.

**Зоны с исправлением:**
- `due-date-sla-warning` - критичное время SLA
- `due-date-warning-zone` - зона предупреждения
- `due-date-reminder` - зона напоминания

### 2. getDueDateIcon()
Определяет иконку для индикатора дедлайна.

**Иконки с исправлением:**
- `flash_on` - SLA критично
- `warning_amber` - предупреждение
- `notifications_active` - напоминание

## Поведение до исправления

**Дедлайн прошел 10 минут назад, зона предупреждения = 2 часа:**
- Класс: `due-date-warning-zone` (янтарный) ❌
- Иконка: `warning_amber` ❌
- Текст: "10 мин назад" ❌
- **Результат:** Выглядит как предупреждение, хотя уже просрочено

## Поведение после исправления

**Дедлайн прошел 10 минут назад:**
- Проверка зон: `diffMinutes > 0` = false → пропускаются
- Переход к стандартной логике: `diffDays < 0` = true
- Класс: `due-date-overdue` (красный) ✅
- Иконка: `error` ✅
- Текст: "Просрочено на X дней/часов" ✅
- **Результат:** Корректно показывает просроченное состояние

## Логика приоритетов

1. **Задача завершена** (`status === 'done'`)
   - Проверяем опоздание при закрытии
   - → `due-date-done` или `due-date-done-late`

2. **Дедлайн еще не наступил** (`diffMinutes > 0`)
   - Проверяем зоны типа задачи (SLA, предупреждение, напоминание)
   - → специальные классы зон

3. **Дедлайн прошел** (`diffMinutes <= 0`)
   - Стандартная логика
   - → `due-date-overdue`

## Примеры

### До дедлайна 30 минут, предупреждение = 2 часа
- `diffMinutes = 30`
- `diffMinutes > 0` ✅ AND `30 < 120` ✅
- → `due-date-warning-zone` (корректно)

### После дедлайна 30 минут, предупреждение = 2 часа
- `diffMinutes = -30`
- `diffMinutes > 0` ❌
- → Пропускаем зоны
- → `due-date-overdue` (корректно)

### До дедлайна 5 минут, SLA = 30 минут
- `diffMinutes = 5`
- `diffMinutes > 0` ✅ AND `5 < 30` ✅
- → `due-date-sla-warning` (корректно)

### После дедлайна 5 минут, SLA = 30 минут
- `diffMinutes = -5`
- `diffMinutes > 0` ❌
- → Пропускаем зоны, включая SLA
- → `due-date-overdue` (корректно)

## Файлы

### task-list.component.ts
- `getDueDateClass()` - строка ~257
- `getDueDateIcon()` - строка ~304

### task-detail.component.ts
- `getDueDateClass()` - строка ~233
- `getDueDateIcon()` - строка ~283

## Изменения

```typescript
// До
if (settings.slaResponseTime && diffMinutes < settings.slaResponseTime)
if (settings.warningBeforeDeadline && diffMinutes < settings.warningBeforeDeadline)
if (settings.reminderBeforeDeadline && diffMinutes < settings.reminderBeforeDeadline)

// После
if (settings.slaResponseTime && diffMinutes > 0 && diffMinutes < settings.slaResponseTime)
if (settings.warningBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.warningBeforeDeadline)
if (settings.reminderBeforeDeadline && diffMinutes > 0 && diffMinutes < settings.reminderBeforeDeadline)
```

## Улучшения
✅ Просроченные задачи всегда показывают статус "Просрочено"  
✅ Зоны (SLA, предупреждение, напоминание) активны только до дедлайна  
✅ Корректная визуализация с правильным цветом и иконкой  
✅ Логика применена ко всем зонам и компонентам  
✅ Консистентность между list и detail компонентами
