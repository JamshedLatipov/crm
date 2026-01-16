# Исправление проблемы с PATCH запросами для шаблонов

**Дата:** 7 января 2026 г.  
**Ветка:** fix/small-bugs

## Проблема

При попытке обновить Telegram шаблон возникала ошибка:
```
PATCH http://localhost:3000/api/messages/telegram/templates/:id 404 (Not Found)
```

Frontend отправлял PATCH запросы, но backend возвращал 404 Not Found.

## Причина

В контроллерах шаблонов были следующие проблемы:

### 1. Telegram Template Controller
Использовались **оба декоратора на одном методе**:
```typescript
@Put(':id')
@Patch(':id')
async update(@Param('id') id: string, @Body() dto: UpdateTelegramTemplateDto) {
  // ...
}
```

**Проблема:** В NestJS когда используются оба декоратора `@Put` и `@Patch` на одном методе, регистрируется только первый (`@Put`). Второй декоратор игнорируется.

### 2. Email и SMS Template Controllers
Использовали только `@Put`:
```typescript
@Put(':id')
async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
  // ...
}
```

**Проблема:** Frontend отправлял PATCH запросы, но backend поддерживал только PUT.

### 3. WhatsApp Template Controller
✅ Уже правильно использовал только `@Patch(':id')`

## Решение

Добавлены **два отдельных метода** для каждого типа запроса:
- `patch()` - для PATCH запросов (частичное обновление)
- `update()` - для PUT запросов (полное обновление)

Оба метода вызывают один и тот же сервисный метод `service.update()`.

### Telegram Template Controller

```typescript
@Patch(':id')
@ApiOperation({ summary: 'Обновить Telegram шаблон (частичное обновление)' })
@ApiResponse({ status: 200, description: 'Шаблон обновлен' })
@ApiResponse({ status: 404, description: 'Шаблон не найден' })
async patch(@Param('id') id: string, @Body() dto: UpdateTelegramTemplateDto) {
  if (dto.content) {
    const validation = this.renderService.validateTemplate(dto.content);
    if (!validation.valid) {
      throw new Error(`Invalid variables: ${validation.invalidVariables.join(', ')}`);
    }
  }
  return this.templateService.update(id, dto as any);
}

@Put(':id')
@ApiOperation({ summary: 'Обновить Telegram шаблон (полное обновление)' })
@ApiResponse({ status: 200, description: 'Шаблон обновлен' })
@ApiResponse({ status: 404, description: 'Шаблон не найден' })
async update(@Param('id') id: string, @Body() dto: UpdateTelegramTemplateDto) {
  if (dto.content) {
    const validation = this.renderService.validateTemplate(dto.content);
    if (!validation.valid) {
      throw new Error(`Invalid variables: ${validation.invalidVariables.join(', ')}`);
    }
  }
  return this.templateService.update(id, dto as any);
}
```

### Email Template Controller

```typescript
@Patch(':id')
@ApiOperation({ summary: 'Обновить шаблон email (частичное обновление)' })
@ApiResponse({ status: 200, description: 'Шаблон обновлён' })
@ApiResponse({ status: 404, description: 'Шаблон не найден' })
async patch(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
  return this.emailTemplateService.update(id, dto);
}

@Put(':id')
@ApiOperation({ summary: 'Обновить шаблон email (полное обновление)' })
@ApiResponse({ status: 200, description: 'Шаблон обновлён' })
@ApiResponse({ status: 404, description: 'Шаблон не найден' })
async update(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
  return this.emailTemplateService.update(id, dto);
}
```

### SMS Template Controller

```typescript
@Patch(':id')
@ApiOperation({ summary: 'Обновить шаблон (частичное обновление)' })
@ApiResponse({ status: 200, description: 'Шаблон успешно обновлён' })
@ApiResponse({ status: 404, description: 'Шаблон не найден' })
async patch(@Param('id') id: string, @Body() updateDto: UpdateTemplateDto) {
  return this.templateService.update(id, updateDto);
}

@Put(':id')
@ApiOperation({ summary: 'Обновить шаблон (полное обновление)' })
@ApiResponse({ status: 200, description: 'Шаблон успешно обновлён' })
@ApiResponse({ status: 404, description: 'Шаблон не найден' })
async update(@Param('id') id: string, @Body() updateDto: UpdateTemplateDto) {
  return this.templateService.update(id, updateDto);
}
```

## Измененные файлы

### Backend Controllers
- `/apps/back/src/app/modules/messages/controllers/telegram-template.controller.ts`
  - Добавлен импорт `Patch` (уже был)
  - Разделены методы `patch()` и `update()`
  
- `/apps/back/src/app/modules/messages/controllers/email-template.controller.ts`
  - Добавлен импорт `Patch`
  - Добавлен метод `patch()`
  
- `/apps/back/src/app/modules/messages/controllers/sms-template.controller.ts`
  - Добавлен импорт `Patch`
  - Добавлен метод `patch()`

## Тестирование

### Проверка PATCH запросов
```bash
# Telegram Template
curl -X PATCH http://localhost:3000/api/messages/telegram/templates/:id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Updated Name"}'

# Email Template
curl -X PATCH http://localhost:3000/api/messages/email/templates/:id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"subject": "Updated Subject"}'

# SMS Template
curl -X PATCH http://localhost:3000/api/messages/sms/templates/:id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"content": "Updated Content"}'
```

### Проверка PUT запросов
```bash
# Аналогично, заменив PATCH на PUT
curl -X PUT http://localhost:3000/api/messages/telegram/templates/:id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Updated Name", ...}'
```

### Ожидаемый результат
- ✅ PATCH запросы возвращают 200 OK (или 401 Unauthorized если нет токена)
- ✅ PUT запросы возвращают 200 OK (или 401 Unauthorized если нет токена)
- ❌ НЕ возвращают 404 Not Found

## Семантика HTTP методов

### PATCH (частичное обновление)
- Используется для обновления **отдельных полей** ресурса
- Можно отправить только измененные поля
- Не требует отправки всех обязательных полей

### PUT (полное обновление)
- Используется для **замены всего** ресурса
- Требует отправки всех полей (или используются значения по умолчанию)
- Более строгий подход

## Примечания

1. **Frontend использует PATCH** для всех обновлений шаблонов, что является правильным подходом для частичных обновлений.

2. **Оба метода вызывают один service метод** - `service.update()`, так как в текущей реализации нет различий между частичным и полным обновлением.

3. **WhatsApp Template Controller** не требовал исправлений, так как уже правильно использовал `@Patch`.

4. **Важно:** В NestJS нельзя использовать несколько HTTP декораторов на одном методе. Каждый HTTP метод должен иметь свой отдельный метод контроллера.

## Компиляция

Все контроллеры скомпилированы без ошибок:
- ✅ Telegram Template Controller
- ✅ Email Template Controller
- ✅ SMS Template Controller
- ✅ WhatsApp Template Controller (не изменялся)
