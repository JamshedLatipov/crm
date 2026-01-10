import { Chart, ChartOptions, registerables } from 'chart.js';

// Регистрация всех необходимых компонентов Chart.js
Chart.register(...registerables);

// Экспортируем для использования в других местах
export { Chart };
export type { ChartOptions };
