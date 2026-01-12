# Frontend: Shared

**Purpose:** Shared directives, pipes, utilities, layout components, and universal filter system.

**Key responsibilities:**
- Provide styling primitives and utility components
- Centralize form controls and validation helpers
- Universal filter system for all entities (Contacts, Leads, Companies, Deals)

**Notes:** Avoid tight coupling to specific features.

## 🔍 Universal Filter System

### Quick Start

```typescript
// 1. Open dialog
this.dialog.open(UniversalFiltersDialogComponent, {
  width: '800px',
  data: {
    title: 'Фильтры',
    staticFields: [...],      // Your field definitions
    customFields: [...],      // Custom fields from API
    initialState: filterState,
  },
});

// 2. Send request
this.service.searchWithFilters(filterState).subscribe(...);
```

### Components
- `UniversalFiltersDialogComponent` - универсальный диалог фильтрации

### Services
- `UniversalFilterService` - утилиты для работы с фильтрами

### Interfaces
- `UniversalFilter` - интерфейс фильтра
- `BaseFilterState` - базовое состояние фильтров
- `FilterFieldDefinition` - определение поля для фильтрации

📖 **Full docs:** [UNIVERSAL_FILTER_FRONTEND.md](../../../../UNIVERSAL_FILTER_FRONTEND.md)
