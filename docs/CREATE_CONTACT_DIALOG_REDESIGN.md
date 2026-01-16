# Обновление дизайна модального окна "Создать контакт"

## Дата: 12 января 2026 г.

## Описание изменений

Модальное окно "Создать контакт" было обновлено в соответствии с современным дизайном проекта, используя стили из компонентов deal-form и других современных диалогов.

## Изменённые файлы

### 1. HTML шаблон
**Файл:** `apps/front/src/app/contacts/components/create-contact-dialog/create-contact-dialog.component.html`

#### Изменения в header:
- Добавлен градиентный фон
- Добавлена иконка в header с фоновым блоком
- Добавлен подзаголовок для лучшего UX
- Улучшена структура header с правильным позиционированием элементов

```html
<div class="dialog-header">
  <div class="header-content">
    <div class="header-icon">
      <mat-icon>person_add</mat-icon>
    </div>
    <div class="header-text">
      <h2>Создать контакт</h2>
      <p class="header-subtitle">Добавьте новый контакт в вашу систему</p>
    </div>
  </div>
  <button mat-icon-button (click)="cancel()" class="close-button">
    <mat-icon>close</mat-icon>
  </button>
</div>
```

### 2. Стили SCSS
**Файл:** `apps/front/src/app/contacts/components/create-contact-dialog/create-contact-dialog.component.scss`

#### Ключевые изменения:

**Header:**
- Градиентный фон: `linear-gradient(135deg, #4285f4 0%, #5a95f5 100%)`
- Белый цвет текста
- Округлые углы сверху: `border-radius: 12px 12px 0 0`
- Иконка в белом полупрозрачном блоке
- Hover эффекты для кнопки закрытия

**Content:**
- Увеличенные отступы: `padding: 32px 24px 24px 24px`
- Кастомный scrollbar в современном стиле
- Улучшенная система gap между секциями

**Form Sections (Карточки):**
- Белый фон с границей
- Hover эффект: изменение цвета границы и тень
- Плавные переходы: `transition: all 0.3s ease`
- Увеличенные внутренние отступы

**Form Fields:**
- Светлый фон: `#f9fafb`
- Hover состояние: `#f3f4f6`
- Focus с голубой рамкой и тенью
- Плавные анимации переходов

**Expansion Panels:**
- Белые карточки с границами вместо прозрачных
- Hover эффекты
- Голубой фон при раскрытии: `#f0f7ff`
- Улучшенная типографика для заголовков
- Современные badges для заполненных секций

**Buttons:**
- Cancel: серая рамка с hover эффектом
- Save: градиентный фон с тенью и transform при hover
- Увеличенная высота: 44px
- Плавные анимации

**Footer:**
- Светло-серый фон: `#fafbfc`
- Округлые углы снизу
- Граница сверху

### 3. TypeScript компонент
**Файл:** `apps/front/src/app/contacts/contacts.component.ts`

Обновлены параметры открытия диалога:
```typescript
const dialogRef = this.dialog.open(m.CreateContactDialogComponent, {
  width: '700px',
  maxWidth: '95vw',
  panelClass: 'modern-dialog',
});
```

### 4. Другие места использования

**Файл:** `apps/front/src/app/dashboard/dashboard.component.ts`
**Файл:** `apps/front/src/app/contacts/components/contact-selector.component.ts`

Обновлены с теми же параметрами для единообразия.

### 5. Глобальные стили
**Файл:** `apps/front/src/styles.scss`

Добавлены стили для класса `modern-dialog`:
```scss
.modern-dialog .mat-mdc-dialog-container {
  border-radius: 16px !important;
  overflow: hidden !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
}
```

## Адаптивный дизайн

Реализована полная адаптивность для разных размеров экранов:

- **Desktop (>768px):** Полный функционал, 2 колонки в форме
- **Tablet (≤768px):** 1 колонка, увеличенные отступы для touch
- **Mobile (≤480px):** Компактный дизайн, увеличенные размеры кнопок

## Новые фичи дизайна

1. **Градиентный header** - современный визуальный стиль
2. **Карточки для секций** - лучшая визуальная организация
3. **Hover эффекты** - улучшенная интерактивность
4. **Современные expansion panels** - белые карточки вместо прозрачных
5. **Улучшенная типографика** - более крупные и читаемые заголовки
6. **Badges для заполненных полей** - градиентный фон
7. **Кастомный scrollbar** - соответствует общему стилю
8. **Анимации и transitions** - плавные переходы состояний

## Цветовая палитра

- **Primary Blue:** `#4285f4`
- **Secondary Blue:** `#5a95f5`
- **Border:** `#e5e7eb`
- **Background Light:** `#f9fafb`
- **Background Lighter:** `#fafbfc`
- **Text Dark:** `#1a1a1a`, `#1f2937`
- **Text Medium:** `#6b7280`
- **Success Badge:** `linear-gradient(135deg, #e8f4fd 0%, #dceefb 100%)`

## Совместимость

Дизайн соответствует стилю других диалогов в проекте:
- Deal Form Component
- Create Lead Dialog
- Edit Lead Dialog
- Другие модальные окна проекта

## Результат

Модальное окно "Создать контакт" теперь имеет современный, профессиональный дизайн, который:
- Соответствует общему стилю проекта
- Улучшает пользовательский опыт
- Обеспечивает визуальную консистентность
- Адаптивен для всех устройств
- Имеет плавные анимации и переходы
