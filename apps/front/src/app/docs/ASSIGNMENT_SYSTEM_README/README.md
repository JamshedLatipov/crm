````markdown
# Система назначений ответственных лиц (Assignment System)

## Обзор

Система назначений позволяет управлять ответственными лицами для различных сущностей CRM (лиды, сделки, задачи, уведомления). Включает в себя backend API и frontend компоненты для полного управления назначениями.

## Архитектура

### Backend (NestJS)

#### Основные компоненты:
- **AssignmentController** - REST API для управления назначениями
- **AssignmentService** - Бизнес-логика для назначений
- **Assignment Entity** - Модель данных для назначений
- **Assignment Migration** - Миграция базы данных

#### API Endpoints:

```
POST   /api/assignments                     # Создать назначение
DELETE /api/assignments                     # Удалить назначение
GET    /api/assignments/current/:type/:id   # Получить текущие назначения
GET    /api/assignments/history/:type/:id   # История назначений
GET    /api/assignments/user/:id            # Назначения пользователя
POST   /api/assignments/transfer            # Передать назначение
POST   /api/assignments/auto-assign         # Автоназначение
GET    /api/assignments/users/search        # Поиск пользователей
GET    /api/assignments/users/by-role/:role # Пользователи по роли
```

### Frontend (Angular)

#### Компоненты:
- **AssignResponsibleComponent** - Основной компонент для назначения ответственных
- **AssignmentDemoComponent** - Демонстрационный компонент
- **AssignmentService** - Сервис для работы с API

## Использование

### 1. Подключение компонента назначения

```html
<app-assign-responsible
  entityType="lead"
  entityId="12345"
  [currentAssignees]="currentUsers"
  (onAssign)="handleAssignment($event)"
  (onError)="handleError($event)"
/>
```

### 2. Свойства компонента

- `entityType` - Тип сущности ('lead' | 'deal' | 'task' | 'notification')
- `entityId` - ID сущности
- `currentAssignees` - Текущие назначенные пользователи (опционально)

### 3. События

- `onAssign` - Событие при назначении пользователей
- `onError` - Событие при ошибке

### 4. Функции поиска и фильтрации

```typescript
// Поиск пользователей
assignmentService.searchUsers('john', {
  role: 'sales_manager',
  department: 'Sales',
  available: true
}).subscribe();

// Получение пользователей по роли
assignmentService.getUsersByRole('account_manager').subscribe();

// Создание назначения
assignmentService.createAssignment({
  entityType: 'lead',
  entityId: 123,
  assignedTo: [1, 2, 3],
  assignedBy: 1,
  reason: 'New lead from website',
  notifyAssignees: true
}).subscribe();
```

## Особенности

### 1. Автокомплит поиска
- Поиск по имени, email
- Фильтрация по роли и департаменту
- Отображение рабочей нагрузки

### 2. Быстрое назначение по ролям
- Кнопки для быстрого назначения по ролям
- Автоматический выбор наименее загруженного пользователя

### 3. Управление выбором
- Чипы с информацией о пользователе
- Возможность удаления из выбора
- Валидация дублирования

### 4. Уведомления
- Автоматические уведомления при назначении
- Интеграция с системой уведомлений CRM

## База данных

### Таблица assignments

```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  assigned_by INTEGER NOT NULL REFERENCES users(id),
  status assignment_status DEFAULT 'active',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  reason TEXT NULL,
  removal_reason TEXT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Конфигурация

### 1. Добавление в модуль

```typescript
import { SharedModule } from './modules/shared/shared.module';

@NgModule({
  imports: [SharedModule]
})
export class AppModule {}
```

### 2. Стили (необязательно)

```scss
.assignment-component {
  .user-chip {
    margin: 4px;
  }
  
  .workload-indicator {
    &.low { color: green; }
    &.medium { color: orange; }
    &.high { color: red; }
  }
}
```

## Демо

Запустите `AssignmentDemoComponent` для интерактивной демонстрации:

```typescript
import { AssignmentDemoComponent } from './components/assignment-demo/assignment-demo.component';

// В routing или напрямую в template
<app-assignment-demo />
```

## Разработка

### Запуск backend:
```bash
npm run start:back
```

### Запуск frontend:
```bash
npm run start:front
```

### Тесты:
```bash
npm run test:back
npm run test:front
```

## License

MIT License
````
