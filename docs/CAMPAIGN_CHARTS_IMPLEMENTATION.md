# Реализация графиков для статистики кампаний

## Дата: 07.01.2026

## Задача
Реализовать два графика на странице статистики кампаний:
1. График отправок по времени (линейный график)
2. Распределение статусов (круговая диаграмма)

## Технологии
- **Chart.js** v4.5.1 (уже установлен)
- **ng2-charts** v8.0.0 (уже установлен)
- Angular signals для реактивных данных

## Реализация

### 1. Импорты и регистрация Chart.js

**Файл:** `campaign-stats.component.ts`

```typescript
import { BaseChartDirective } from 'ng2-charts';
import { 
  Chart,
  ChartConfiguration, 
  ChartData, 
  registerables 
} from 'chart.js';

// Регистрируем все компоненты Chart.js
Chart.register(...registerables);
```

### 2. Круговая диаграмма (Doughnut Chart)

#### Данные:
```typescript
pieChartType = 'doughnut' as const;
pieChartData = signal<ChartData<'doughnut'>>({
  labels: ['Доставлено', 'Ошибки', 'Ожидает'],
  datasets: [{
    data: [0, 0, 0],
    backgroundColor: [
      '#10b981', // Зелёный для доставленных
      '#f59e0b', // Оранжевый для ошибок
      '#3b82f6'  // Синий для ожидающих
    ],
    borderWidth: 0,
    hoverOffset: 10
  }]
});
```

#### Опции:
- Responsive: true
- Legend position: bottom
- Tooltip с процентами
- Hover эффект (offset: 10px)

#### Метод обновления:
```typescript
private updatePieChart(delivered: number, failed: number, pending: number): void {
  this.pieChartData.set({
    labels: ['Доставлено', 'Ошибки', 'Ожидает'],
    datasets: [{
      data: [delivered, failed, pending],
      backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
      borderWidth: 0,
      hoverOffset: 10
    }]
  });
}
```

### 3. Линейный график (Line Chart)

#### Данные:
```typescript
lineChartType = 'line' as const;
lineChartData = signal<ChartData<'line'>>({
  labels: [],
  datasets: [
    {
      label: 'Отправлено',
      data: [],
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      fill: true,
      tension: 0.4
    },
    {
      label: 'Доставлено',
      data: [],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4
    },
    {
      label: 'Ошибки',
      data: [],
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      fill: true,
      tension: 0.4
    }
  ]
});
```

#### Опции:
- Responsive: true
- Legend position: top
- Tooltip mode: index (показывает все линии)
- Y axis: начинается с 0
- Smooth curves (tension: 0.4)

#### Метод обновления (моковые данные):
```typescript
private updateLineChart(): void {
  // Генерируем данные за последние 24 часа
  const now = new Date();
  const labels: string[] = [];
  const sentData: number[] = [];
  const deliveredData: number[] = [];
  const failedData: number[] = [];

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    labels.push(hour.getHours().toString().padStart(2, '0') + ':00');
    
    // Моковые данные (в будущем - с бэкенда)
    const sent = Math.floor(Math.random() * 50);
    sentData.push(sent);
    deliveredData.push(Math.floor(sent * 0.9));
    failedData.push(Math.floor(sent * 0.1));
  }

  this.lineChartData.set({ labels, datasets: [...] });
}
```

### 4. HTML шаблон

```html
<div class="charts-grid">
  <!-- Линейный график -->
  <mat-card class="chart-card">
    <mat-card-header>
      <mat-card-title>
        <mat-icon>bar_chart</mat-icon>
        График отправок по времени
      </mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <div class="chart-container">
        <canvas baseChart
          [data]="lineChartData()"
          [options]="lineChartOptions"
          [type]="lineChartType">
        </canvas>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- Круговая диаграмма -->
  <mat-card class="chart-card">
    <mat-card-header>
      <mat-card-title>
        <mat-icon>pie_chart</mat-icon>
        Распределение статусов
      </mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <div class="chart-container pie-chart">
        <canvas baseChart
          [data]="pieChartData()"
          [options]="pieChartOptions"
          [type]="pieChartType">
        </canvas>
      </div>
    </mat-card-content>
  </mat-card>
</div>
```

### 5. Стили

```scss
.chart-container {
  position: relative;
  height: 300px;
  padding: 16px;

  &.pie-chart {
    height: 350px;
  }
}
```

## Цветовая схема

### Статусы:
- 🟢 **Доставлено:** `#10b981` (зелёный)
- 🟠 **Ошибки:** `#f59e0b` (оранжевый)
- 🔵 **Ожидает:** `#3b82f6` (синий)

### Линии графика:
- 🟣 **Отправлено:** `#667eea` (фиолетовый)
- 🟢 **Доставлено:** `#10b981` (зелёный)
- 🟠 **Ошибки:** `#f59e0b` (оранжевый)

## Особенности

### Использование Signals
Все данные графиков хранятся в signals для реактивного обновления:
```typescript
pieChartData = signal<ChartData<'doughnut'>>({ ... });
lineChartData = signal<ChartData<'line'>>({ ... });
```

### Responsive дизайн
- Графики адаптируются к размеру контейнера
- `maintainAspectRatio: false` для полного контроля высоты

### Интерактивность
- Hover эффекты на диаграммах
- Tooltips с детальной информацией
- Проценты в круговой диаграмме

## Текущее состояние

### ✅ Реализовано:
1. Круговая диаграмма с реальными данными (delivered, failed, pending)
2. Линейный график с моковыми данными за 24 часа
3. Responsive дизайн
4. Tooltips и легенды
5. Цветовая схема совпадает с карточками статистики

### 📋 TODO (будущие улучшения):
1. Получать реальные данные по времени с бэкенда
2. Добавить фильтр по периоду (день/неделя/месяц)
3. Добавить возможность скачивать графики как изображения
4. Анимация при загрузке данных
5. Zoom/Pan функциональность для линейного графика

## API для реальных данных (TODO на бэкенде)

Нужно добавить эндпоинт для получения статистики по времени:

```typescript
GET /messages/campaigns/:id/stats/timeline?interval=hour&period=24h

Response:
{
  timeline: [
    {
      timestamp: "2026-01-07T10:00:00Z",
      sent: 10,
      delivered: 9,
      failed: 1
    },
    ...
  ]
}
```

## Тестирование

Откройте страницу статистики:
http://localhost:4200/messages/campaigns/22268068-e650-4b3d-83df-16bd8cf21575/stats

Ожидаемый результат:
- ✅ Круговая диаграмма показывает распределение статусов
- ✅ Линейный график показывает динамику за 24 часа (моковые данные)
- ✅ Графики responsive
- ✅ Hover эффекты работают
- ✅ Tooltips показывают детали

## Примечания

- Линейный график пока использует случайные данные для демонстрации
- Для production нужно получать реальные данные с бэкенда
- Графики обновляются при каждой загрузке статистики кампании
- Используется последняя версия Chart.js (v4) с новым API
