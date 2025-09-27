# Модуль контактов (Contacts Module)

## Обзор

Модуль контактов предоставляет централизованное управление контактной информацией в CRM системе. Он заменяет встроенные JSON поля в лидах и сделках на полноценную реляционную структуру.

## Основные возможности

### 🎯 **Типы контактов**
- **Физические лица** (`person`) - клиенты, контактные лица
- **Компании** (`company`) - организации, партнеры

### 📊 **Источники контактов**
- Website (веб-сайт)
- Phone (телефонные звонки)
- Email (электронная почта)  
- Referral (рефералы)
- Social Media (социальные сети)
- Advertising (реклама)
- Import (импорт данных)
- Other (другие источники)

### 🔍 **Богатая контактная информация**
- Полное имя (имя, фамилия, отчество)
- Должность и компания
- Множественные телефоны (мобильный, рабочий)
- Email и веб-сайт
- Полный адрес (JSON структура)
- Социальные сети (Telegram, WhatsApp, LinkedIn и др.)
- Теги для категоризации
- Произвольные поля (customFields)

## API Endpoints

### Основные операции
```
GET    /api/contacts              - Список контактов
GET    /api/contacts/:id          - Получить контакт по ID
POST   /api/contacts              - Создать контакт
PATCH  /api/contacts/:id          - Обновить контакт
DELETE /api/contacts/:id          - Удалить контакт
```

### Фильтрация и поиск
```
GET /api/contacts?type=person          - По типу
GET /api/contacts?source=website       - По источнику
GET /api/contacts?assignedTo=userId    - По менеджеру
GET /api/contacts?company=название     - По компании
GET /api/contacts?tag=vip             - По тегу
GET /api/contacts/search?q=запрос     - Поиск
```

### Специальные операции
```
GET    /api/contacts/recent           - Недавние контакты
GET    /api/contacts/inactive         - Неактивные контакты
GET    /api/contacts/stats            - Статистика
GET    /api/contacts/duplicates       - Поиск дубликатов
PATCH  /api/contacts/:id/blacklist    - Добавить в черный список
PATCH  /api/contacts/:id/unblacklist  - Убрать из черного списка
PATCH  /api/contacts/:id/assign       - Назначить менеджера
PATCH  /api/contacts/:id/touch        - Обновить дату контакта
```

## Интеграция с другими модулями

### Связь со сделками
```typescript
// В Deal entity теперь есть:
@Column({ nullable: true })
contactId?: string; // Ссылка на контакт

// Старое поле contact стало deprecated:
@Column('json', { nullable: true })
contact?: { name: string; email?: string; ... }; // Deprecated
```

### Связь с лидами
Лиды также могут ссылаться на контакты для избежания дублирования данных.

## Преимущества архитектуры

### ✅ **Преимущества новой структуры**
1. **Отсутствие дублирования** - один контакт может участвовать в множестве сделок
2. **Целостность данных** - изменения контакта отражаются везде
3. **Богатая функциональность** - теги, источники, категоризация
4. **Аналитика** - статистика по источникам, дедупликация
5. **Гибкость** - произвольные поля, социальные сети

### 🔄 **Миграция данных**
- Существующие сделки с JSON контактами остаются рабочими
- Постепенная миграция на новую схему через `contactId`
- Обратная совместимость сохранена

## Пример использования

### Создание контакта
```typescript
const contact = await contactsService.createContact({
  type: ContactType.PERSON,
  name: 'Иван Петров',
  firstName: 'Иван',
  lastName: 'Петров',
  email: 'ivan@company.ru',
  phone: '+7 (495) 123-45-67',
  company: 'ООО Компания',
  position: 'Директор',
  source: ContactSource.WEBSITE,
  tags: ['vip', 'decision_maker'],
  assignedTo: 'manager-id'
});
```

### Создание сделки с контактом
```typescript
const deal = await dealsService.createDeal({
  title: 'Продажа CRM системы',
  contactId: contact.id, // Ссылка на контакт
  amount: 100000,
  currency: 'RUB',
  // ... остальные поля
});
```

### Поиск и фильтрация
```typescript
// Поиск по всем полям
const found = await contactsService.searchContacts('Петров');

// Фильтрация по компании
const companyContacts = await contactsService.getContactsByCompany('ООО Компания');

// Контакты без активности
const inactive = await contactsService.getContactsWithoutActivity(30); // 30 дней
```

## Миграции

Система включает следующие миграции:
1. `CreateContactsTable` - создание таблицы контактов
2. `SeedTestContacts` - тестовые данные
3. `AddContactIdToDeals` - добавление связи в таблицу сделок

После перезапуска backend автоматически применит все миграции.

## Следующие шаги

1. **Frontend компоненты** - создать UI для управления контактами
2. **Интеграция с лидами** - добавить поддержку contactId в модуль лидов  
3. **Импорт/экспорт** - массовые операции с контактами
4. **Дедупликация** - автоматическое объединение дубликатов
5. **История взаимодействий** - логирование всех контактов с клиентами
