# Frontend Implementation Guide

## 📁 Структура проекта

```
apps/front/src/app/notifications/
├── models/
│   └── notification.models.ts       ✅ Создано
│
├── services/
│   ├── notification.service.ts      ✅ Создано
│   ├── sms-template.service.ts      ✅ Создано
│   ├── email-template.service.ts    ✅ Создано
│   ├── segment.service.ts           🔄 Нужно создать
│   ├── campaign.service.ts          🔄 Нужно создать
│   └── analytics.service.ts         🔄 Нужно создать
│
├── components/
│   ├── sms-templates/
│   │   ├── sms-templates-list/      🔄 Нужно создать
│   │   ├── sms-template-form/       🔄 Нужно создать
│   │   └── sms-template-preview/    🔄 Нужно создать
│   │
│   ├── email-templates/
│   │   ├── email-templates-list/    🔄 Нужно создать
│   │   ├── email-template-form/     🔄 Нужно создать
│   │   ├── email-template-editor/   🔄 Нужно создать (HTML редактор)
│   │   └── email-template-preview/  🔄 Нужно создать
│   │
│   ├── segments/
│   │   ├── segments-list/           🔄 Нужно создать
│   │   ├── segment-form/            🔄 Нужно создать
│   │   └── segment-filter-builder/  🔄 Нужно создать
│   │
│   ├── campaigns/
│   │   ├── campaigns-list/          🔄 Нужно создать
│   │   ├── campaign-form/           🔄 Нужно создать
│   │   ├── campaign-wizard/         🔄 Нужно создать (step-by-step)
│   │   └── campaign-stats/          🔄 Нужно создать
│   │
│   ├── analytics/
│   │   ├── dashboard/               🔄 Нужно создать
│   │   ├── channel-stats/           🔄 Нужно создать
│   │   └── campaign-performance/    🔄 Нужно создать
│   │
│   └── shared/
│       ├── variable-input/          🔄 Нужно создать (для {{var}})
│       ├── channel-selector/        🔄 Нужно создать
│       └── status-badge/            🔄 Нужно создать
│
└── notifications.routes.ts          🔄 Нужно создать
```

## 🎯 Следующие шаги

### 1. Создать остальные сервисы

**segment.service.ts:**
- getAll(), getById(), create(), update(), delete()
- getContacts(id), recalculate(id), preview()

**campaign.service.ts:**
- getAll(), getById(), create(), update(), delete()
- start(), pause(), resume(), cancel()
- getStats(id), prepare(id)

**analytics.service.ts:**
- getDashboard()
- getCampaignPerformance()
- getMessagesByDay(), getMessagesByHour()
- compareCampaigns(), exportReport()

### 2. Создать компоненты списков

Каждый список должен иметь:
- Таблицу с данными (Angular Material Table)
- Поиск и фильтрацию
- Пагинацию
- Кнопки действий (создать, редактировать, удалить)
- Индикаторы статуса

### 3. Создать формы

Формы должны использовать:
- Reactive Forms
- Angular Material компоненты
- Валидацию
- Сигналы для состояния

### 4. Создать специализированные компоненты

**HTML Editor** для Email шаблонов:
- Rich text editor (можно использовать TinyMCE или Quill)
- Предпросмотр HTML
- Вставка переменных
- Syntax highlighting

**Filter Builder** для сегментов:
- Динамическое добавление фильтров
- AND/OR логика
- Различные операторы (equals, contains, greater, etc.)
- Автокомплит для полей

**Campaign Wizard:**
- Step 1: Выбор типа кампании
- Step 2: Выбор канала(ов)
- Step 3: Выбор шаблона
- Step 4: Выбор сегмента
- Step 5: Настройки
- Step 6: Предпросмотр и запуск

### 5. Создать роутинг

```typescript
// notifications.routes.ts
export const NOTIFICATION_ROUTES: Routes = [
  {
    path: 'notifications',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      
      // SMS Templates
      { path: 'sms-templates', component: SmsTemplatesListComponent },
      { path: 'sms-templates/new', component: SmsTemplateFormComponent },
      { path: 'sms-templates/:id', component: SmsTemplateFormComponent },
      
      // Email Templates
      { path: 'email-templates', component: EmailTemplatesListComponent },
      { path: 'email-templates/new', component: EmailTemplateFormComponent },
      { path: 'email-templates/:id', component: EmailTemplateFormComponent },
      
      // Segments
      { path: 'segments', component: SegmentsListComponent },
      { path: 'segments/new', component: SegmentFormComponent },
      { path: 'segments/:id', component: SegmentFormComponent },
      
      // Campaigns
      { path: 'campaigns', component: CampaignsListComponent },
      { path: 'campaigns/new', component: CampaignWizardComponent },
      { path: 'campaigns/:id', component: CampaignFormComponent },
      { path: 'campaigns/:id/stats', component: CampaignStatsComponent },
      
      // Analytics
      { path: 'analytics', component: AnalyticsComponent },
    ],
  },
];
```

### 6. Добавить в главное меню

```typescript
// app.component.ts или sidebar.component.ts
const menuItems = [
  // ...existing items
  {
    label: 'Уведомления',
    icon: 'notifications',
    children: [
      { label: 'Дашборд', route: '/notifications/dashboard', icon: 'dashboard' },
      { label: 'Кампании', route: '/notifications/campaigns', icon: 'campaign' },
      { label: 'SMS Шаблоны', route: '/notifications/sms-templates', icon: 'sms' },
      { label: 'Email Шаблоны', route: '/notifications/email-templates', icon: 'email' },
      { label: 'Сегменты', route: '/notifications/segments', icon: 'group' },
      { label: 'Аналитика', route: '/notifications/analytics', icon: 'analytics' },
    ],
  },
];
```

## 🎨 UI/UX Рекомендации

### Material Components

Использовать следующие компоненты:
- `mat-table` - для таблиц
- `mat-paginator` - пагинация
- `mat-sort` - сортировка
- `mat-form-field` - поля формы
- `mat-select` - выпадающие списки
- `mat-chip` - теги и бейджи
- `mat-card` - карточки
- `mat-dialog` - модальные окна
- `mat-stepper` - wizard
- `mat-progress-bar` - прогресс

### Цветовая схема

```scss
// Статусы кампаний
$status-draft: #9e9e9e;
$status-active: #4caf50;
$status-paused: #ff9800;
$status-completed: #2196f3;
$status-failed: #f44336;
$status-cancelled: #607d8b;

// Каналы
$channel-sms: #00bcd4;
$channel-email: #ff5722;
$channel-webhook: #9c27b0;
```

### Иконки

```typescript
// Каналы
sms: 'sms'
email: 'email'
webhook: 'webhook'

// Действия
create: 'add'
edit: 'edit'
delete: 'delete'
duplicate: 'content_copy'
send: 'send'
pause: 'pause'
play: 'play_arrow'
cancel: 'cancel'

// Статусы
success: 'check_circle'
failed: 'error'
pending: 'schedule'
```

## 📊 Примеры компонентов

### Пример: SMS Template List Component

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SmsTemplateService } from '../../services/sms-template.service';
import { SmsTemplate } from '../../models/notification.models';

@Component({
  selector: 'app-sms-templates-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './sms-templates-list.component.html',
  styleUrls: ['./sms-templates-list.component.scss'],
})
export class SmsTemplatesListComponent implements OnInit {
  private readonly smsTemplateService = inject(SmsTemplateService);
  private readonly router = inject(Router);

  templates = signal<SmsTemplate[]>([]);
  loading = signal(false);
  displayedColumns = ['name', 'category', 'usageCount', 'successRate', 'actions'];

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.loading.set(true);
    this.smsTemplateService.getAll().subscribe({
      next: (response) => {
        this.templates.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  createTemplate() {
    this.router.navigate(['/notifications/sms-templates/new']);
  }

  editTemplate(id: string) {
    this.router.navigate(['/notifications/sms-templates', id]);
  }

  deleteTemplate(id: string) {
    // Показать confirmation dialog
    this.smsTemplateService.delete(id).subscribe(() => {
      this.loadTemplates();
    });
  }

  duplicateTemplate(id: string) {
    this.smsTemplateService.duplicate(id).subscribe(() => {
      this.loadTemplates();
    });
  }
}
```

## 🔧 Полезные утилиты

### Форматтеры

```typescript
// utils/formatters.ts
export function formatDeliveryRate(delivered: number, total: number): string {
  if (total === 0) return '0%';
  return ((delivered / total) * 100).toFixed(2) + '%';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('ru-RU');
}
```

### Валидаторы

```typescript
// utils/validators.ts
import { AbstractControl, ValidationErrors } from '@angular/forms';

export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const phone = control.value;
  if (!phone) return null;
  
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone) ? null : { invalidPhone: true };
}

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.value;
  if (!email) return null;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? null : { invalidEmail: true };
}
```

## 📱 Адаптивность

Все компоненты должны быть адаптивными:
- Desktop: полная таблица
- Tablet: сокращенные колонки
- Mobile: карточки вместо таблицы

```scss
@media (max-width: 768px) {
  .mat-table {
    display: none;
  }
  
  .mobile-cards {
    display: block;
  }
}
```

## 🚀 Быстрый старт для разработчика

1. **Создать сервисы** (segment, campaign, analytics)
2. **Создать компонент Dashboard** с общей статистикой
3. **Создать списки** для каждой сущности
4. **Добавить формы создания/редактирования**
5. **Настроить роутинг**
6. **Добавить в главное меню**
7. **Протестировать интеграцию с backend**

## 📚 Дополнительные ресурсы

- [Angular Material](https://material.angular.io/)
- [Angular Reactive Forms](https://angular.io/guide/reactive-forms)
- [Angular Signals](https://angular.io/guide/signals)
- [RxJS](https://rxjs.dev/)

---

**Статус:** ✅ Модели созданы, базовые сервисы готовы
**Следующий шаг:** Создание остальных сервисов и компонентов
